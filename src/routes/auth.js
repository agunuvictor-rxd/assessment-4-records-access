import { Router } from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../db.js';
import { hashPassword, verifyPassword } from '../auth/hash.js';
import { createSession, destroySession, COOKIE_NAME, getCookieOptions } from '../auth/session.js';
import { signupSchema, signinSchema } from '../validation/schemas.js';
import { rateLimit } from '../middleware/rate-limiter.js';

export const authRouter = Router();

// Rate limit: 5 signups per hour per IP
authRouter.post('/signup', rateLimit({ maxRequests: 5, windowMs: 3600_000 }), async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, email, password } = parsed.data;
  const db = getDatabase();
  const userId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  try {
    const passwordHash = await hashPassword(password);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, email, passwordHash, now);

    const { sessionId } = createSession(userId, db);
    res.cookie(COOKIE_NAME, sessionId, getCookieOptions());

    return res.status(201).json({ success: true, message: 'Account created' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, error: 'Signup failed.' });
  }
});

// Rate limit: 5 sign-ins per 15 minutes per IP
authRouter.post('/signin', rateLimit({ maxRequests: 5, windowMs: 900_000 }), async (req, res) => {
  const parsed = signinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password } = parsed.data;
  const db = getDatabase();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // Timing-safe: hash a dummy password to prevent user enumeration via response timing
    await hashPassword('dummy-password-timing-defense');
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const isValid = await verifyPassword(user.password_hash, password);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const { sessionId } = createSession(user.id, db);
  res.cookie(COOKIE_NAME, sessionId, getCookieOptions());

  return res.status(200).json({ success: true, message: 'Signed in successfully.' });
});

authRouter.post('/signout', (req, res) => {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (sessionId) {
    destroySession(sessionId);
  }
  res.clearCookie(COOKIE_NAME, getCookieOptions());
  return res.redirect('/signin');
});

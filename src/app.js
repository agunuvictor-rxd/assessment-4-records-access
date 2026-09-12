import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { recordsRouter } from './routes/records.js';
import { viewsRouter } from './routes/views.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser(config.sessionSecret));

  // Mount API routes
  app.use('/api/auth', authRouter);
  app.use('/api/records', recordsRouter);

  // Mount HTML view routes
  app.use('/', viewsRouter);

  // 404 handler
  app.use((req, res) => {
    if (req.accepts('html')) {
      return res.status(404).send(`
        <body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
          <div style="text-align:center;">
            <h1>404 — Page Not Found</h1>
            <p><a href="/records" style="color:#a78bfa;">Return to Records</a></p>
          </div>
        </body>
      `);
    }
    return res.status(404).json({ success: false, error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    // Handle JSON parse errors from body-parser
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: 'Invalid JSON in request body.' });
    }
    console.error('Unhandled Records slice error:', err);
    res.status(500).json({ success: false, error: 'Internal server error in Records slice.' });
  });

  return app;
}

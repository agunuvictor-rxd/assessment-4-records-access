import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDatabase } from '../db.js';
import {
  signinView,
  signupView,
  recordsListView,
  recordDetailView,
  auditLogView,
} from '../views/pages.js';
import { listRecords, getRecord, getAuditTrail, getUserAuditLog } from '../records/operations.js';

export const viewsRouter = Router();

viewsRouter.get('/', (req, res) => {
  res.redirect('/records');
});

viewsRouter.get('/signin', (req, res) => {
  res.send(signinView());
});

viewsRouter.get('/signup', (req, res) => {
  res.send(signupView());
});

/**
 * Records list page — requires authentication.
 * Query-level ownership scoping applied in listRecords().
 */
viewsRouter.get('/records', requireAuth, (req, res) => {
  const records = listRecords(req.user.id);
  res.send(recordsListView({ user: req.user, records }));
});

/**
 * Single record detail page — requires authentication.
 * Ownership-scoped: public_id AND user_id must match.
 */
viewsRouter.get('/records/:publicId', requireAuth, (req, res) => {
  const record = getRecord(req.params.publicId, req.user.id);
  if (!record) {
    return res.status(404).send(`
      <body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;">
          <h1>404 — Record Not Found</h1>
          <p>This record doesn't exist or you don't have access.</p>
          <p><a href="/records" style="color:#a78bfa;">← Back to Records</a></p>
        </div>
      </body>
    `);
  }

  const auditTrail = getAuditTrail(req.params.publicId, req.user.id);
  res.send(recordDetailView({ user: req.user, record, auditTrail }));
});

/**
 * Audit log page — requires authentication.
 * Shows all audit entries for the current user.
 */
viewsRouter.get('/audit', requireAuth, (req, res) => {
  const auditLog = getUserAuditLog(req.user.id);
  res.send(auditLogView({ user: req.user, auditLog }));
});

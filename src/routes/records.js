import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limiter.js';
import { createRecordSchema, updateRecordSchema, deleteRecordSchema } from '../validation/schemas.js';
import {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  getAuditTrail,
  getUserAuditLog,
} from '../records/operations.js';

export const recordsRouter = Router();

// All record routes require authentication
recordsRouter.use(requireAuth);

/**
 * POST /api/records — Create a new record
 * Rate limited: 30 creations per hour per user
 */
recordsRouter.post(
  '/',
  rateLimit({
    maxRequests: 30,
    windowMs: 3600_000,
    keyGenerator: (req) => `create:${req.user.id}`,
  }),
  (req, res) => {
    const parsed = createRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const record = createRecord({
        userId: req.user.id,
        ...parsed.data,
      });

      return res.status(201).json({ success: true, record });
    } catch (err) {
      console.error('Create record error:', err);
      return res.status(500).json({ success: false, error: 'Failed to create record.' });
    }
  }
);

/**
 * GET /api/records — List all records for the authenticated user
 * Query-level ownership scoping: only returns records WHERE user_id = <current user>
 */
recordsRouter.get('/', (req, res) => {
  try {
    const records = listRecords(req.user.id);
    return res.json({ success: true, records, count: records.length });
  } catch (err) {
    console.error('List records error:', err);
    return res.status(500).json({ success: false, error: 'Failed to list records.' });
  }
});

/**
 * GET /api/records/audit-log — Get full audit log for the authenticated user
 */
recordsRouter.get('/audit-log', (req, res) => {
  try {
    const log = getUserAuditLog(req.user.id);
    return res.json({ success: true, auditLogs: log, count: log.length });
  } catch (err) {
    console.error('User audit log error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get audit log.' });
  }
});

recordsRouter.get('/~/audit', (req, res) => {
  try {
    const log = getUserAuditLog(req.user.id);
    return res.json({ success: true, auditLogs: log, count: log.length });
  } catch (err) {
    console.error('User audit log error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get audit log.' });
  }
});

/**
 * GET /api/records/:publicId — Get a single record by public_id
 * Ownership-scoped: public_id AND user_id must match
 */
recordsRouter.get('/:publicId', (req, res) => {
  try {
    const record = getRecord(req.params.publicId, req.user.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }
    return res.json({ success: true, record });
  } catch (err) {
    console.error('Get record error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get record.' });
  }
});

/**
 * PUT /api/records/:publicId — Update a record (PUT and PATCH both supported)
 * Ownership-scoped: public_id AND user_id must match
 */
const handleUpdate = (req, res) => {
  const parsed = updateRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const record = updateRecord(req.params.publicId, req.user.id, parsed.data);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }
    return res.json({ success: true, record });
  } catch (err) {
    console.error('Update record error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update record.' });
  }
};

recordsRouter.patch('/:publicId', handleUpdate);
recordsRouter.put('/:publicId', handleUpdate);

/**
 * DELETE /api/records/:publicId — Delete a record with pre-deletion audit logging
 * Requires a mandatory 'reason' field for the audit trail.
 * The audit entry is written BEFORE the DELETE statement executes.
 */
recordsRouter.delete('/:publicId', (req, res) => {
  const parsed = deleteRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed. A deletion reason is required for the audit trail.',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const deleted = deleteRecord(req.params.publicId, req.user.id, parsed.data.reason);
    if (deleted === null) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }
    return res.json({ success: true, message: 'Record deleted. Audit log entry preserved.' });
  } catch (err) {
    console.error('Delete record error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete record.' });
  }
});

/**
 * GET /api/records/:publicId/audit — Get audit trail for a specific record
 * Only the record's owner can view the audit trail.
 */
recordsRouter.get('/:publicId/audit', (req, res) => {
  try {
    const trail = getAuditTrail(req.params.publicId, req.user.id);
    return res.json({ success: true, audit_trail: trail, count: trail.length });
  } catch (err) {
    console.error('Audit trail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get audit trail.' });
  }
});

/**
 * GET /api/audit — Get full audit log for the authenticated user
 */
recordsRouter.get('/~/audit', (req, res) => {
  try {
    const log = getUserAuditLog(req.user.id);
    return res.json({ success: true, audit_log: log, count: log.length });
  } catch (err) {
    console.error('User audit log error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get audit log.' });
  }
});

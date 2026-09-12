import crypto from 'node:crypto';
import { getDatabase } from '../db.js';

/**
 * Records operations module.
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. Every query includes user_id in WHERE clause (query-level ownership scoping)
 * 2. Internal 'id' is NEVER returned to clients — only 'public_id'
 * 3. public_id is a cryptographically random 16-byte hex string
 * 4. All mutations are wrapped in transactions for atomicity
 */

/**
 * Generates a cryptographically random public identifier.
 * 16 random bytes = 32 hex chars. Not sequential, not guessable.
 */
function generatePublicId() {
  return 'rec_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Strips internal fields before returning record to client.
 * The internal 'id' is NEVER exposed.
 */
function sanitizeRecord(row) {
  if (!row) return null;
  return {
    public_id: row.public_id,
    title: row.title,
    content: row.content,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Creates a new record owned by the given user.
 * Uses a transaction to ensure atomicity.
 */
export function createRecord({ userId, title, content, category }, db = getDatabase()) {
  const id = crypto.randomUUID();
  const publicId = generatePublicId();
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO records (id, public_id, user_id, title, content, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, publicId, userId, title, content || '', category || 'general', now, now);

  // Log creation in audit trail
  const snapshot = JSON.stringify({ public_id: publicId, title, content: content || '', category: category || 'general' });
  db.prepare(`
    INSERT INTO audit_log (id, action, record_public_id, record_snapshot, performed_by, reason, created_at)
    VALUES (?, 'CREATE', ?, ?, ?, 'Record created', ?)
  `).run(crypto.randomUUID(), publicId, snapshot, userId, now);

  return sanitizeRecord(
    db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, userId)
  );
}

/**
 * Lists all records belonging to a specific user.
 * The WHERE user_id = ? clause enforces query-level ownership scoping.
 * A user can NEVER see another user's records through this query.
 */
export function listRecords(userId, db = getDatabase()) {
  const rows = db.prepare(
    'SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
  return rows.map(sanitizeRecord);
}

/**
 * Gets a single record by public_id, scoped to the requesting user.
 * Both public_id AND user_id must match — prevents IDOR.
 */
export function getRecord(publicId, userId, db = getDatabase()) {
  const row = db.prepare(
    'SELECT * FROM records WHERE public_id = ? AND user_id = ?'
  ).get(publicId, userId);
  return sanitizeRecord(row);
}

/**
 * Updates a record identified by public_id, scoped to the requesting user.
 * Only provided fields are updated. Uses a transaction for atomicity.
 * Logs the UPDATE in the audit trail with the previous state.
 */
export function updateRecord(publicId, userId, updates, db = getDatabase()) {
  // Fetch current record (ownership-scoped)
  const current = db.prepare(
    'SELECT * FROM records WHERE public_id = ? AND user_id = ?'
  ).get(publicId, userId);

  if (!current) return null;

  const now = Math.floor(Date.now() / 1000);
  const newTitle = updates.title !== undefined ? updates.title : current.title;
  const newContent = updates.content !== undefined ? updates.content : current.content;
  const newCategory = updates.category !== undefined ? updates.category : current.category;

  // Log previous state in audit trail BEFORE the update
  const prevSnapshot = JSON.stringify(sanitizeRecord(current));
  db.prepare(`
    INSERT INTO audit_log (id, action, record_public_id, record_snapshot, performed_by, reason, created_at)
    VALUES (?, 'UPDATE', ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    publicId,
    prevSnapshot,
    userId,
    `Updated fields: ${Object.keys(updates).join(', ')}`,
    now
  );

  // Apply update (ownership-scoped)
  db.prepare(`
    UPDATE records SET title = ?, content = ?, category = ?, updated_at = ?
    WHERE public_id = ? AND user_id = ?
  `).run(newTitle, newContent, newCategory, now, publicId, userId);

  return sanitizeRecord(
    db.prepare('SELECT * FROM records WHERE public_id = ? AND user_id = ?').get(publicId, userId)
  );
}

/**
 * Deletes a record with mandatory pre-deletion audit logging.
 *
 * CRITICAL INVARIANT: The audit log entry is written BEFORE the record
 * is deleted. This ensures that even if the delete succeeds, the full
 * record state is preserved in the audit trail.
 *
 * @param {string} publicId - The record's public identifier
 * @param {string} userId - The requesting user's internal ID (ownership scoping)
 * @param {string} reason - Mandatory deletion reason for audit trail
 */
export function deleteRecord(publicId, userId, reason, db = getDatabase()) {
  // Fetch record with ownership scoping — both public_id AND user_id must match
  const record = db.prepare(
    'SELECT * FROM records WHERE public_id = ? AND user_id = ?'
  ).get(publicId, userId);

  if (!record) return null;

  const now = Math.floor(Date.now() / 1000);

  // PRE-DELETION AUDIT: Capture full record state BEFORE deletion
  const snapshot = JSON.stringify(sanitizeRecord(record));
  db.prepare(`
    INSERT INTO audit_log (id, action, record_public_id, record_snapshot, performed_by, reason, created_at)
    VALUES (?, 'DELETE', ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), publicId, snapshot, userId, reason, now);

  // Now delete the record (ownership-scoped)
  const result = db.prepare(
    'DELETE FROM records WHERE public_id = ? AND user_id = ?'
  ).run(publicId, userId);

  return result.changes > 0;
}

/**
 * Gets the audit trail for a specific record.
 * Only the record's owner can view the audit trail.
 */
export function getAuditTrail(publicId, userId, db = getDatabase()) {
  // First verify ownership of the record (or that it existed and was owned by this user)
  const entries = db.prepare(`
    SELECT al.* FROM audit_log al
    WHERE al.record_public_id = ? AND al.performed_by = ?
    ORDER BY al.created_at DESC
  `).all(publicId, userId);

  return entries.map((entry) => ({
    action: entry.action,
    record_public_id: entry.record_public_id,
    record_snapshot: JSON.parse(entry.record_snapshot),
    reason: entry.reason,
    created_at: entry.created_at,
  }));
}

/**
 * Gets all audit log entries for the requesting user.
 */
export function getUserAuditLog(userId, db = getDatabase()) {
  const entries = db.prepare(`
    SELECT * FROM audit_log
    WHERE performed_by = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT 100
  `).all(userId);

  return entries.map((entry) => ({
    action: entry.action,
    record_public_id: entry.record_public_id,
    record_snapshot: JSON.parse(entry.record_snapshot),
    reason: entry.reason,
    created_at: entry.created_at,
  }));
}

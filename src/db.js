import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

let dbInstance = null;

/**
 * Returns a singleton SQLite database connection.
 * Initializes schema on first connection.
 *
 * Design decisions:
 * - WAL journal mode for concurrent read performance
 * - Foreign keys enforced at DB level (not application level)
 * - COLLATE NOCASE on email for case-insensitive uniqueness
 */
export function getDatabase(dbPath) {
  const targetPath = dbPath || (dbInstance ? dbInstance.path : config.dbPath);
  if (dbInstance) {
    if (dbInstance.path === targetPath) {
      return dbInstance.db;
    }
    // Target path changed — close existing DB
    try { dbInstance.db.close(); } catch (e) {}
    dbInstance = null;
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  initSchema(db);

  dbInstance = { path: targetPath, db };
  return db;
}

/**
 * Database schema for Assessment 4: Records and Access Slice
 *
 * Tables:
 * - users: Authentication accounts
 * - sessions: Server-side session storage
 * - records: User-owned records with public_id for external exposure
 * - audit_log: Immutable pre-deletion audit trail
 *
 * Key invariants:
 * 1. records.public_id is the ONLY identifier exposed to clients (never internal id)
 * 2. Every records query MUST include user_id in the WHERE clause (ownership scoping)
 * 3. audit_log entries are written BEFORE the record is deleted (pre-deletion logging)
 * 4. audit_log is append-only — no UPDATE or DELETE operations are permitted on it
 */
export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    -- Records table with public_id for external exposure.
    -- The internal 'id' is NEVER sent to clients.
    -- public_id is a cryptographically random 16-byte hex string,
    -- separate from the internal UUID to prevent enumeration attacks.
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      public_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'general',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Immutable audit log for pre-deletion evidence.
    -- Captures the FULL record state before deletion.
    -- No UPDATE or DELETE operations should ever target this table.
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL CHECK (action IN ('DELETE', 'UPDATE', 'CREATE')),
      record_public_id TEXT NOT NULL,
      record_snapshot TEXT NOT NULL,
      performed_by TEXT NOT NULL REFERENCES users(id),
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_public_id ON records(public_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_public_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(performed_by);
  `);
}

export function closeDatabase() {
  if (dbInstance) {
    try { dbInstance.db.close(); } catch (e) {}
    dbInstance = null;
  }
}

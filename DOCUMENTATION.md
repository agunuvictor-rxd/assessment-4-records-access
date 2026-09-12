# Metis Academic Co-Pilot — Assessment 4: Records and Access Control Slice Documentation

## 1. What This Is

This project is the production-minded **Records and Access Control Engineering Slice** for **Metis**, the web-based academic co-pilot for undergraduate students. In Metis, students create and manage personal study vaults, saved flashcard decks, course notes, and practice quiz records.

Built with Node.js, Express, and SQLite, this slice demonstrates a security-hardened multi-tenant records system. It enforces strict **query-level ownership scoping** across all database operations, utilizes **cryptographic public identifiers** (`rec_...`) to prevent resource enumeration, mandates **pre-deletion audit logging** with mandatory deletion reasons before record removal, and provides single-page addressable navigation.

In strict compliance with `metis-prd-v2.md` and `Agents 0.md`, all record operations enforce explicit owner boundary checks at the database query level (`WHERE public_id = ? AND user_id = ?`), preventing Broken Object Level Authorization (BOLA / IDOR) vulnerabilities.

---

## 2. How To Run It

Follow these numbered steps to run the records and access slice from a fresh clone:

1. **System Requirements**: Node.js (v20.0.0 or higher) and npm.
2. **Navigate to Directory**:
   ```bash
   cd assessment-4-records-access
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Environment Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Key environment variables:
   - `PORT`: HTTP port for Express (default: `3003`).
   - `NODE_ENV`: Set to `development` or `test`.
   - `SESSION_SECRET`: Random string for signing cookies.
   - `DB_PATH`: SQLite database file path (default: `./records.db`).
5. **Database Initialization**:
   SQLite schema automatically creates tables (`users`, `sessions`, `records`, `audit_log`) on first run in `src/db.js` with WAL mode and foreign keys enabled.
6. **Run Automated Tests**:
   ```bash
   npm test
   ```
7. **Start Development Server**:
   ```bash
   npm start
   ```
8. **Access the Application**:
   Open browser at `http://localhost:3003/signup` to register, sign in, and view the academic records portal at `http://localhost:3003/records`.

---

## 3. The Flow, Step By Step

### Flow 1: Record Creation & Cryptographic ID Assignment
1. **Student Action**: The student creates a new confidential record (e.g. Saved Flashcard Deck or Study Vault Note).
2. **Server Execution**: Server generates an internal `UUIDv4` primary key and a separate 128-bit cryptographic public identifier (`rec_<32_hex_chars>`).
3. **Database Insertion**: Record is saved with `user_id` foreign key. The internal UUID is stripped from API responses; only `public_id` is exposed.

### Flow 2: Ownership-Scoped Querying & IDOR Defense
1. **Access Request**: Client requests `GET /api/records/:publicId`.
2. **Query Scoping**: Backend executes `SELECT * FROM records WHERE public_id = ? AND user_id = ?`.
3. **Security Invariant**: If an unauthorized student requests another user's `public_id`, the query returns zero rows, and the API responds with `404 Not Found` (preventing IDOR and resource enumeration).

### Flow 3: Pre-Deletion Audit Trail Logging
1. **Deletion Request**: Student requests record deletion with a mandatory reason payload `{ reason: "Course completed" }`.
2. **Pre-Deletion Snapshot**: Server fetches current record state scoped to `user_id` and writes a full JSON snapshot into `audit_log` with action `'DELETE'`, timestamp, and deletion reason.
3. **Deletion Execution**: Only after `audit_log` is committed does `DELETE FROM records WHERE public_id = ? AND user_id = ?` execute.

---

## 4. The Data Model

```sql
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('DELETE', 'UPDATE', 'CREATE')),
  record_public_id TEXT NOT NULL,
  record_snapshot TEXT NOT NULL,
  performed_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at INTEGER NOT NULL
);
```

---

## 5. The Concepts

1. **Anti-IDOR Query-Level Scoping**: Enforces authorization inside SQL statements (`WHERE user_id = ?`), preventing broken access control vulnerabilities.
2. **Public Identifier Disassociation**: Uses cryptographically secure random identifiers (`rec_...`) to decouple external references from database primary keys.
3. **Pre-Deletion Audit Logging**: Preserves full record history in an immutable audit table before destructive SQL operations execute.

---

## 6. What Went Wrong

1. **Parameterized Route Conflicts**: `GET /api/records/audit-log` was initially captured by `:publicId` parameter route. Resolved by ordering static routes before parameterized routes.
2. **Sub-second Timestamp Race Conditions**: Fast unit tests creating multiple audit entries within 1 second had non-deterministic sort order. Solved by ordering by `created_at DESC, rowid DESC`.

---

## 7. What This Slice Does Not Handle

- **Shared Study Groups / Cross-User Collaboration**: Strictly single-owner records model for MVP scope.
- **Hierarchical Folder Trees**: Single-level category tagging is modeled.

---

## 8. If I Built This Again

1. **Row-Level Security (RLS)**: Enforce row-level security policies at the database layer using PostgreSQL RLS policies.
2. **Cryptographic Audit Signing**: Hash audit log entries with HMAC chains for tamper-evident logging.

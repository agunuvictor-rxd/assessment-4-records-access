# Assessment 4: Records and Access Control Slice — Technical Documentation

## Executive Summary

Assessment 4 demonstrates a production-minded, security-hardened Records and Access Control slice. It enforces strict **query-level ownership scoping** across all database interactions, utilizes **cryptographic public identifiers** to prevent resource enumeration, mandates **pre-deletion audit logging** before record destruction, and features a single-page addressable navigation frontend with dynamic views.

---

## 1. Architectural Decisions & Security Design

### 1.1 Query-Level Ownership Scoping (Anti-IDOR)
In accordance with OWASP API Security Top 10 (API1:2023 Broken Object Level Authorization / IDOR), authorization is enforced directly within the SQL queries rather than in application code.

Every database read, update, or deletion query explicitly binds the authenticated user's session identifier:

```sql
-- READ: Scoped to user_id
SELECT * FROM records WHERE public_id = ? AND user_id = ?

-- UPDATE: Scoped to user_id
UPDATE records SET title = ?, content = ?, updated_at = ? WHERE public_id = ? AND user_id = ?

-- DELETE: Scoped to user_id
DELETE FROM records WHERE public_id = ? AND user_id = ?
```

**Security Invariant:** Even if an attacker discovers or guesses a valid record identifier (`rec_...`), the query engine returns `404 Not Found` because the `WHERE user_id = ?` condition fails. returning `404` instead of `403 Forbidden` prevents attackers from inferring the existence of resource identifiers.

---

### 1.2 Cryptographic Public Identifiers (`public_id`)
To prevent sequential ID enumeration attacks (e.g. `GET /records/1`, `GET /records/2`), internal primary keys (`UUIDv4`) are strictly internal and NEVER sent in HTTP responses or rendered in views.

- External Identifier Format: `rec_<32_hex_chars>` generated via `crypto.randomBytes(16).toString('hex')`.
- Entropy: $2^{128}$ possible combinations, making brute-force enumeration computationally infeasible.

---

### 1.3 Pre-Deletion Audit Trail
To satisfy regulatory compliance and data integrity mandates, deleting a record requires a mandatory `reason` parameter.

**Critical Execution Order:**
1. A transaction fetches the full current record state scoped to `user_id`.
2. A JSON snapshot of the record's final state is written to the immutable `audit_log` table WITH the user ID, timestamp, action (`DELETE`), and deletion reason.
3. Only AFTER the audit log entry is safely committed does the `DELETE FROM records` query execute.

```sql
INSERT INTO audit_log (id, action, record_public_id, record_snapshot, performed_by, reason, created_at)
VALUES (?, 'DELETE', ?, ?, ?, ?, ?);
```

---

## 2. API Contract Specification

| Method | Endpoint | Auth | Request Body | Status Codes | Description |
|---|---|---|---|---|---|
| `POST` | `/api/auth/signup` | No | `{ name, email, password }` | `201`, `400`, `409` | Register account |
| `POST` | `/api/auth/signin` | No | `{ email, password }` | `200`, `401` | Authenticate & set session cookie |
| `POST` | `/api/auth/signout` | Yes | — | `302` | Destroy session & redirect |
| `GET` | `/api/records` | Yes | — | `200` | List user's records (ownership-scoped) |
| `POST` | `/api/records` | Yes | `{ title, content, category }` | `201`, `400` | Create record |
| `GET` | `/api/records/:publicId` | Yes | — | `200`, `404` | View single record |
| `PUT/PATCH` | `/api/records/:publicId` | Yes | `{ title, content, category }` | `200`, `400`, `404` | Update record |
| `DELETE` | `/api/records/:publicId` | Yes | `{ reason }` | `200`, `400`, `404` | Delete record with audit log |
| `GET` | `/api/records/audit-log` | Yes | — | `200` | View user's audit log history |

---

## 3. Automated Verification & Testing Evidence

Automated tests were executed using Node.js built-in test runner (`node --test tests/records.test.js`).

### Test Results Summary
- Total Tests: 11
- Passed: 11
- Failed: 0
- Execution Time: ~1.5s

### Key Test Cases Verified
1. **User Authentication & Session Management**: Signed up Alice and Bob, verified `rec_sid` HttpOnly session cookies set.
2. **Record Creation & Identifier Sanitization**: Alice created a record; verified `public_id` starts with `rec_` and internal `id` is stripped.
3. **IDOR Prevention (Read/Update/Delete)**: Bob attempted GET, PUT, and DELETE on Alice's `public_id`. All return `404 Not Found`.
4. **Pre-Deletion Audit Log Verification**: Alice deleted her record with reason `"Routine data cleanup"`. Verified `audit_log` row contains complete snapshot of record prior to deletion.
5. **Audit Log Access Scoping**: Verified Bob cannot see Alice's audit trail entries.

Evidence generated via `node scripts/generate-evidence.js` and stored in [assessment-4-evidence.json](file:///c:/Users/User/Desktop/FOUR%20BUILD%20ACCESSMENT/assessment-4-records-access/assessment-4-evidence.json).

# 🔐 Product Engineering Bootcamp — Assessment 4: Records and Access Control

🚀 **Assessment 4 Complete!** Built and verified a production-minded **Records & Access Control System** focused on query-level ownership scoping, anti-IDOR defense, pre-deletion audit logging, and public identifier sanitization.

### 🌟 Key Highlights & Engineering Decisions

1. **Anti-IDOR Defense (Query-Level Ownership Scoping)**:
   - Defeated Broken Object Level Authorization (BOLA/IDOR) by forcing `WHERE user_id = ?` directly in database queries.
   - Returning `404 Not Found` for unauthorized access prevents resource enumeration.

2. **Cryptographic Public Identifiers (`rec_...`)**:
   - Disassociated external references from internal database primary keys (`UUIDv4`).
   - Generated using 128-bit cryptographically secure random bytes (`crypto.randomBytes(16)`).

3. **Pre-Deletion Audit Logging**:
   - Required mandatory deletion reasons.
   - Captures full pre-deletion JSON snapshots in an immutable SQLite `audit_log` table before performing `DELETE`.

4. **Addressable Single-Page Navigation & Modern UX**:
   - Clean HTML5 SPA layout with audit log trail history and zero external dependencies.

5. **100% Automated Test Coverage**:
   - 11 unit tests covering user signups, record creation, IDOR attacks, audit logging, and authorization boundary validation.

#CyberSecurity #NodeJS #SQLite #WebSecurity #SoftwareEngineering #BackendDevelopment #IDOR #AuditLogging #OWASP

# LinkedIn Post — Metis Bootcamp Assessment 4: Records & Access Control Slice

🔐 **Metis Academic Co-Pilot — Assessment 4: Query-Level Anti-IDOR & Pre-Deletion Audit Logging**

Why checking permissions in app code isn't enough (and how we enforce query-level security in Node.js & SQLite).

For the final compulsory milestone of the **Metis Academic Co-Pilot** build, I engineered the **Records and Access Control Slice**. In Metis, undergraduate students store saved flashcard decks, study notes, and course records in personal vaults.

### Core Security & Data Invariants:
1. **Query-Level Ownership Scoping (Anti-IDOR)**: Defeats Broken Object Level Authorization (BOLA/IDOR) by forcing `WHERE user_id = ?` directly inside SQL queries. Unauthorized resource requests return `404 Not Found` to prevent resource enumeration.
2. **Cryptographic Public Identifiers (`rec_...`)**: Decouples external references from internal database UUIDs. Generated using 128-bit cryptographically secure random bytes (`crypto.randomBytes(16)`).
3. **Pre-Deletion Audit Logging**: Requires a mandatory deletion reason and writes a full JSON snapshot of the record into an immutable `audit_log` table BEFORE executing the `DELETE` query.

#CyberSecurity #NodeJS #SQLite #Metis #WebSecurity #SoftwareEngineering #IDOR #AuditLogging #OWASP

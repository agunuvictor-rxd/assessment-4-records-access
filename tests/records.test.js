import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { getDatabase, closeDatabase } from '../src/db.js';
import fs from 'node:fs';

const TEST_DB = './test_records.db';

describe('Assessment 4: Records and Access Control', () => {
  let app;
  let server;
  let baseUrl;

  before(async () => {
    closeDatabase();
    try {
      if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
      if (fs.existsSync(`${TEST_DB}-wal`)) fs.unlinkSync(`${TEST_DB}-wal`);
      if (fs.existsSync(`${TEST_DB}-shm`)) fs.unlinkSync(`${TEST_DB}-shm`);
    } catch (e) {}

    getDatabase(TEST_DB);
    app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    closeDatabase();
    setTimeout(() => {
      try {
        if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
        if (fs.existsSync(`${TEST_DB}-wal`)) fs.unlinkSync(`${TEST_DB}-wal`);
        if (fs.existsSync(`${TEST_DB}-shm`)) fs.unlinkSync(`${TEST_DB}-shm`);
      } catch (e) {}
    }, 200);
  });

  let user1Cookie = '';
  let user2Cookie = '';
  let recordId1 = '';

  it('1. Should register User 1 and set session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Owner',
        email: `alice_${Date.now()}@example.com`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    user1Cookie = res.headers.get('set-cookie');
    assert.ok(user1Cookie && user1Cookie.includes('rec_sid='));
  });

  it('2. Should register User 2 and set session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Attacker',
        email: `bob_${Date.now()}@example.com`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    user2Cookie = res.headers.get('set-cookie');
    assert.ok(user2Cookie && user2Cookie.includes('rec_sid='));
  });

  it('3. User 1 creates a confidential record', async () => {
    const res = await fetch(`${baseUrl}/api/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user1Cookie,
      },
      body: JSON.stringify({
        title: 'Alice Financial Vault',
        content: 'Confidential bank account numbers and API keys.',
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.record.public_id.startsWith('rec_'));
    recordId1 = body.record.public_id;
  });

  it('4. User 1 can view their created record', async () => {
    const res = await fetch(`${baseUrl}/api/records/${recordId1}`, {
      headers: { Cookie: user1Cookie },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.record.title, 'Alice Financial Vault');
  });

  it('5. Prevent IDOR: User 2 cannot view User 1 record (404 Not Found)', async () => {
    const res = await fetch(`${baseUrl}/api/records/${recordId1}`, {
      headers: { Cookie: user2Cookie },
    });
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  it('6. Prevent IDOR: User 2 cannot update User 1 record (404 Not Found)', async () => {
    const res = await fetch(`${baseUrl}/api/records/${recordId1}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user2Cookie,
      },
      body: JSON.stringify({
        title: 'Hacked Title',
        content: 'Hacked Content',
      }),
    });
    assert.strictEqual(res.status, 404);
  });

  it('7. Prevent IDOR: User 2 cannot delete User 1 record (404 Not Found)', async () => {
    const res = await fetch(`${baseUrl}/api/records/${recordId1}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user2Cookie,
      },
      body: JSON.stringify({ reason: 'Attempted malicious deletion' }),
    });
    assert.strictEqual(res.status, 404);
  });

  it('8. User 1 updates their record successfully', async () => {
    const res = await fetch(`${baseUrl}/api/records/${recordId1}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user1Cookie,
      },
      body: JSON.stringify({
        title: 'Alice Updated Vault',
        content: 'Updated sensitive content.',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.record.title, 'Alice Updated Vault');
  });

  it('9. Pre-deletion Audit Log: User 1 deletes record with reason, creating audit log entry', async () => {
    const res = await fetch(`${baseUrl}/api/records/${recordId1}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user1Cookie,
      },
      body: JSON.stringify({ reason: 'Routine data cleanup by owner' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('10. User 1 can view audit logs containing pre-deletion record data', async () => {
    const res = await fetch(`${baseUrl}/api/records/audit-log`, {
      headers: { Cookie: user1Cookie },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.auditLogs.length >= 1);
    const log = body.auditLogs.find((l) => l.record_public_id === recordId1 && l.action === 'DELETE');
    assert.ok(log);
    assert.strictEqual(log.action, 'DELETE');
    const snapshot = log.record_snapshot;
    assert.strictEqual(snapshot.title, 'Alice Updated Vault');
  });

  it('11. User 2 cannot view User 1 audit logs', async () => {
    const res = await fetch(`${baseUrl}/api/records/audit-log`, {
      headers: { Cookie: user2Cookie },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const log = body.auditLogs.find((l) => l.record_public_id === recordId1);
    assert.strictEqual(log, undefined);
  });
});

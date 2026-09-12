/**
 * HTML view templates for Assessment 4: Records and Access Slice.
 *
 * Design: Single-page addressable navigation using hash-based routing.
 * Each "page" is rendered via a function that returns full HTML with
 * client-side JavaScript for navigation and API interaction.
 *
 * Accessibility: All inputs have explicit <label for="...">, ARIA attributes,
 * and high-contrast focus rings.
 */

function baseLayout(title, bodyContent, options = {}) {
  const { user, activeNav } = options;
  const navHtml = user
    ? `
    <nav style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;">
      <div style="display:flex;align-items:center;gap:16px;">
        <a href="/records" style="color:#a78bfa;font-weight:700;font-size:18px;text-decoration:none;">📋 Records</a>
        <a href="/records" style="color:${activeNav === 'records' ? '#a78bfa' : '#94a3b8'};text-decoration:none;font-size:14px;">My Records</a>
        <a href="/audit" style="color:${activeNav === 'audit' ? '#a78bfa' : '#94a3b8'};text-decoration:none;font-size:14px;">Audit Log</a>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="color:#cbd5e1;font-size:14px;">${user.name}</span>
        <form action="/api/auth/signout" method="POST" style="margin:0;">
          <button type="submit" id="signout-btn" style="background:#ef4444;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px;">Sign Out</button>
        </form>
      </div>
    </nav>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Assessment 4: Records and Access Slice — Secure record management with ownership scoping and audit logging">
  <title>${title} — Records Access</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    a { color: #a78bfa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 800px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    .card:hover { border-color: #475569; }
    input, textarea, select { width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: #e2e8f0; font-size: 14px; outline: none; }
    input:focus, textarea:focus, select:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167,139,250,0.25); }
    textarea { resize: vertical; min-height: 100px; font-family: inherit; }
    label { display: block; color: #94a3b8; font-size: 13px; margin-bottom: 4px; font-weight: 500; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #7c3aed, #a78bfa); color: #fff; }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-create { background: #065f46; color: #6ee7b7; }
    .badge-update { background: #1e3a5f; color: #7dd3fc; }
    .badge-delete { background: #7f1d1d; color: #fca5a5; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .alert-error { background: #451a1a; border: 1px solid #dc2626; color: #fca5a5; }
    .alert-success { background: #052e16; border: 1px solid #16a34a; color: #86efac; }
    .form-group { margin-bottom: 16px; }
    .empty-state { text-align: center; padding: 48px 24px; color: #64748b; }
    .timestamp { color: #64748b; font-size: 12px; }
    .public-id { font-family: 'Courier New', monospace; font-size: 12px; color: #64748b; background: #0f172a; padding: 2px 6px; border-radius: 4px; }
    .record-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .actions { display: flex; gap: 8px; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #1e293b; border: 1px solid #475569; border-radius: 12px; padding: 24px; width: 90%; max-width: 450px; }
  </style>
</head>
<body>
  ${navHtml}
  ${bodyContent}
</body>
</html>`;
}

export function signinView(error = '') {
  const errorHtml = error ? `<div class="alert alert-error" role="alert">${error}</div>` : '';
  return baseLayout('Sign In', `
    <div class="container" style="max-width:420px;margin-top:80px;">
      <div class="card">
        <h1 style="font-size:24px;margin-bottom:8px;text-align:center;">Sign In</h1>
        <p style="text-align:center;color:#94a3b8;margin-bottom:24px;">Access your records</p>
        ${errorHtml}
        <form id="signin-form" action="/api/auth/signin" method="POST">
          <div class="form-group">
            <label for="signin-email">Email</label>
            <input type="email" id="signin-email" name="email" required autocomplete="email" aria-required="true">
          </div>
          <div class="form-group">
            <label for="signin-password">Password</label>
            <input type="password" id="signin-password" name="password" required autocomplete="current-password" aria-required="true">
          </div>
          <button type="submit" id="signin-submit" class="btn btn-primary" style="width:100%;">Sign In</button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:14px;color:#94a3b8;">
          No account? <a href="/signup">Create one</a>
        </p>
      </div>
    </div>
    <script>
      document.getElementById('signin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Signing in...';
        try {
          const res = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.email.value,
              password: form.password.value,
            }),
          });
          const data = await res.json();
          if (data.success) {
            window.location.href = '/records';
          } else {
            const existing = form.querySelector('.alert');
            if (existing) existing.remove();
            const alert = document.createElement('div');
            alert.className = 'alert alert-error';
            alert.setAttribute('role', 'alert');
            alert.textContent = data.error || 'Sign in failed.';
            form.prepend(alert);
          }
        } catch (err) {
          alert('Network error. Please try again.');
        }
        btn.disabled = false; btn.textContent = 'Sign In';
      });
    </script>
  `);
}

export function signupView(error = '') {
  const errorHtml = error ? `<div class="alert alert-error" role="alert">${error}</div>` : '';
  return baseLayout('Create Account', `
    <div class="container" style="max-width:420px;margin-top:80px;">
      <div class="card">
        <h1 style="font-size:24px;margin-bottom:8px;text-align:center;">Create Account</h1>
        <p style="text-align:center;color:#94a3b8;margin-bottom:24px;">Start managing your records</p>
        ${errorHtml}
        <form id="signup-form" action="/api/auth/signup" method="POST">
          <div class="form-group">
            <label for="signup-name">Full Name</label>
            <input type="text" id="signup-name" name="name" required autocomplete="name" aria-required="true">
          </div>
          <div class="form-group">
            <label for="signup-email">Email</label>
            <input type="email" id="signup-email" name="email" required autocomplete="email" aria-required="true">
          </div>
          <div class="form-group">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" name="password" required minlength="8" autocomplete="new-password" aria-required="true">
            <small style="color:#64748b;font-size:12px;">At least 8 characters</small>
          </div>
          <button type="submit" id="signup-submit" class="btn btn-primary" style="width:100%;">Create Account</button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:14px;color:#94a3b8;">
          Already have an account? <a href="/signin">Sign in</a>
        </p>
      </div>
    </div>
    <script>
      document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Creating account...';
        try {
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: form.name.value,
              email: form.email.value,
              password: form.password.value,
            }),
          });
          const data = await res.json();
          if (data.success) {
            window.location.href = '/records';
          } else {
            const existing = form.querySelector('.alert');
            if (existing) existing.remove();
            const alert = document.createElement('div');
            alert.className = 'alert alert-error';
            alert.setAttribute('role', 'alert');
            alert.textContent = data.error || data.details ? JSON.stringify(data.details) : 'Signup failed.';
            form.prepend(alert);
          }
        } catch (err) {
          alert('Network error. Please try again.');
        }
        btn.disabled = false; btn.textContent = 'Create Account';
      });
    </script>
  `);
}

export function recordsListView({ user, records }) {
  const recordCards = records.length
    ? records
        .map(
          (r) => `
      <div class="card" id="record-${r.public_id}">
        <div class="record-header">
          <div>
            <h3 style="font-size:16px;margin-bottom:4px;">${escapeHtml(r.title)}</h3>
            <span class="badge badge-create" style="margin-right:6px;">${escapeHtml(r.category)}</span>
            <span class="public-id" title="Public ID">ID: ${r.public_id.slice(0, 12)}…</span>
          </div>
          <div class="actions">
            <a href="/records/${r.public_id}" class="btn btn-secondary" style="padding:6px 12px;font-size:12px;">View</a>
            <button onclick="deleteRecord('${r.public_id}')" class="btn btn-danger" style="padding:6px 12px;font-size:12px;" aria-label="Delete record ${escapeHtml(r.title)}">Delete</button>
          </div>
        </div>
        <p style="color:#94a3b8;font-size:14px;margin-top:8px;">${escapeHtml((r.content || '').slice(0, 150))}${(r.content || '').length > 150 ? '…' : ''}</p>
        <p class="timestamp" style="margin-top:8px;">Created: ${formatTimestamp(r.created_at)}</p>
      </div>`
        )
        .join('')
    : `<div class="empty-state">
        <p style="font-size:18px;margin-bottom:8px;">No records yet</p>
        <p>Create your first record using the form above.</p>
      </div>`;

  return baseLayout('My Records', `
    <div class="container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h1 style="font-size:24px;">My Records</h1>
        <span style="color:#64748b;font-size:14px;">${records.length} record${records.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Create Record Form -->
      <div class="card" style="margin-bottom:24px;border-color:#7c3aed;">
        <h2 style="font-size:16px;margin-bottom:16px;color:#a78bfa;">➕ Create New Record</h2>
        <form id="create-form">
          <div class="form-group">
            <label for="record-title">Title</label>
            <input type="text" id="record-title" name="title" required maxlength="200" aria-required="true" placeholder="Record title">
          </div>
          <div style="display:flex;gap:12px;">
            <div class="form-group" style="flex:1;">
              <label for="record-category">Category</label>
              <select id="record-category" name="category" aria-label="Record category">
                <option value="general">General</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="note">Note</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="record-content">Content</label>
            <textarea id="record-content" name="content" maxlength="10000" aria-label="Record content" placeholder="Record content..."></textarea>
          </div>
          <button type="submit" id="create-submit" class="btn btn-primary">Create Record</button>
        </form>
      </div>

      <div id="records-list">
        ${recordCards}
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div id="delete-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <h3 style="margin-bottom:16px;font-size:18px;">Confirm Deletion</h3>
        <p style="color:#94a3b8;margin-bottom:16px;">This action is permanent. A pre-deletion audit log entry will be preserved.</p>
        <div class="form-group">
          <label for="delete-reason">Reason for deletion (required for audit trail)</label>
          <textarea id="delete-reason" required minlength="1" maxlength="500" placeholder="Why is this record being deleted?" aria-required="true"></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button onclick="closeDeleteModal()" class="btn btn-secondary">Cancel</button>
          <button id="confirm-delete-btn" onclick="confirmDelete()" class="btn btn-danger">Delete Permanently</button>
        </div>
      </div>
    </div>

    <script>
      let pendingDeleteId = null;

      document.getElementById('create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Creating...';
        try {
          const res = await fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: form.title.value,
              content: form.content.value,
              category: form.category.value,
            }),
          });
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          } else {
            alert(data.error || 'Failed to create record.');
          }
        } catch (err) {
          alert('Network error.');
        }
        btn.disabled = false; btn.textContent = 'Create Record';
      });

      function deleteRecord(publicId) {
        pendingDeleteId = publicId;
        document.getElementById('delete-modal').style.display = 'flex';
        document.getElementById('delete-reason').value = '';
        document.getElementById('delete-reason').focus();
      }

      function closeDeleteModal() {
        document.getElementById('delete-modal').style.display = 'none';
        pendingDeleteId = null;
      }

      async function confirmDelete() {
        const reason = document.getElementById('delete-reason').value.trim();
        if (!reason) {
          alert('A deletion reason is required for the audit trail.');
          return;
        }
        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true; btn.textContent = 'Deleting...';
        try {
          const res = await fetch('/api/records/' + pendingDeleteId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
          });
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          } else {
            alert(data.error || 'Failed to delete record.');
          }
        } catch (err) {
          alert('Network error.');
        }
        btn.disabled = false; btn.textContent = 'Delete Permanently';
        closeDeleteModal();
      }
    </script>
  `, { user, activeNav: 'records' });
}

export function recordDetailView({ user, record, auditTrail }) {
  const auditHtml = auditTrail.length
    ? auditTrail
        .map(
          (entry) => `
      <div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span class="badge badge-${entry.action.toLowerCase()}">${entry.action}</span>
          <span class="timestamp">${formatTimestamp(entry.created_at)}</span>
        </div>
        <p style="font-size:13px;color:#94a3b8;margin-bottom:4px;">Reason: ${escapeHtml(entry.reason || 'N/A')}</p>
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;color:#7dd3fc;font-size:13px;">View snapshot</summary>
          <pre style="background:#0f172a;padding:12px;border-radius:6px;margin-top:8px;font-size:12px;overflow-x:auto;color:#94a3b8;">${escapeHtml(JSON.stringify(entry.record_snapshot, null, 2))}</pre>
        </details>
      </div>`
        )
        .join('')
    : '<p style="color:#64748b;text-align:center;padding:16px;">No audit entries yet.</p>';

  return baseLayout(`Record: ${record.title}`, `
    <div class="container">
      <a href="/records" style="color:#94a3b8;font-size:14px;margin-bottom:16px;display:inline-block;">← Back to Records</a>

      <div class="card" style="margin-bottom:24px;">
        <div class="record-header">
          <div>
            <h1 style="font-size:22px;margin-bottom:8px;" id="record-title-display">${escapeHtml(record.title)}</h1>
            <span class="badge badge-create">${escapeHtml(record.category)}</span>
            <span class="public-id" style="margin-left:8px;">Public ID: ${record.public_id}</span>
          </div>
          <div class="actions">
            <button onclick="toggleEdit()" id="edit-toggle-btn" class="btn btn-secondary" style="padding:6px 14px;font-size:13px;">Edit</button>
          </div>
        </div>

        <!-- Display mode -->
        <div id="display-mode">
          <div style="margin-top:16px;padding:16px;background:#0f172a;border-radius:8px;white-space:pre-wrap;font-size:14px;color:#cbd5e1;min-height:60px;">${escapeHtml(record.content || '(No content)')}</div>
          <div style="display:flex;gap:16px;margin-top:12px;">
            <span class="timestamp">Created: ${formatTimestamp(record.created_at)}</span>
            <span class="timestamp">Updated: ${formatTimestamp(record.updated_at)}</span>
          </div>
        </div>

        <!-- Edit mode -->
        <form id="edit-form" style="display:none;margin-top:16px;">
          <div class="form-group">
            <label for="edit-title">Title</label>
            <input type="text" id="edit-title" value="${escapeAttr(record.title)}" required maxlength="200">
          </div>
          <div class="form-group">
            <label for="edit-category">Category</label>
            <select id="edit-category">
              ${['general', 'meeting', 'task', 'note', 'project'].map(c => `<option value="${c}" ${c === record.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="edit-content">Content</label>
            <textarea id="edit-content" maxlength="10000" style="min-height:150px;">${escapeHtml(record.content || '')}</textarea>
          </div>
          <div style="display:flex;gap:8px;">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <button type="button" onclick="toggleEdit()" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>

      <h2 style="font-size:18px;margin-bottom:12px;color:#94a3b8;">📋 Audit Trail</h2>
      ${auditHtml}
    </div>

    <script>
      let editMode = false;
      function toggleEdit() {
        editMode = !editMode;
        document.getElementById('display-mode').style.display = editMode ? 'none' : 'block';
        document.getElementById('edit-form').style.display = editMode ? 'block' : 'none';
        document.getElementById('edit-toggle-btn').textContent = editMode ? 'Cancel' : 'Edit';
      }

      document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const res = await fetch('/api/records/${record.public_id}', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: document.getElementById('edit-title').value,
              content: document.getElementById('edit-content').value,
              category: document.getElementById('edit-category').value,
            }),
          });
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          } else {
            alert(data.error || 'Failed to update record.');
          }
        } catch (err) {
          alert('Network error.');
        }
      });
    </script>
  `, { user, activeNav: 'records' });
}

export function auditLogView({ user, auditLog }) {
  const logHtml = auditLog.length
    ? auditLog
        .map(
          (entry) => `
      <div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <span class="badge badge-${entry.action.toLowerCase()}">${entry.action}</span>
            <a href="/records/${entry.record_public_id}" class="public-id" style="margin-left:8px;">${entry.record_public_id.slice(0, 12)}…</a>
          </div>
          <span class="timestamp">${formatTimestamp(entry.created_at)}</span>
        </div>
        <p style="font-size:13px;color:#94a3b8;">Reason: ${escapeHtml(entry.reason || 'N/A')}</p>
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;color:#7dd3fc;font-size:13px;">View snapshot</summary>
          <pre style="background:#0f172a;padding:12px;border-radius:6px;margin-top:8px;font-size:12px;overflow-x:auto;color:#94a3b8;">${escapeHtml(JSON.stringify(entry.record_snapshot, null, 2))}</pre>
        </details>
      </div>`
        )
        .join('')
    : '<div class="empty-state"><p>No audit log entries yet.</p></div>';

  return baseLayout('Audit Log', `
    <div class="container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h1 style="font-size:24px;">Audit Log</h1>
        <span style="color:#64748b;font-size:14px;">${auditLog.length} entries</span>
      </div>
      <p style="color:#94a3b8;margin-bottom:24px;font-size:14px;">
        Immutable record of all create, update, and delete operations on your records.
        Audit entries are written <strong>before</strong> destructive operations for maximum traceability.
      </p>
      ${logHtml}
    </div>
  `, { user, activeNav: 'audit' });
}

// --- Utility functions ---

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function formatTimestamp(epochSec) {
  if (!epochSec) return 'N/A';
  return new Date(epochSec * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

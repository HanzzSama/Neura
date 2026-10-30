/**
 * public/js/app-admin-history.js
 * ==============================
 * Role: Admin (Administrator & ML Engineer)
 * Audit Log & System History Tracker.
 */

const ADMIN_AUDIT_LOG_KEY = 'neura_admin_audit_log_v1';

function getAdminAuditLogs() {
  try {
    const raw = localStorage.getItem(ADMIN_AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function recordAdminAction(actionType, description) {
  try {
    const logs = getAdminAuditLogs();
    const entry = {
      action: actionType,
      description: description,
      timestamp: new Date().toISOString()
    };
    logs.unshift(entry);
    if (logs.length > 100) logs.pop();
    localStorage.setItem(ADMIN_AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch (e) { }
}

window.getAdminAuditLogs = getAdminAuditLogs;
window.recordAdminAction = recordAdminAction;

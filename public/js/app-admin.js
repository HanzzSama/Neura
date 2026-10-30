/**
 * public/js/app-admin.js
 * =======================
 * Coordinator module for Role: Admin (Administrator & ML Engineer).
 * Aggregates Admin Auth, Nakes Directory Management, and ML Training telemetry.
 */

window.NeuraAdmin = {
  // Auth
  verifySession: () => typeof verifyAdminSessionToken === 'function' ? verifyAdminSessionToken() : false,
  logout: () => typeof logoutAdmin === 'function' ? logoutAdmin() : null,

  // Nakes Management Modal
  openNakesModal: () => typeof openNakesAdminModal === 'function' ? openNakesAdminModal() : null,
  closeNakesModal: () => typeof closeNakesAdminModal === 'function' ? closeNakesAdminModal() : null,

  // ML Training
  startPolling: (totalEpochs, runId) => typeof startProgressPolling === 'function' ? startProgressPolling(totalEpochs, runId) : null,

  // Audit Logs
  getLogs: () => typeof getAdminAuditLogs === 'function' ? getAdminAuditLogs() : [],
  recordAction: (type, desc) => typeof recordAdminAction === 'function' ? recordAdminAction(type, desc) : null,
};

console.log('[Neura Modular] Admin Role Module initialized.');

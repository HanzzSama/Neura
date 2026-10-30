/**
 * public/js/app-user-history.js
 * =============================
 * Role: User (Pasien)
 * Riwayat Skrining & Percakapan Konsultasi Pasien.
 */

function getUserScreeningHistory() {
  const sessions = window.chatSessions || [];
  return sessions.filter(s => {
    return s.messages && s.messages.some(m => {
      const text = typeof m.text === 'string' ? m.text : '';
      return text.includes('diagnostic-card') || text.includes('dokumen-konsultasi') || text.includes('/predict');
    });
  });
}

function renderUserHistoryList(containerId = 'user-history-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const screenings = getUserScreeningHistory();
  if (screenings.length === 0) {
    container.innerHTML = `
      <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">
        Belum ada riwayat skrining Alzheimer yang tersimpan.
      </div>
    `;
    return;
  }

  let html = '<div class="user-history-timeline" style="display:flex;flex-direction:column;gap:10px;">';
  screenings.forEach(s => {
    const dateStr = new Date(s.createdAt || Date.now()).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    html += `
      <div class="user-history-item" onclick="switchChatSession('${escapeHtml(s.id)}')" style="cursor:pointer;padding:12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="font-size:13px;color:var(--text-primary);">${escapeHtml(s.title || 'Sesi Konsultasi')}</strong>
          <span style="font-size:11px;color:var(--text-muted);">${escapeHtml(dateStr)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);">${s.messages.length} pesan tercatat</div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

window.getUserScreeningHistory = getUserScreeningHistory;
window.renderUserHistoryList = renderUserHistoryList;

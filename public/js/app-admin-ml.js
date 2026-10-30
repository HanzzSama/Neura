/**
 * public/js/app-admin-ml.js
 * =========================
 * Role: Admin (Administrator & ML Engineer)
 * Model Training Live Progress Visualizer & Polling Mechanism (/train, /progress).
 */


function renderProgressOutput(data) {
  if (!data.progress || data.progress.length === 0) {
    appendAssistantMessage(data.running
      ? `<p>Training is actively executing in background, awaiting first epoch logs...</p>`
      : `<p>No recent training sessions recorded. Use <code>/train 5</code> to initiate a new run.</p>`
    );
    return;
  }

  const rows = data.progress.map(ep => `
    <tr>
      <td>Epoch ${ep.epoch}</td>
      <td>${ep.loss.toFixed(4)}</td>
      <td class="${ep.val_loss < 1.5 ? 'val-good' : ''}">${ep.val_loss.toFixed(4)}</td>
      <td>${(ep.accuracy * 100).toFixed(1)}%</td>
      <td class="${ep.val_accuracy > 0.5 ? 'val-good' : ''}">${(ep.val_accuracy * 100).toFixed(1)}%</td>
    </tr>
  `).join('');

  const statusBadge = data.running ? 'Running...' : data.report ? 'Complete' : 'Stopped';
  const needsClamp = data.progress.length > 8;
  const clampClass = needsClamp ? 'is-clamped' : '';

  appendAssistantMessage(`
    <h4>Training Session Progress &bull; ${statusBadge}</h4>
    <div class="training-progress-card ${clampClass}">
      <div class="training-card-body">
        <table class="claude-table" style="margin:0;border-radius:0;border:none">
          <thead><tr><th>Epoch</th><th>Loss</th><th>Val Loss</th><th>Acc</th><th>Val Acc</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${needsClamp ? `
      <div class="training-card-expand-bar">
        <button type="button" class="training-card-expand-btn" onclick="toggleTrainingCardClamp(this)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          <span class="expand-text">Selengkapnya</span>
        </button>
      </div>` : ''}
    </div>
  `);
}

// --------------------------------------------------------------------------
// Training Polling Mechanism
// --------------------------------------------------------------------------
function startProgressPolling(totalEpochs, runId) {
  if (trainingPollInterval) {
    clearInterval(trainingPollInterval);
    trainingPollInterval = null;
  }

  let renderedRound = 0;
  let serverProgress = [];
  let isServerDone = false;
  let finalReport = null;

  function applyRoundUI(roundNum, epData) {
    const fill = document.getElementById(`${runId}_fill`);
    const counter = document.getElementById(`${runId}_counter`);
    const meta = document.getElementById(`${runId}_meta`);
    const statusTitle = document.getElementById(`${runId}_status`);

    const pct = Math.min(Math.round((roundNum / totalEpochs) * 100), 100);

    if (fill) fill.style.width = pct + '%';
    if (counter) counter.textContent = `Round ${roundNum} / ${totalEpochs}`;

    if (epData && meta) {
      meta.innerHTML = `
        <span>Loss: <strong style="color:var(--accent-terracotta)">${epData.loss.toFixed(4)}</strong> &bull; Val Acc: <strong style="color:var(--accent-green)">${(epData.val_accuracy * 100).toFixed(1)}%</strong></span>
        <span style="color:var(--text-secondary);font-weight:600">${pct}%</span>
      `;
    } else if (roundNum === 0 && meta) {
      meta.innerHTML = `
        <span>Splitting 2,149 patient records &bull; Initializing boosting rounds...</span>
        <span style="color:var(--text-secondary)">0%</span>
      `;
    }

    setDynamicIslandState('training', {
      sub: epData ? `Round ${roundNum}/${totalEpochs} \u2022 Loss: ${epData.loss.toFixed(3)} \u2022 ${(epData.val_accuracy * 100).toFixed(0)}%` : `Round ${roundNum}/${totalEpochs} \u2022 Optimizing trees...`,
      main: `Training (${pct}%)`
    });
  }

  trainingPollInterval = setInterval(async () => {
    try {
      const data = await fetchJSON(`/api/train/progress?_t=${Date.now()}`);
      if (data && Array.isArray(data.progress)) {
        serverProgress = data.progress;
      }
      if (data && !data.running) {
        isServerDone = true;
        if (data.report) finalReport = data.report;
      }

      // Stepwise catch-up: advance rendered round smoothly towards serverProgress.length
      if (renderedRound < serverProgress.length) {
        const step = Math.max(1, Math.min(2, Math.ceil((serverProgress.length - renderedRound) / 2)));
        renderedRound = Math.min(renderedRound + step, serverProgress.length);
        const epData = serverProgress[renderedRound - 1];
        applyRoundUI(renderedRound, epData);
      }

      // When training finishes and frontend has rendered all rounds up to totalEpochs / serverProgress
      if (isServerDone && (renderedRound >= totalEpochs || (serverProgress.length > 0 && renderedRound >= serverProgress.length))) {
        clearInterval(trainingPollInterval);
        trainingPollInterval = null;

        const fill = document.getElementById(`${runId}_fill`);
        const counter = document.getElementById(`${runId}_counter`);
        const meta = document.getElementById(`${runId}_meta`);
        const statusTitle = document.getElementById(`${runId}_status`);

        if (fill) {
          fill.classList.remove('active');
          fill.style.width = '100%';
          fill.style.backgroundColor = 'var(--accent-green)';
        }
        if (counter) counter.textContent = `Round ${totalEpochs} / ${totalEpochs}`;
        if (statusTitle) {
          statusTitle.textContent = 'Optimization Converged';
          statusTitle.style.color = 'var(--accent-green)';
          statusTitle.style.fontWeight = '600';
        }
        if (meta) {
          meta.innerHTML = `<span style="color:var(--accent-green);font-weight:600">&check; All ${totalEpochs} boosting rounds converged</span><span style="color:var(--accent-green);font-weight:700">100%</span>`;
        }

        fetchModelStatus(false);
        showToast('Model training completed successfully', 'success');

        setDynamicIslandState('ready', {
          sub: finalReport ? `Training Complete \u2022 Accuracy: ${(finalReport.accuracy * 100).toFixed(1)}%` : 'Training Complete',
          main: 'Trained',
          keepTimer: true
        });

        if (finalReport) {
          setTimeout(() => {
            appendAssistantMessage(`
              <h4>Training Session Completed</h4>
              <div class="claude-card">
                <div class="claude-stats-grid">
                  <div class="stat-pill">
                    <div class="stat-label">Total Rounds</div>
                    <div class="stat-val">${totalEpochs}</div>
                  </div>
                  <div class="stat-pill">
                    <div class="stat-label">Test Accuracy</div>
                    <div class="stat-val val-good">${(finalReport.accuracy * 100).toFixed(1)}%</div>
                  </div>
                  <div class="stat-pill">
                    <div class="stat-label">F1-Score</div>
                    <div class="stat-val val-good">${(finalReport.f1_score * 100).toFixed(1)}%</div>
                  </div>
                  <div class="stat-pill">
                    <div class="stat-label">ROC-AUC</div>
                    <div class="stat-val val-good">${(finalReport.roc_auc * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <p class="checkpoint-path-note">Checkpoint saved to <code>public/checkpoints/xgboost_alzheimers.json</code></p>
              </div>
            `, { stream: false });
          }, 350);
        }
      }
    } catch (err) {
      // Silent error during poll
    }
  }, 100);
}


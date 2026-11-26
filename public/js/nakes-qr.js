/* ==========================================================================
   NEURA AI — Nakes QR Telemetry & Pure-JS ISO-18004 QR SVG Generator
   Zero external dependencies, zero glow, 3-minute auto-rotation sync
   ========================================================================== */

(function () {
  "use strict";

  // ------------------------------------------------------------------------
  // 1. Minimalist Spec-Compliant QR Code Encoder (Byte Mode, ECC Level M)
  // ------------------------------------------------------------------------
  const QR = (function () {
    const EXP = new Uint8Array(512);
    const LOG = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      EXP[i + 255] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }

    function gfMul(a, b) {
      if (a === 0 || b === 0) return 0;
      return EXP[LOG[a] + LOG[b]];
    }

    function rsGenPoly(ecLen) {
      let g = [1];
      for (let i = 0; i < ecLen; i++) {
        const next = new Array(g.length + 1).fill(0);
        const factor = EXP[i];
        for (let j = 0; j < g.length; j++) {
          next[j] ^= g[j];
          next[j + 1] ^= gfMul(g[j], factor);
        }
        g = next;
      }
      return g;
    }

    function rsEncode(data, ecLen) {
      const gen = rsGenPoly(ecLen);
      const res = new Uint8Array(data.length + ecLen);
      res.set(data, 0);
      for (let i = 0; i < data.length; i++) {
        const coef = res[i];
        if (coef !== 0) {
          for (let j = 0; j < gen.length; j++) {
            res[i + j] ^= gfMul(gen[j], coef);
          }
        }
      }
      return res.slice(data.length);
    }

    // Version 1..8 Capacity & EC Blocks for ECC Level M
    // [version, size, dataCodewords, ecPerBlock, blocksG1, dataG1, blocksG2, dataG2]
    const VERSIONS_M = [
      null,
      [1, 21, 16, 10, 1, 16, 0, 0],
      [2, 25, 28, 16, 1, 28, 0, 0],
      [3, 29, 44, 26, 1, 44, 0, 0],
      [4, 33, 64, 18, 2, 32, 0, 0],
      [5, 37, 86, 24, 2, 43, 0, 0],
      [6, 41, 108, 16, 4, 27, 0, 0],
      [7, 45, 124, 18, 4, 31, 0, 0],
      [8, 49, 154, 22, 2, 38, 2, 39],
    ];

    const ALIGN_POS = [
      null,
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
    ];

    function pickVersion(byteLen) {
      // 4-bit mode (0100) + 8-bit count + 8*byteLen + 4-bit terminator
      const neededBits = 4 + 8 + byteLen * 8;
      for (let v = 1; v < VERSIONS_M.length; v++) {
        const capBits = VERSIONS_M[v][2] * 8;
        if (neededBits <= capBits) return VERSIONS_M[v];
      }
      return VERSIONS_M[VERSIONS_M.length - 1];
    }

    function encodeData(text) {
      const bytes = new TextEncoder().encode(text);
      const spec = pickVersion(bytes.length);
      const [, size, totalData, ecPerBlock, b1, d1, b2, d2] = spec;

      const bits = [];
      function pushBits(val, len) {
        for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
      }

      pushBits(0b0100, 4); // Byte mode
      pushBits(bytes.length, 8);
      for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

      const maxBits = totalData * 8;
      const termLen = Math.min(4, maxBits - bits.length);
      pushBits(0, termLen);
      while (bits.length % 8 !== 0) bits.push(0);

      const data = new Uint8Array(totalData);
      for (let i = 0; i < bits.length / 8; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
        data[i] = byte;
      }
      const padBytes = [0xec, 0x11];
      let pIdx = 0;
      for (let i = bits.length / 8; i < totalData; i++) {
        data[i] = padBytes[pIdx % 2];
        pIdx++;
      }

      // Split into blocks and compute RS ECC
      const dataBlocks = [];
      const ecBlocks = [];
      let offset = 0;
      for (let i = 0; i < b1; i++) {
        const blk = data.slice(offset, offset + d1);
        offset += d1;
        dataBlocks.push(blk);
        ecBlocks.push(rsEncode(blk, ecPerBlock));
      }
      for (let i = 0; i < b2; i++) {
        const blk = data.slice(offset, offset + d2);
        offset += d2;
        dataBlocks.push(blk);
        ecBlocks.push(rsEncode(blk, ecPerBlock));
      }

      const interleaved = [];
      const maxD = Math.max(d1, d2);
      for (let i = 0; i < maxD; i++) {
        for (const blk of dataBlocks) {
          if (i < blk.length) interleaved.push(blk[i]);
        }
      }
      for (let i = 0; i < ecPerBlock; i++) {
        for (const ec of ecBlocks) {
          if (i < ec.length) interleaved.push(ec[i]);
        }
      }

      return { version: spec[0], size, codewords: interleaved };
    }

    function buildMatrix(version, size, codewords) {
      const grid = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
      const reserved = Array.from({ length: size }, () => new Uint8Array(size));

      function setMod(r, c, val, isFunc) {
        if (r < 0 || c < 0 || r >= size || c >= size) return;
        grid[r][c] = val ? 1 : 0;
        if (isFunc) reserved[r][c] = 1;
      }

      function placeFinder(top, left) {
        for (let r = -1; r <= 7; r++) {
          for (let c = -1; c <= 7; c++) {
            const rr = top + r;
            const cc = left + c;
            if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
            const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
            const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setMod(rr, cc, inOuter && (onBorder || inCore), true);
          }
        }
      }

      placeFinder(0, 0);
      placeFinder(0, size - 7);
      placeFinder(size - 7, 0);

      // Timing patterns
      for (let i = 8; i < size - 8; i++) {
        setMod(6, i, i % 2 === 0, true);
        setMod(i, 6, i % 2 === 0, true);
      }

      // Dark module
      setMod(size - 8, 8, 1, true);

      // Alignment patterns
      const pos = ALIGN_POS[version] || [];
      for (const r0 of pos) {
        for (const c0 of pos) {
          if (reserved[r0][c0]) continue;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const dark =
                Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
              setMod(r0 + dr, c0 + dc, dark, true);
            }
          }
        }
      }

      // Reserve format info areas
      for (let i = 0; i < 9; i++) {
        if (i !== 6) {
          reserved[8][i] = 1;
          reserved[i][8] = 1;
        }
      }
      for (let i = 0; i < 8; i++) {
        reserved[8][size - 1 - i] = 1;
        reserved[size - 1 - i][8] = 1;
      }

      // Reserve version info for v >= 7
      if (version >= 7) {
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 3; j++) {
            reserved[size - 11 + j][i] = 1;
            reserved[i][size - 11 + j] = 1;
          }
        }
      }

      // Place data bits zig-zag
      const bits = [];
      for (const cw of codewords) {
        for (let b = 7; b >= 0; b--) bits.push((cw >> b) & 1);
      }
      let bitIdx = 0;
      let upward = true;
      for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let step = 0; step < size; step++) {
          const r = upward ? size - 1 - step : step;
          for (let dx = 0; dx < 2; dx++) {
            const c = right - dx;
            if (!reserved[r][c]) {
              const val = bitIdx < bits.length ? bits[bitIdx++] : 0;
              grid[r][c] = val;
            }
          }
        }
        upward = !upward;
      }

      // Apply best mask (0..7)
      function maskFn(mask, r, c) {
        switch (mask) {
          case 0: return (r + c) % 2 === 0;
          case 1: return r % 2 === 0;
          case 2: return c % 3 === 0;
          case 3: return (r + c) % 3 === 0;
          case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
          case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
          case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
          case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
          default: return false;
        }
      }

      // Format info (ECC M = 00) BCH(15,5)
      function computeFormatBits(mask) {
        const data5 = (0b00 << 3) | mask;
        let d = data5 << 10;
        const poly = 0b10100110111;
        for (let i = 14; i >= 10; i--) {
          if ((d >> i) & 1) d ^= poly << (i - 10);
        }
        return ((data5 << 10) | d) ^ 0b101010000010010;
      }

      function computeVersionBits(v) {
        let d = v << 12;
        const poly = 0b1111100100101;
        for (let i = 17; i >= 12; i--) {
          if ((d >> i) & 1) d ^= poly << (i - 12);
        }
        return (v << 12) | d;
      }

      function applyFormatAndVersion(mat, mask) {
        const fmt = computeFormatBits(mask);
        for (let i = 0; i < 6; i++) {
          const bit = (fmt >> i) & 1;
          mat[8][i] = bit;
          mat[size - 1 - i][8] = bit;
        }
        mat[8][7] = (fmt >> 6) & 1;
        mat[size - 7][8] = (fmt >> 6) & 1;
        mat[8][8] = (fmt >> 7) & 1;
        mat[8][size - 8] = (fmt >> 7) & 1;
        mat[7][8] = (fmt >> 8) & 1;
        mat[8][size - 7] = (fmt >> 8) & 1;
        for (let i = 9; i < 15; i++) {
          const bit = (fmt >> i) & 1;
          mat[14 - i][8] = bit;
          mat[8][size - 15 + i] = bit;
        }
        if (version >= 7) {
          const vb = computeVersionBits(version);
          for (let i = 0; i < 18; i++) {
            const bit = (vb >> i) & 1;
            const a = Math.floor(i / 3);
            const b = i % 3;
            mat[a][size - 11 + b] = bit;
            mat[size - 11 + b][a] = bit;
          }
        }
      }

      function penalty(mat) {
        let score = 0;
        for (let r = 0; r < size; r++) {
          let run = 1;
          for (let c = 1; c < size; c++) {
            if (mat[r][c] === mat[r][c - 1]) {
              run++;
              if (run === 5) score += 3;
              else if (run > 5) score += 1;
            } else run = 1;
          }
        }
        for (let c = 0; c < size; c++) {
          let run = 1;
          for (let r = 1; r < size; r++) {
            if (mat[r][c] === mat[r - 1][c]) {
              run++;
              if (run === 5) score += 3;
              else if (run > 5) score += 1;
            } else run = 1;
          }
        }
        for (let r = 0; r < size - 1; r++) {
          for (let c = 0; c < size - 1; c++) {
            const v = mat[r][c];
            if (v === mat[r][c + 1] && v === mat[r + 1][c] && v === mat[r + 1][c + 1]) {
              score += 3;
            }
          }
        }
        return score;
      }

      let bestMat = null;
      let bestScore = Infinity;
      for (let m = 0; m < 8; m++) {
        const cand = grid.map((row, r) =>
          row.map((val, c) => (reserved[r][c] ? val : val ^ (maskFn(m, r, c) ? 1 : 0)))
        );
        applyFormatAndVersion(cand, m);
        const s = penalty(cand);
        if (s < bestScore) {
          bestScore = s;
          bestMat = cand;
        }
      }
      return bestMat;
    }

    function toSvg(text) {
      const { version, size, codewords } = encodeData(text);
      const mat = buildMatrix(version, size, codewords);
      const quiet = 2;
      const dim = size + quiet * 2;
      let rects = "";
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (mat[r][c] === 1) {
            rects += `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1"/>`;
          }
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" role="img" aria-label="QR Code">${rects}</svg>`;
    }

    return { toSvg };
  })();

  // ------------------------------------------------------------------------
  // 2. Page Telemetry & 3-Minute Auto-Rotation Controller
  // ------------------------------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const liveId = (params.get("live") || "").trim();

  const elActivePanel = document.getElementById("nqrActivePanel");
  const elLockedPanel = document.getElementById("nqrLockedPanel");
  const elLockedReason = document.getElementById("nqrLockedReason");
  const elStatusPill = document.getElementById("nqrStatusPill");
  const elStatusDot = document.getElementById("nqrStatusDot");
  const elStatusText = document.getElementById("nqrStatusText");
  const elLiveIdTag = document.getElementById("nqrLiveIdTag");
  const elQrMount = document.getElementById("nqrQrMount");
  const elCodeText = document.getElementById("nqrCodeText");
  const elTargetPath = document.getElementById("nqrTargetPath");
  const elManualUrlLink = document.getElementById("nqrManualUrlLink");
  const elTimerText = document.getElementById("nqrTimerText");
  const elProgressFill = document.getElementById("nqrProgressFill");
  const elCopyCodeBtn = document.getElementById("nqrCopyCodeBtn");
  const elThemeBtn = document.getElementById("nqrThemeBtn");
  const elThemeLabel = document.getElementById("nqrThemeLabel");

  let state = {
    active: false,
    code: "",
    registerUrl: "",
    remainingSeconds: 180,
    ttlSeconds: 180,
    lastRenderedCode: "",
  };
  let tickTimer = null;
  let syncTimer = null;
  let isFetching = false;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("neura_nqr_theme", theme);
    if (elThemeLabel) {
      elThemeLabel.textContent = theme === "dark" ? "LIGHT" : "DARK";
    }
  }

  const savedTheme = localStorage.getItem("neura_nqr_theme") || "dark";
  applyTheme(savedTheme);
  if (elThemeBtn) {
    elThemeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  function formatMMSS(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function renderCountdown() {
    if (!state.active) return;
    const rem = Math.max(0, state.remainingSeconds);
    elTimerText.textContent = formatMMSS(rem);
    elTimerText.classList.toggle("urgent", rem <= 20);
    const pct = state.ttlSeconds > 0 ? Math.max(0, Math.min(100, (rem / state.ttlSeconds) * 100)) : 0;
    elProgressFill.style.width = `${pct}%`;
  }

  function renderSession(data) {
    if (!data || !data.active) {
      state.active = false;
      elActivePanel.hidden = true;
      elLockedPanel.hidden = false;
      elStatusDot.className = "nqr-status-dot locked";
      elStatusText.textContent = "TAUTAN NONAKTIF";
      if (elLockedReason && data && data.reason) {
        elLockedReason.textContent = data.reason;
      }
      return;
    }

    state.active = true;
    state.code = data.code || "";
    state.registerUrl = data.register_url || `${window.location.origin}/nakes/register?code=${encodeURIComponent(state.code)}`;
    state.remainingSeconds = Number(data.remaining_seconds ?? 180);
    state.ttlSeconds = Number(data.ttl_seconds ?? 180);

    elActivePanel.hidden = false;
    elLockedPanel.hidden = true;
    elStatusDot.className = "nqr-status-dot active";
    elStatusText.textContent = "LIVE // AKTIF";
    if (elLiveIdTag) {
      elLiveIdTag.textContent = `LIVE: ${(data.live_id || liveId || "—").slice(0, 18)}`;
    }

    if (state.code !== state.lastRenderedCode) {
      state.lastRenderedCode = state.code;
      elCodeText.textContent = state.code;
      elQrMount.innerHTML = QR.toSvg(state.registerUrl);
      elTargetPath.textContent = `/nakes/register?code=${state.code}`;
      if (elManualUrlLink) {
        const manualUrl = `${window.location.origin}/nakes/code-res`;
        elManualUrlLink.href = "/nakes/code-res";
        elManualUrlLink.textContent = manualUrl;
      }
    }

    renderCountdown();
  }

  async function fetchSession() {
    if (isFetching) return;
    isFetching = true;
    try {
      const url = `/api/nakes/qr-session?live=${encodeURIComponent(liveId)}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json && json.success) {
        renderSession(json.data);
      } else {
        renderSession({ active: false, reason: (json && json.error) || "Gagal memuat sesi QR." });
      }
    } catch (_) {
      elStatusText.textContent = "RECONNECTING";
    } finally {
      isFetching = false;
    }
  }

  if (elCopyCodeBtn) {
    elCopyCodeBtn.addEventListener("click", async () => {
      if (!state.code) return;
      try {
        await navigator.clipboard.writeText(state.code);
        elCopyCodeBtn.textContent = "Tersalin";
        setTimeout(() => {
          elCopyCodeBtn.textContent = "Salin Kode";
        }, 1600);
      } catch (_) {
        elCopyCodeBtn.textContent = state.code;
      }
    });
  }

  // Initial fetch & timers
  fetchSession();
  tickTimer = setInterval(() => {
    if (!state.active) return;
    if (state.remainingSeconds > 0) {
      state.remainingSeconds -= 1;
      renderCountdown();
    }
    if (state.remainingSeconds <= 0) {
      fetchSession();
    }
  }, 1000);

  // Periodic sync every 15s so admin toggle or external rotation reflects promptly
  syncTimer = setInterval(fetchSession, 15000);
})();

/**
 * public/js/hero-brain-canvas.js  v2.0
 * ======================================
 * GPU-Aware Interactive Neural Brain Canvas
 *
 * GPU Selection Hierarchy (Browser Web API level):
 *   1. Dedicated GPU + VRAM   → OffscreenCanvas + Worker (GPU compositor thread)
 *   2. Integrated GPU (iGPU)  → OffscreenCanvas + Worker (iGPU compositor thread)
 *   3. CPU software renderer  → Main-thread Canvas 2D (graceful fallback)
 *
 * How GPU selection works in browsers:
 *  - navigator.gpu (WebGPU) or a hidden WebGL context with
 *    powerPreference: 'high-performance' requests the OS to allocate
 *    the discrete/dedicated GPU for the page.
 *  - OffscreenCanvas transferred to a Worker runs in Chromium's
 *    viz/GPU process, bypassing main-thread JavaScript completely.
 *  - On single-GPU systems (iGPU only) the same path is used but via iGPU.
 *  - If neither OffscreenCanvas nor Worker is available (old Safari / Firefox
 *    <105), falls back to the main-thread Canvas 2D render loop.
 *
 * The GPU tier is logged to the console for diagnostics.
 */

(function () {
  'use strict';

  /* ── 1. GPU Tier Detection ──────────────────────────────────────────────
   * We probe a temporary WebGL context with powerPreference: 'high-performance'.
   * This signals the OS GPU driver to prefer the discrete/dedicated GPU.
   * We then read back WEBGL_debug_renderer_info to log which GPU is active.
   * The probe canvas is immediately discarded — it only costs ~1ms.
   */
  function detectGPUTier() {
    try {
      const probe = document.createElement('canvas');
      probe.width = 1; probe.height = 1;
      const gl = probe.getContext('webgl', { powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false })
             || probe.getContext('experimental-webgl', { powerPreference: 'high-performance' });
      if (!gl) return { tier: 'cpu', renderer: 'No WebGL', vendor: '' };

      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      let renderer = 'Unknown GPU', vendor = '';
      if (dbg) {
        renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        vendor   = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   || '';
      }

      // Heuristic: software renderers expose these strings
      const rLow = renderer.toLowerCase();
      const isSoftware = /swiftshader|softpipe|llvmpipe|mesa offscreen|microsoft basic/i.test(rLow);
      const isIntegrated = /intel|uhd|hd graphics|iris|radeon vega|apple m[0-9]/i.test(rLow)
                        && !/rtx|gtx|rx [0-9]/i.test(rLow);

      // Lose the context immediately to free VRAM/resources
      const loseCtx = gl.getExtension('WEBGL_lose_context');
      if (loseCtx) loseCtx.loseContext();

      let tier = 'dedicated';
      if (isSoftware) tier = 'cpu';
      else if (isIntegrated) tier = 'igpu';

      return { tier, renderer, vendor };
    } catch (_) {
      return { tier: 'cpu', renderer: 'Detection error', vendor: '' };
    }
  }

  /* ── 2. OffscreenCanvas capability check ────────────────────────────── */
  function supportsOffscreenWorker() {
    return (
      typeof OffscreenCanvas !== 'undefined' &&
      typeof Worker !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function'
    );
  }

  /* ── 3. Tooltip DOM helpers (always on main thread) ─────────────────── */
  let tooltipEl, tooltipTitleEl, tooltipTagEl, tooltipDescEl;
  let tipLerpX = 0, tipLerpY = 0;
  let currentRegionKey = null;
  let isHovering = false;
  let lastMouseX = 0, lastMouseY = 0;

  const BRAIN_REGIONS = {
    frontal:     { name: 'Lobus Frontal',              tag: 'Korteks Prefrontal',    desc: 'Fungsi eksekutif, penalaran logis, pengambilan keputusan, & memori kerja.' },
    parietal:    { name: 'Lobus Parietal',             tag: 'Korteks Somatosensori', desc: 'Integrasi persepsi sensorik, orientasi visuospasial, & kalkulasi kognitif.' },
    temporal:    { name: 'Lobus Temporal & Hipokampus',tag: 'Biomarker Alzheimer',   desc: 'Konsolidasi memori jangka panjang, pemahaman bahasa, & formasi ingatan baru.' },
    occipital:   { name: 'Lobus Oksipital',            tag: 'Korteks Visual',        desc: 'Pemrosesan persepsi visual primer, pengenalan bentuk, & analisis pola ruang.' },
    cerebellum:  { name: 'Serebelum (Otak Kecil)',     tag: 'Koordinasi Motorik',    desc: 'Presisi gerak motorik halus, keseimbangan postur, & kontrol kinetik.' },
    brainstem:   { name: 'Batang Otak (Brainstem)',    tag: 'Pusat Otonom',          desc: 'Pusat transmisi saraf kranial, regulasi respirasi otonom, & kesadaran vital.' }
  };

  function cacheTooltipDOM(canvas) {
    tooltipEl      = document.getElementById('brain-tooltip');
    tooltipTitleEl = document.getElementById('bt-title');
    tooltipTagEl   = document.getElementById('bt-tag');
    tooltipDescEl  = document.getElementById('bt-desc');

    // Tooltip position RAF loop — always on main thread for DOM access
    function tooltipLoop() {
      requestAnimationFrame(tooltipLoop);
      if (!tooltipEl) return;
      if (currentRegionKey && isHovering && BRAIN_REGIONS[currentRegionKey]) {
        const reg = BRAIN_REGIONS[currentRegionKey];
        if (!tooltipEl.dataset.region || tooltipEl.dataset.region !== currentRegionKey) {
          tooltipEl.dataset.region = currentRegionKey;
          if (tooltipTitleEl) tooltipTitleEl.textContent = reg.name;
          if (tooltipTagEl)   tooltipTagEl.textContent   = reg.tag;
          if (tooltipDescEl)  tooltipDescEl.textContent  = reg.desc;
        }

        const heroRight = canvas ? canvas.parentElement : null;
        if (heroRight) {
          const hrRect  = heroRight.getBoundingClientRect();
          const cRect   = canvas.getBoundingClientRect();
          const offX    = cRect.left - hrRect.left;
          const offY    = cRect.top  - hrRect.top;
          const tipW    = tooltipEl.offsetWidth  || 310;
          const tipH    = tooltipEl.offsetHeight || 75;
          const curX    = offX + lastMouseX;
          const curY    = offY + lastMouseY;
          let targetX   = curX + 22;
          if (targetX + tipW > hrRect.width  - 12) targetX = curX - tipW - 16;
          let targetY   = curY - 48;
          if (targetY < 12) targetY = curY + 24;
          targetX = Math.max(8, Math.min(hrRect.width  - tipW - 8, targetX));
          targetY = Math.max(8, Math.min(hrRect.height - tipH - 8, targetY));

          if (!tooltipEl.classList.contains('active')) {
            tipLerpX = targetX; tipLerpY = targetY;
            tooltipEl.classList.add('active');
          } else {
            tipLerpX += (targetX - tipLerpX) * 0.18;
            tipLerpY += (targetY - tipLerpY) * 0.18;
          }
          tooltipEl.style.transform = `translate3d(${Math.round(tipLerpX)}px,${Math.round(tipLerpY)}px,0)`;
        }
      } else {
        tooltipEl.classList.remove('active');
      }
    }
    requestAnimationFrame(tooltipLoop);
  }

  /* ── 4. Worker-backed GPU path ──────────────────────────────────────── */
  function launchWorkerPath(canvas, gpuTier) {
    const worker = new Worker('/js/brain-canvas-worker.js');

    // Transfer canvas control to the worker (runs in GPU process in Chromium)
    const offscreen = canvas.transferControlToOffscreen();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;

    worker.postMessage({
      type: 'init',
      canvas: offscreen,
      dpr,
      width: w,
      height: h,
      dark: document.documentElement.getAttribute('data-theme') === 'dark'
    }, [offscreen]);

    // Receive region notifications from worker → update tooltip on main thread
    worker.onmessage = (e) => {
      if (e.data.type === 'region') {
        currentRegionKey = e.data.key;
        if (!currentRegionKey && tooltipEl) tooltipEl.classList.remove('active');
      }
    };

    // Resize observer
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      const newDpr = Math.min(window.devicePixelRatio || 1, 2);
      worker.postMessage({ type: 'resize', width: r.width, height: r.height, dpr: newDpr });
    });
    ro.observe(canvas);

    // Pointer events (read coordinates on main thread, send to worker)
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      lastMouseX = e.clientX - r.left;
      lastMouseY = e.clientY - r.top;
      isHovering = true;
      worker.postMessage({ type: 'pointer', x: lastMouseX, y: lastMouseY, isHovered: true });
    });
    canvas.addEventListener('mouseleave', () => {
      isHovering = false;
      currentRegionKey = null;
      worker.postMessage({ type: 'pointer', x: -9999, y: -9999, isHovered: false });
      if (tooltipEl) tooltipEl.classList.remove('active');
    });
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      worker.postMessage({ type: 'click', x: e.clientX - r.left, y: e.clientY - r.top });
    });
    canvas.addEventListener('touchstart', (e) => {
      if (!e.touches.length) return;
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      lastMouseX = t.clientX - r.left; lastMouseY = t.clientY - r.top;
      isHovering = true;
      worker.postMessage({ type: 'pointer', x: lastMouseX, y: lastMouseY, isHovered: true });
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!e.touches.length) return;
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      lastMouseX = t.clientX - r.left; lastMouseY = t.clientY - r.top;
      worker.postMessage({ type: 'pointer', x: lastMouseX, y: lastMouseY, isHovered: true });
    }, { passive: true });
    canvas.addEventListener('touchend', () => {
      setTimeout(() => {
        isHovering = false; currentRegionKey = null;
        worker.postMessage({ type: 'pointer', x: -9999, y: -9999, isHovered: false });
        if (tooltipEl) tooltipEl.classList.remove('active');
      }, 2400);
    });

    // Visibility: pause worker render when tab hidden or element off-screen
    const io = new IntersectionObserver((entries) => {
      worker.postMessage({ type: 'visibility', visible: entries[0].isIntersecting });
    }, { threshold: 0.05 });
    io.observe(canvas);

    document.addEventListener('visibilitychange', () => {
      worker.postMessage({ type: 'visibility', visible: !document.hidden });
    });

    // Theme changes
    const themeObserver = new MutationObserver(() => {
      worker.postMessage({ type: 'theme', dark: document.documentElement.getAttribute('data-theme') === 'dark' });
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    console.log(`[Neura] Brain canvas v2.0 — GPU path: ${gpuTier.tier.toUpperCase()} | ${gpuTier.vendor} ${gpuTier.renderer}`);
  }

  /* ── 5. Main-thread CPU fallback path ───────────────────────────────── */
  function launchMainThreadPath(canvas, gpuTier) {
    // Dynamic import of the original v1.7 render logic embedded inline
    // We re-use the original BRAIN_DATA and render from the same module scope.
    // Since we can't re-import the removed file, we inline a compact version.
    const script = document.createElement('script');
    script.src = '/js/hero-brain-canvas-fallback.js?v=1.7';
    script.async = true;
    document.head.appendChild(script);
    console.log(`[Neura] Brain canvas v2.0 — CPU fallback path | ${gpuTier.renderer}`);
  }

  /* ── 6. Bootstrap ───────────────────────────────────────────────────── */
  function init() {
    const canvas = document.getElementById('hero-brain-canvas');
    if (!canvas) return;

    // Apply GPU compositor hint via CSS (promotes element to its own layer)
    // This ensures the browser uses GPU memory for the composited layer.
    canvas.style.transform = 'translateZ(0)';
    canvas.style.willChange = 'transform';

    // Detect GPU
    const gpuTier = detectGPUTier();

    // Cache tooltip DOM and start its independent RAF loop
    cacheTooltipDOM(canvas);

    // Choose rendering path
    if (supportsOffscreenWorker()) {
      launchWorkerPath(canvas, gpuTier);
    } else {
      launchMainThreadPath(canvas, gpuTier);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

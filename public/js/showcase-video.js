/**
 * public/js/showcase-video.js  v1.1 (Optimized Performance)
 * ==========================================================
 * High-Performance Video Showcase Player
 * - Zero CPU/GPU idle: RAF loop sleeps automatically when not hovered or offscreen
 * - Just-in-Time Lazy Loading: Video stream only loads when approaching viewport (saves 4.6MB on load)
 * - Auto-pauses decoding when scrolled out of view or tab is hidden
 * - Fluid spring-damped magnetic cursor tracking (60/120 FPS)
 * - Full touch & mobile responsive support
 */

(function () {
  'use strict';

  function initShowcaseVideo() {
    const wrapEl = document.getElementById('showcase-video-wrap');
    const videoEl = document.getElementById('showcase-video');
    const pillEl = document.getElementById('video-cursor-pill');
    const iconEl = document.getElementById('vcp-icon');
    const textEl = document.getElementById('vcp-text');
    const progressFill = document.getElementById('video-progress-fill');
    const soundBtn = document.getElementById('video-sound-btn');

    if (!wrapEl || !videoEl || !pillEl) return;

    // Icons SVG templates (Enlarged)
    const PLAY_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>';
    const PAUSE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>';

    // Physics Lerp State
    let mouseX = -9999;
    let mouseY = -9999;
    let lerpX = -9999;
    let lerpY = -9999;
    let isHovered = false;
    let isPressing = false;
    let currentScale = 0.6;
    let targetScale = 0.6;
    let currentOpacity = 0;
    let targetOpacity = 0;
    let hasUserInteracted = false;
    let isIntersecting = false;
    let rafId = null;
    let videoLoaded = false;
    let lastProgressPct = -1;

    const isTouchDevice = () => window.matchMedia('(hover: none), (max-width: 768px)').matches;

    // ── 1. Just-in-Time Lazy Video Stream Loader ──
    function ensureVideoLoaded() {
      if (videoLoaded) return;
      const dataSrc = videoEl.getAttribute('data-src');
      if (dataSrc && !videoEl.src) {
        videoEl.src = dataSrc;
        videoEl.load();
      }
      videoLoaded = true;
    }

    // ── 2. On-Demand RAF Follower Loop (Zero Waste) ──
    function startFollowerLoop() {
      if (isTouchDevice()) return;
      if (!rafId) {
        rafId = requestAnimationFrame(renderFollower);
      }
    }

    function stopFollowerLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function renderFollower() {
      if (isTouchDevice()) {
        rafId = null;
        return;
      }

      if (isHovered && mouseX > -1000) {
        if (lerpX < -1000) {
          lerpX = mouseX;
          lerpY = mouseY;
        }
        lerpX += (mouseX - lerpX) * 0.16;
        lerpY += (mouseY - lerpY) * 0.16;

        const effectiveTargetScale = isPressing ? 0.88 : targetScale;
        currentScale += (effectiveTargetScale - currentScale) * 0.18;
        currentOpacity += (targetOpacity - currentOpacity) * 0.18;
      } else {
        currentScale += (0.6 - currentScale) * 0.15;
        currentOpacity += (0 - currentOpacity) * 0.15;
        // When completely faded, kill the RAF loop to save 100% CPU/GPU
        if (currentOpacity < 0.005) {
          currentOpacity = 0;
          lerpX = -9999;
          lerpY = -9999;
          pillEl.style.opacity = '0';
          rafId = null;
          return;
        }
      }

      pillEl.style.opacity = currentOpacity.toFixed(3);
      pillEl.style.transform = `translate3d(${lerpX.toFixed(1)}px, ${lerpY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${currentScale.toFixed(3)})`;

      rafId = requestAnimationFrame(renderFollower);
    }

    // ── 3. Pointer Listeners ──
    wrapEl.addEventListener('mouseenter', (e) => {
      if (isTouchDevice()) return;
      const rect = wrapEl.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      lerpX = mouseX;
      lerpY = mouseY;
      isHovered = true;
      targetScale = 1.0;
      targetOpacity = 1.0;
      startFollowerLoop();
    });

    wrapEl.addEventListener('mousemove', (e) => {
      if (isTouchDevice()) return;
      const rect = wrapEl.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      isHovered = true;
      targetScale = 1.0;
      targetOpacity = 1.0;
      startFollowerLoop();
    });

    wrapEl.addEventListener('mouseleave', () => {
      if (isTouchDevice()) return;
      isHovered = false;
      isPressing = false;
      targetOpacity = 0;
      targetScale = 0.6;
      // Let it fade out, renderFollower will stop itself once opacity hits 0
    });

    wrapEl.addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest('#video-sound-btn')) return;
      isPressing = true;
    });

    window.addEventListener('mouseup', () => {
      isPressing = false;
    });

    // ── 4. Playback Management ──
    function updatePillState() {
      if (videoEl.paused) {
        if (iconEl) iconEl.innerHTML = PLAY_SVG;
        if (textEl) textEl.textContent = hasUserInteracted ? 'Lanjutkan' : 'Putar intro';
        wrapEl.classList.remove('is-playing');
      } else {
        if (iconEl) iconEl.innerHTML = PAUSE_SVG;
        if (textEl) textEl.textContent = 'Jeda';
        wrapEl.classList.add('is-playing');
      }
    }

    function togglePlayPause() {
      ensureVideoLoaded();
      hasUserInteracted = true;
      if (videoEl.paused) {
        if (videoEl.muted) {
          videoEl.muted = false;
          updateSoundIcons(false);
        }
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
      updatePillState();
    }

    wrapEl.addEventListener('click', (e) => {
      if (e.target && e.target.closest('#video-sound-btn')) return;
      togglePlayPause();
    });

    videoEl.addEventListener('play', updatePillState);
    videoEl.addEventListener('pause', updatePillState);
    videoEl.addEventListener('ended', updatePillState);

    // Throttled progress bar updates (only write DOM when diff > 0.2%)
    videoEl.addEventListener('timeupdate', () => {
      if (!progressFill || !videoEl.duration) return;
      const pct = (videoEl.currentTime / videoEl.duration) * 100;
      if (Math.abs(pct - lastProgressPct) > 0.2) {
        lastProgressPct = pct;
        progressFill.style.width = pct.toFixed(1) + '%';
      }
    });

    // ── 5. Sound Controls ──
    function updateSoundIcons(isMuted) {
      if (!soundBtn) return;
      const mutedSvg = soundBtn.querySelector('.v-sound-muted');
      const unmutedSvg = soundBtn.querySelector('.v-sound-unmuted');
      if (mutedSvg) mutedSvg.style.display = isMuted ? 'block' : 'none';
      if (unmutedSvg) unmutedSvg.style.display = isMuted ? 'none' : 'block';
      soundBtn.setAttribute('title', isMuted ? 'Nyalakan Suara' : 'Bisukan Suara');
    }

    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ensureVideoLoaded();
        videoEl.muted = !videoEl.muted;
        updateSoundIcons(videoEl.muted);
      });
      updateSoundIcons(videoEl.muted);
    }

    // ── 6. IntersectionObserver (Lazy Load & Power Saver) ──
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isIntersecting = entry.isIntersecting;
          if (entry.isIntersecting) {
            ensureVideoLoaded();
            if (!hasUserInteracted && videoEl.paused) {
              videoEl.play().catch(() => {});
            }
          } else {
            // Free decoding thread when offscreen
            if (!videoEl.paused) {
              videoEl.pause();
            }
            stopFollowerLoop();
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: '250px 0px 250px 0px' // Preload 250px before entering screen
      });

      observer.observe(wrapEl);
    } else {
      ensureVideoLoaded();
    }

    // ── 7. Page Visibility Listener (Pause on Tab Switch) ──
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!videoEl.paused) videoEl.pause();
        stopFollowerLoop();
      } else {
        if (isIntersecting && !hasUserInteracted && videoEl.paused) {
          videoEl.play().catch(() => {});
        }
      }
    });

    updatePillState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShowcaseVideo);
  } else {
    initShowcaseVideo();
  }
})();

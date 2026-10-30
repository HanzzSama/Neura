/**
 * Global Smooth Scroll Manager (Lenis Antigravity Physics)
 * Automatically initializes and manages fluid momentum scrolling across all pages.
 */

(function () {
  'use strict';

  function initSmoothScroll() {
    if (typeof Lenis === 'undefined') {
      console.warn('Lenis library not found. Please include /js/lenis.min.js before smooth-scroll.js.');
      return;
    }

    // App layouts (.claude-layout, #chat-scroll-area) are single-page 100vh applications
    // with internal scroll containers. Window-level Lenis must NOT run here to prevent
    // hijacking wheel events from the chat scroll area.
    if (document.querySelector('.claude-layout') || document.getElementById('chat-scroll-area')) {
      const chatScrollArea = document.getElementById('chat-scroll-area');
      if (chatScrollArea && !chatScrollArea.hasAttribute('data-lenis-prevent')) {
        chatScrollArea.setAttribute('data-lenis-prevent', 'true');
      }
      return;
    }

    // Auto-mark internal scrollable containers with data-lenis-prevent
    const scrollContainers = [
      '#chat-scroll-area',
      '.chat-scroll-area',
      '#chat-messages',
      '.chat-messages',
      '.chat-log',
      '.sidebar',
      '.sidebar-body',
      '.sidebar-nav',
      '#chat-history-list',
      '.modal-content',
      '.modal-body',
      'textarea',
      '.code-content-wrapper',
      '#live-progress-container'
    ];

    scrollContainers.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.hasAttribute('data-lenis-prevent')) {
          el.setAttribute('data-lenis-prevent', 'true');
        }
      });
    });

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.8,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    window.lenis = lenis;

    // Global scroll helper
    window.smoothScrollTo = function (target, offset = -70) {
      if (!lenis) return;
      lenis.scrollTo(target, { offset });
    };

    // Smooth scroll for in-page anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
          const target = document.querySelector(targetId);
          if (target) {
            e.preventDefault();
            window.smoothScrollTo(target, -70);
          }
        }
      });
    });

    // -----------------------------------------------------------------------
    // Smooth Scroll-Reactive Header Navigation (Fluid Sticky Parallax)
    // -----------------------------------------------------------------------
    let lastScrollY = window.scrollY || 0;
    let isHeaderHidden = false;
    let upScrollDistance = 0;
    let downScrollDistance = 0;
    const SCROLLED_THRESHOLD_ON = 24;  // Elevation activates past 24px
    const SCROLLED_THRESHOLD_OFF = 8;  // Elevation deactivates when back near top
    const HEADER_HIDE_MIN_Y = 180;     // Don't auto-hide header in top hero area

    function updateHeaderParallax(currentScrollY, velocity = 0) {
      const headers = document.querySelectorAll('.site-header, .top-nav');
      if (!headers.length) return;

      const delta = currentScrollY - lastScrollY;

      // 1. Elevation & Scrolled glassmorphism with hysteresis (prevents flickering)
      if (currentScrollY > SCROLLED_THRESHOLD_ON) {
        headers.forEach(h => {
          if (!h.classList.contains('nav-scrolled')) {
            h.classList.add('nav-scrolled', 'is-fixed');
          }
        });
      } else if (currentScrollY <= SCROLLED_THRESHOLD_OFF) {
        headers.forEach(h => {
          if (h.classList.contains('nav-scrolled')) {
            h.classList.remove('nav-scrolled', 'is-fixed');
          }
        });
      }

      // 2. Near top of page: always keep header visible
      if (currentScrollY <= HEADER_HIDE_MIN_Y) {
        if (isHeaderHidden) {
          headers.forEach(h => {
            h.classList.remove('nav-hidden');
            h.classList.add('nav-visible');
          });
          document.body.classList.remove('nav-hidden');
          isHeaderHidden = false;
        }
        upScrollDistance = 0;
        downScrollDistance = 0;
        lastScrollY = currentScrollY;
        return;
      }

      // 3. Directional intent detection (past hero area)
      if (delta > 2.0 || velocity > 0.5) {
        // Scrolling DOWN -> Hide header with smooth distance accumulation
        downScrollDistance += Math.abs(delta);
        upScrollDistance = 0;

        if (downScrollDistance > 24) {
          if (!isHeaderHidden) {
            headers.forEach(h => {
              h.classList.add('nav-hidden');
              h.classList.remove('nav-visible');
            });
            document.body.classList.add('nav-hidden');
            isHeaderHidden = true;
          }
        }
      } else if (delta < -2.0 || velocity < -0.4) {
        // Scrolling UP -> Reveal header immediately with light touch
        upScrollDistance += Math.abs(delta);
        downScrollDistance = 0;

        if (upScrollDistance > 12) {
          if (isHeaderHidden) {
            headers.forEach(h => {
              h.classList.remove('nav-hidden');
              h.classList.add('nav-visible');
            });
            document.body.classList.remove('nav-hidden');
            isHeaderHidden = false;
          }
        }
      }

      lastScrollY = currentScrollY;
    }

    // Parallax dynamics for the fixed Dynamic Island
    function updateIslandParallax(currentScrollY, velocity) {
      const islandWrapper = document.querySelector('.dynamic-island-wrapper');
      if (!islandWrapper) return;

      // Inertial spring lag: subtle responsive dampening based on scroll speed
      const clampedVelocity = Math.max(-12, Math.min(12, velocity || 0));
      const parallaxY = clampedVelocity * 0.22; // Organic micro-travel
      const scale = Math.max(0.978, 1 - Math.min(0.022, Math.abs(clampedVelocity) * 0.002));

      islandWrapper.style.setProperty('--island-parallax-y', `${parallaxY.toFixed(2)}px`);
      islandWrapper.style.setProperty('--island-parallax-scale', `${scale.toFixed(3)}`);

      if (currentScrollY > 30) {
        islandWrapper.classList.add('island-scrolled');
      } else {
        islandWrapper.classList.remove('island-scrolled');
      }
    }

    // -----------------------------------------------------------------------
    // Cinematic Hero Parallax Scroller (Image Scale Down & Title Shift Left + Scale Down)
    // -----------------------------------------------------------------------
    const heroSectionEl = document.querySelector('.hero-section');
    function updateHeroParallax(currentScrollY, velocity = 0) {
      if (!heroSectionEl) return;

      const heroHeight = heroSectionEl.offsetHeight || window.innerHeight || 800;
      // Parallax active within hero scroll range (0 to ~85% of hero height)
      const maxScroll = Math.max(300, heroHeight * 0.85);
      const rawProgress = Math.max(0, Math.min(1, currentScrollY / maxScroll));

      // Ease curve: cubic ease-out for ultra fluid and responsive sensation
      const progress = 1 - Math.pow(1 - rawProgress, 2.4);

      const isMobile = window.innerWidth <= 1024;

      // Title: bergeser ke kiri dan scale down
      const titleShiftX = isMobile ? -(progress * 30) : -(progress * 85);
      const titleScale = 1 - (progress * (isMobile ? 0.12 : 0.18));
      const titleOpacity = Math.max(0.15, 1 - (progress * 0.72));

      // Subtitle & Actions: follow subtly
      const leadShiftX = titleShiftX * 0.45;
      const leadOpacity = Math.max(0.1, 1 - (progress * 0.85));

      const actionsShiftX = titleShiftX * 0.3;
      const actionsOpacity = Math.max(0, 1 - (progress * 0.95));

      const taglineOpacity = Math.max(0, 1 - (progress * 1.05));

      // Gambar: scale down seiring scrolling + subtle depth floating parallax
      const imgScale = 1 - (progress * (isMobile ? 0.16 : 0.22));
      const imgTy = progress * (isMobile ? 18 : 36);
      const imgOpacity = Math.max(0.35, 1 - (progress * 0.65));

      heroSectionEl.style.setProperty('--hero-title-tx', `${titleShiftX.toFixed(2)}px`);
      heroSectionEl.style.setProperty('--hero-title-scale', `${titleScale.toFixed(4)}`);
      heroSectionEl.style.setProperty('--hero-title-opacity', `${titleOpacity.toFixed(3)}`);

      heroSectionEl.style.setProperty('--hero-lead-tx', `${leadShiftX.toFixed(2)}px`);
      heroSectionEl.style.setProperty('--hero-lead-opacity', `${leadOpacity.toFixed(3)}`);

      heroSectionEl.style.setProperty('--hero-actions-tx', `${actionsShiftX.toFixed(2)}px`);
      heroSectionEl.style.setProperty('--hero-actions-opacity', `${actionsOpacity.toFixed(3)}`);

      heroSectionEl.style.setProperty('--hero-tagline-opacity', `${taglineOpacity.toFixed(3)}`);

      heroSectionEl.style.setProperty('--hero-img-scale', `${imgScale.toFixed(4)}`);
      heroSectionEl.style.setProperty('--hero-img-ty', `${imgTy.toFixed(2)}px`);
      heroSectionEl.style.setProperty('--hero-img-opacity', `${imgOpacity.toFixed(3)}`);
    }

    lenis.on('scroll', (e) => {
      updateHeaderParallax(e.scroll, e.velocity);
      updateIslandParallax(e.scroll, e.velocity);
      updateHeroParallax(e.scroll, e.velocity);
    });

    // Native fallback in case Lenis is bypassed
    let lastNativeScrollY = window.scrollY || 0;
    let lastNativeTime = performance.now();
    window.addEventListener('scroll', () => {
      if (!window.lenis || !window.lenis.isSmooth) {
        const curY = window.scrollY;
        const now = performance.now();
        const dt = Math.max(1, now - lastNativeTime);
        const estVelocity = ((curY - lastNativeScrollY) / dt) * 16;
        lastNativeScrollY = curY;
        lastNativeTime = now;
        updateHeaderParallax(curY, estVelocity);
        updateIslandParallax(curY, estVelocity);
        updateHeroParallax(curY, estVelocity);
      }
    }, { passive: true });

    // Initial position on load / reload
    updateHeroParallax(window.scrollY || 0, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmoothScroll);
  } else {
    initSmoothScroll();
  }
})();

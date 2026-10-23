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
    // Smooth Parallax & Kinetic Scroll-Reactive Header Navigation
    // -----------------------------------------------------------------------
    let lastScrollY = window.scrollY || 0;
    let isHeaderHidden = false;

    function updateHeaderParallax(currentScrollY, velocity = 0) {
      const headers = document.querySelectorAll('.site-header, .top-nav');
      if (!headers.length) return;

      // 1. Kinetic velocity dampening for smooth organic parallax travel
      // Velocity is positive scrolling DOWN, negative scrolling UP
      const clampedVelocity = Math.max(-16, Math.min(16, velocity || 0));
      const parallaxY = -(clampedVelocity * 0.38);
      const innerParallax = clampedVelocity * 0.22;
      const navScale = Math.max(0.984, 1 - Math.min(0.016, Math.abs(clampedVelocity) * 0.0012));

      headers.forEach(h => {
        h.style.setProperty('--nav-parallax-y', `${parallaxY.toFixed(2)}px`);
        h.style.setProperty('--nav-parallax-scale', `${navScale.toFixed(4)}`);
        h.style.setProperty('--nav-inner-parallax', `${innerParallax.toFixed(2)}px`);

        // Parallax elevation state (glassmorphism & compression)
        if (currentScrollY > 20) {
          h.classList.add('nav-scrolled');
        } else {
          h.classList.remove('nav-scrolled');
        }
      });

      // 2. Near top: always reveal relaxed header
      if (currentScrollY <= 20) {
        if (isHeaderHidden) {
          headers.forEach(h => {
            h.classList.remove('nav-hidden');
            h.classList.add('nav-visible');
          });
          document.body.classList.remove('nav-hidden');
          isHeaderHidden = false;
        }
        lastScrollY = currentScrollY;
        return;
      }

      // 3. Directional detection with smooth hysteresis
      const delta = currentScrollY - lastScrollY;

      // Filter micro-jitters (react cleanly to intentional scrolls)
      if (Math.abs(delta) > 5 || Math.abs(clampedVelocity) > 1.0) {
        if ((delta > 0 || clampedVelocity > 0.8) && currentScrollY > 60) {
          // Scrolling DOWN -> Glide header out with upward parallax momentum
          if (!isHeaderHidden) {
            headers.forEach(h => {
              h.classList.add('nav-hidden');
              h.classList.remove('nav-visible');
            });
            document.body.classList.add('nav-hidden');
            isHeaderHidden = true;
          }
        } else if (delta < 0 || clampedVelocity < -0.6) {
          // Scrolling UP -> Reveal header with floating parallax spring entry
          if (isHeaderHidden) {
            headers.forEach(h => {
              h.classList.remove('nav-hidden');
              h.classList.add('nav-visible');
            });
            document.body.classList.remove('nav-hidden');
            isHeaderHidden = false;
          }
        }
        lastScrollY = currentScrollY;
      }
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

    lenis.on('scroll', (e) => {
      updateHeaderParallax(e.scroll, e.velocity);
      updateIslandParallax(e.scroll, e.velocity);
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
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmoothScroll);
  } else {
    initSmoothScroll();
  }
})();

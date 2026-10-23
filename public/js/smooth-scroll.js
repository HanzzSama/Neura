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
    // Smart Scroll-Reactive Header (Auto-hide on Scroll Down, Reveal on Scroll Up)
    // -----------------------------------------------------------------------
    let lastScrollY = window.scrollY || 0;

    function handleScrollDirection(currentScrollY) {
      const headers = document.querySelectorAll('.site-header, .top-nav');

      if (currentScrollY <= 20) {
        // At or near top: always show
        headers.forEach(h => {
          h.classList.remove('nav-hidden');
          h.classList.add('nav-visible');
        });
        document.body.classList.remove('nav-hidden');
        lastScrollY = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY;

      // Filter out micro-scroll twitches (threshold 6px)
      if (Math.abs(delta) > 6) {
        if (delta > 0 && currentScrollY > 60) {
          // Scrolling DOWN -> Transform header up (Dynamic Island stays fixed!)
          headers.forEach(h => {
            h.classList.add('nav-hidden');
            h.classList.remove('nav-visible');
          });
          document.body.classList.add('nav-hidden');
        } else if (delta < 0) {
          // Scrolling UP -> Reveal header
          headers.forEach(h => {
            h.classList.remove('nav-hidden');
            h.classList.add('nav-visible');
          });
          document.body.classList.remove('nav-hidden');
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
      handleScrollDirection(e.scroll);
      updateIslandParallax(e.scroll, e.velocity);
    });

    // Native fallback in case Lenis is bypassed
    window.addEventListener('scroll', () => {
      if (!window.lenis || !window.lenis.isSmooth) {
        handleScrollDirection(window.scrollY);
        updateIslandParallax(window.scrollY, 0);
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmoothScroll);
  } else {
    initSmoothScroll();
  }
})();

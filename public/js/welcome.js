/**
 * Google Antigravity Welcome Page Interactions
 * Includes Antigravity particle simulation, bilingual support, and IDE interactions.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. Antigravity Particle Canvas Physics Simulation
  // -------------------------------------------------------------------------
  const canvas = document.getElementById('antigravity-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 120;
    
    // Google Accent Colors
    const colors = [
      '#1a73e8', // Google Blue
      '#ea4335', // Google Red
      '#fbbc04', // Google Yellow
      '#34a853', // Google Green
      '#4285f4', // Light Blue
      '#a142f4'  // Purple
    ];

    let mouse = {
      x: null,
      y: null,
      radius: 140
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    window.addEventListener('mouseleave', function () {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + 20 + Math.random() * 50;
        this.w = 5 + Math.random() * 8; // width of dash
        this.h = 2 + Math.random() * 4; // thickness
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.speedY = -(0.4 + Math.random() * 1.1); // float upwards (antigravity)
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.03;
        this.opacity = 0.5 + Math.random() * 0.5;
        this.baseSpeedY = this.speedY;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.015) * 0.3;
        this.rotation += this.rotSpeed;

        // Mouse avoidance (antigravity disturbance field)
        if (mouse.x !== null && mouse.y !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius) {
            const force = (1 - dist / mouse.radius) * 3;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * force;
            this.y += Math.sin(angle) * force;
          }
        }

        // Wrap around when reaching the top
        if (this.y < -30 || this.x < -40 || this.x > width + 40) {
          this.reset(false);
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 2);
        ctx.fill();
        ctx.restore();
      }
    }

    resize();
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      for (let p of particles) {
        p.update();
        p.draw();
      }
      requestAnimationFrame(animate);
    }

    animate();
  }

  // -------------------------------------------------------------------------
  // 2. Banner Dismissal
  // -------------------------------------------------------------------------
  const announcementClose = document.getElementById('announcement-close');
  const announcementBar = document.getElementById('announcement-bar');
  if (announcementClose && announcementBar) {
    announcementClose.addEventListener('click', function () {
      announcementBar.classList.add('hidden');
    });
  }

  // -------------------------------------------------------------------------
  // 3. IDE Tab Switching Demo
  // -------------------------------------------------------------------------
  const ideTabs = document.querySelectorAll('.editor-tab');
  const codeContent = document.getElementById('ide-code-content');

  const files = {
    'page.tsx': `
<span class="code-keyword">import</span> { useState } <span class="code-keyword">from</span> <span class="code-string">'react'</span>;
<span class="code-keyword">import</span> { SearchForm } <span class="code-keyword">from</span> <span class="code-string">'@/components/SearchForm'</span>;
<span class="code-keyword">import</span> { FlightResults } <span class="code-keyword">from</span> <span class="code-string">'@/components/FlightResults'</span>;
<span class="code-keyword">import</span> { Plane } <span class="code-keyword">from</span> <span class="code-string">'lucide-react'</span>;

<span class="code-keyword">export default function</span> <span class="code-fn">Home</span>() {
  <span class="code-keyword">const</span> [flights, setFlights] = <span class="code-fn">useState</span>([]);
  <span class="code-keyword">const</span> [isLoading, setIsLoading] = <span class="code-fn">useState</span>(<span class="code-prop">false</span>);

  <span class="code-keyword">const</span> <span class="code-fn">handleSearch</span> = <span class="code-keyword">async</span> (flightNumber: <span class="code-type">string</span>) => {
    <span class="code-prop">setIsLoading</span>(<span class="code-prop">true</span>);
    <span class="code-keyword">try</span> {
      <span class="code-keyword">const</span> response = <span class="code-keyword">await</span> <span class="code-fn">fetch</span>(<span class="code-string">\`/api/flights?flightNumber=\${flightNumber}\`</span>);
      <span class="code-keyword">const</span> data = <span class="code-keyword">await</span> response.<span class="code-fn">json</span>();
      <span class="code-fn">setFlights</span>(data);
    } <span class="code-keyword">finally</span> {
      <span class="code-fn">setIsLoading</span>(<span class="code-prop">false</span>);
    }
  };

  <span class="code-keyword">return</span> (
    <span class="code-string">&lt;div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8"&gt;</span>
      <span class="code-string">&lt;FlightTracker onSearch={handleSearch} /&gt;</span>
    <span class="code-string">&lt;/div&gt;</span>
  );
}`,
    'route.ts': `
<span class="code-keyword">import</span> { NextResponse } <span class="code-keyword">from</span> <span class="code-string">'next/server'</span>;

<span class="code-keyword">export async function</span> <span class="code-fn">GET</span>(request: <span class="code-type">Request</span>) {
  <span class="code-keyword">const</span> { searchParams } = <span class="code-keyword">new</span> <span class="code-fn">URL</span>(request.url);
  <span class="code-keyword">const</span> query = searchParams.<span class="code-fn">get</span>(<span class="code-string">'flightNumber'</span>);

  <span class="code-comment">// Query Antigravity Agent backend for real-time telemetry</span>
  <span class="code-keyword">const</span> status = <span class="code-keyword">await</span> agent.<span class="code-fn">fetchFlightCoordinates</span>(query);

  <span class="code-keyword">return</span> NextResponse.<span class="code-fn">json</span>({
    flight: query,
    altitude: <span class="code-string">'36,000 ft'</span>,
    velocity: <span class="code-string">'480 knots'</span>,
    eta: <span class="code-string">'14:30 UTC'</span>
  });
}`,
    'globals.css': `
<span class="code-comment">/* Global Theme Tokens */</span>
:root {
  <span class="code-prop">--theme-primary</span>: <span class="code-string">#1a73e8</span>;
  <span class="code-prop">--theme-surface</span>: <span class="code-string">#ffffff</span>;
  <span class="code-prop">--theme-on-surface</span>: <span class="code-string">#121316</span>;
  <span class="code-prop">--theme-radius</span>: <span class="code-string">24px</span>;
}

body {
  <span class="code-prop">font-family</span>: <span class="code-string">'Google Sans Flex'</span>, sans-serif;
  <span class="code-prop">background</span>: <span class="code-prop">var(--theme-surface)</span>;
}`
  };

  if (ideTabs.length && codeContent) {
    ideTabs.forEach(tab => {
      tab.addEventListener('click', function () {
        ideTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const filename = this.getAttribute('data-file');
        if (files[filename]) {
          codeContent.innerHTML = files[filename].trim();
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // 4. Bilingual Toggle (Indonesian / English)
  // -------------------------------------------------------------------------
  const langBtn = document.getElementById('lang-toggle-btn');
  let currentLang = 'ID';

  const translations = {
    ID: {
      nav_products: 'Produk',
      nav_usecases: 'Kasus Penggunaan',
      nav_pricing: 'Harga',
      nav_enterprise: 'Perusahaan',
      nav_resources: 'Sumber Daya',
      btn_download: 'Download',
      hero_headline: 'Melaju lebih cepat dengan platform agen generasi terbaru',
      hero_sub_btn: 'Buka Neura Workspace ➔',
      intro_btn: 'Putar intro ▶',
      statement: 'Google Antigravity adalah platform pengembangan berbasis agen kami, yang memungkinkan siapa saja membangun di era berbasis agen.',
      app_title: 'Antigravity App',
      app_desc: 'Pusat komando Anda untuk mengelola beberapa agen lokal secara paralel. Kelompokkan percakapan ke dalam Proyek, operasikan di berbagai ruang kerja, dan otomatiskan tugas rutin dengan pesan terjadwal.',
      ide_title: 'Antigravity IDE',
      ide_desc: 'IDE berbasis agen dengan fitur lengkap. Dilengkapi pengelola agen, artefak, dan pemahaman mendalam tentang codebase Anda.',
      sdk_title: 'Antigravity SDK',
      sdk_desc: 'Buat prototipe agen kustom yang memanfaatkan kerangka kerja Antigravity dengan kode minimal. Skrip Python sederhana untuk mengiterasi pada aplikasi berbasis agen, mengotomatiskan tugas rekayasa perangkat lunak, dan menjalankan evaluasi.',
      cli_title: 'Antigravity CLI',
      cli_desc: 'Antarmuka berbasis terminal yang ringan dan cepat untuk bekerja dengan agen Antigravity. Jalankan agen pemrograman otonom, eksekusi perintah shell secara langsung, dan kelola subagen latar belakang semuanya dari keyboard Anda.',
      blog_headline: 'Blog Terbaru',
      blog_see_all: 'Lihat blog',
      bottom_headline: 'Mulai melaju dengan Antigravity',
      bottom_sub: 'Unduh aplikasi desktop untuk macOS, Windows, dan Linux, atau mulai langsung di browser.'
    },
    EN: {
      nav_products: 'Products',
      nav_usecases: 'Use Cases',
      nav_pricing: 'Pricing',
      nav_enterprise: 'Enterprise',
      nav_resources: 'Resources',
      btn_download: 'Download',
      hero_headline: 'Experience liftoff with the next-gen agent platform',
      hero_sub_btn: 'Open Neura Workspace ➔',
      intro_btn: 'Play intro ▶',
      statement: 'Google Antigravity is our agent-first development platform, empowering anyone to build in the agentic era.',
      app_title: 'Antigravity App',
      app_desc: 'Your mission control for orchestrating multiple local agents in parallel. Group conversations into Projects, operate across multiple workspaces, and automate routine tasks with scheduled triggers.',
      ide_title: 'Antigravity IDE',
      ide_desc: 'The complete agent-first IDE. Equipped with agent manager, real-time artifacts, and deep contextual comprehension of your entire codebase.',
      sdk_title: 'Antigravity SDK',
      sdk_desc: 'Build custom agent prototypes leveraging the Antigravity framework with minimal code. Clean Python scripts to iterate on agentic apps, automate software engineering workflows, and run evaluations.',
      cli_title: 'Antigravity CLI',
      cli_desc: 'The lightweight, lightning-fast terminal surface to work with Antigravity agents. Launch autonomous coding agents, run live shell commands, and manage background subagents straight from your keyboard.',
      blog_headline: 'Latest from Blog',
      blog_see_all: 'View all posts',
      bottom_headline: 'Experience liftoff with Antigravity',
      bottom_sub: 'Download the desktop application for macOS, Windows, and Linux, or jump straight in via the browser.'
    }
  };

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      currentLang = currentLang === 'ID' ? 'EN' : 'ID';
      langBtn.innerHTML = `🌐 ${currentLang} <svg class="chevron" viewBox="0 0 24 24" width="16" height="16"><path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z"></path></svg>`;

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
          el.textContent = translations[currentLang][key];
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // 5. Play Intro Interaction
  // -------------------------------------------------------------------------
  const playIntroBtn = document.getElementById('play-intro-btn');
  if (playIntroBtn) {
    playIntroBtn.addEventListener('click', function () {
      alert('Selamat datang di Google Antigravity! Klik "Buka Neura Workspace" untuk langsung menggunakan sistem AI.');
    });
  }

  // -------------------------------------------------------------------------
  // 6. Stay in Sync (Newsletter & Updates Filter Interactions)
  // -------------------------------------------------------------------------
  window.toggleSyncPill = function (btn) {
    const container = document.getElementById('sync-pills');
    if (!container) return;

    const isAllUpdates = btn.textContent.trim().includes('All Updates');

    if (isAllUpdates) {
      container.querySelectorAll('.sync-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    } else {
      const allUpdatesBtn = container.querySelector('.sync-pill:first-child');
      if (allUpdatesBtn) allUpdatesBtn.classList.remove('active');
      btn.classList.toggle('active');

      const anyActive = container.querySelector('.sync-pill.active');
      if (!anyActive && allUpdatesBtn) {
        allUpdatesBtn.classList.add('active');
      }
    }
  };

  window.handleSyncSubscribe = function (e) {
    e.preventDefault();
    const input = document.getElementById('sync-email-field');
    const email = input ? input.value.trim() : '';

    if (!email) return;

    alert(`Terima kasih! Email (${email}) telah berhasil didaftarkan untuk menerima pembaruan Google Antigravity.`);
    if (input) input.value = '';
    const consent = document.getElementById('sync-consent-check');
    if (consent) consent.checked = false;
  };

  // -------------------------------------------------------------------------
  // 7. Celestial Orbit Particles Canvas for Download Card
  // -------------------------------------------------------------------------
  function initCtaStarsCanvas() {
    const canvas = document.getElementById('cta-stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
      createParticles();
    }

    function createParticles() {
      particles = [];
      const particleCount = Math.min(220, Math.floor(width * 0.16));
      const centerX = width * 0.72;
      const centerY = height * 0.5;

      const colors = [
        'rgba(96, 165, 250, ',  // Sky Blue
        'rgba(147, 197, 253, ', // Light Blue
        'rgba(56, 189, 248, ',  // Cyan
        'rgba(255, 255, 255, '  // Pure White
      ];

      for (let i = 0; i < particleCount; i++) {
        const dist = 30 + Math.pow(Math.random(), 0.8) * Math.min(width * 0.45, 420);
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.0006 + Math.random() * 0.0012) * (Math.random() < 0.5 ? 1 : -1);
        const radius = 1.0 + Math.random() * 2.2;
        const baseAlpha = 0.35 + Math.random() * 0.55;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const twinkleSpeed = 0.02 + Math.random() * 0.04;

        particles.push({
          dist,
          angle,
          speed,
          radius,
          baseAlpha,
          color,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed
        });
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.72;
      const centerY = height * 0.5;

      particles.forEach(p => {
        p.angle += p.speed;
        p.twinkle += p.twinkleSpeed;

        const alpha = Math.max(0.15, Math.min(1, p.baseAlpha + Math.sin(p.twinkle) * 0.25));
        const x = centerX + Math.cos(p.angle) * p.dist * 1.08;
        const y = centerY + Math.sin(p.angle) * p.dist * 0.88;

        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + alpha + ')';
        ctx.shadowColor = p.color + '0.8)';
        ctx.shadowBlur = p.radius > 2 ? 8 : 4;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCtaStarsCanvas);
  } else {
    initCtaStarsCanvas();
  }

  // -------------------------------------------------------------------------
  // 8. Blog Carousel Navigation
  // -------------------------------------------------------------------------
  window.scrollBlogCarousel = function (direction) {
    const track = document.getElementById('blog-carousel-track');
    if (!track) return;
    const scrollAmount = 309; // card 285px + 24px gap
    track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  };

})();

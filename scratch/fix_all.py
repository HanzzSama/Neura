import re

# ============================================================
# 1. Fix auth-hero.js: Add is-welcome-view toggle
# ============================================================
with open("public/js/auth-hero.js", "r", encoding="utf-8") as f:
    js = f.read()

old_switch = "function switchAuthView(viewName) {\r\n    currentMode = viewName;\r\n    hideAlert();\r\n    stopVerifyPolling();\r\n    stopWelcomeCountdown();\r\n    stopAdminOtpTimer();\r\n    isInOnboardingStep = (viewName === 'admin-verify');"

new_switch = """function switchAuthView(viewName) {
    currentMode = viewName;
    hideAlert();
    stopVerifyPolling();
    stopWelcomeCountdown();
    stopAdminOtpTimer();
    isInOnboardingStep = (viewName === 'admin-verify');

    // Toggle is-welcome-view class on main card for particle & centering CSS
    var mainCard = document.getElementById('neura-auth-main-card');
    if (mainCard) {
      if (viewName === 'welcome') {
        mainCard.classList.add('is-welcome-view');
      } else {
        mainCard.classList.remove('is-welcome-view');
      }
    }"""

# Normalize line endings for replacement
new_switch_crlf = new_switch.replace("\n", "\r\n")

if old_switch in js:
    js = js.replace(old_switch, new_switch_crlf, 1)
    print("[JS] Added is-welcome-view toggle to switchAuthView")
else:
    # Try without \r\n
    old_switch_lf = old_switch.replace("\r\n", "\n")
    if old_switch_lf in js:
        js = js.replace(old_switch_lf, new_switch, 1)
        print("[JS] Added is-welcome-view toggle (LF mode)")
    else:
        # Check if already added
        if 'is-welcome-view' in js:
            print("[JS] is-welcome-view toggle already present, skipping")
        else:
            print("[JS] WARNING: Could not find switchAuthView target!")

with open("public/js/auth-hero.js", "w", encoding="utf-8") as f:
    f.write(js)

# ============================================================
# 2. Update welcome.html: Add canvas + particle script
# ============================================================
with open("public/welcome.html", "r", encoding="utf-8") as f:
    html = f.read()

# 2a. Add canvas inside main card (if not already there)
if 'auth-card-particles' not in html:
    old_card = '<div class="neura-auth-main-card" id="neura-auth-main-card">'
    new_card = '<div class="neura-auth-main-card is-welcome-view" id="neura-auth-main-card">\r\n          <!-- Interactive Particle Canvas (Antigravity Dots Effect) -->\r\n          <canvas class="auth-card-particles" id="auth-card-particles"></canvas>'
    if old_card in html:
        html = html.replace(old_card, new_card, 1)
        print("[HTML] Added canvas element inside main card")
    else:
        print("[HTML] WARNING: Could not find main card div!")
else:
    print("[HTML] Canvas already present, skipping")

# 2b. Add particle script before </body> (if not already there)
if 'Antigravity Particle Dots Effect' not in html:
    particle_script = """
  <!-- Antigravity Particle Dots Effect (Welcome Card) -->
  <script>
  (function() {
    'use strict';
    var canvas, ctx, particles = [], mouseX = -999, mouseY = -999, raf;
    var PARTICLE_COUNT = 90;
    var MAX_RADIUS = 2.8;
    var MIN_RADIUS = 0.8;
    var MOUSE_RADIUS = 140;
    var CONNECT_DIST = 120;
    var BASE_SPEED = 0.35;

    function initParticles() {
      canvas = document.getElementById('auth-card-particles');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      resize();
      particles = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * BASE_SPEED,
          vy: (Math.random() - 0.5) * BASE_SPEED,
          r: MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS),
          alpha: 0.15 + Math.random() * 0.45
        });
      }
      canvas.addEventListener('mousemove', function(e) {
        var rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      });
      canvas.addEventListener('mouseleave', function() {
        mouseX = -999;
        mouseY = -999;
      });
      window.addEventListener('resize', resize);
      loop();
    }

    function resize() {
      if (!canvas) return;
      var card = canvas.parentElement;
      if (!card) return;
      canvas.width = card.offsetWidth;
      canvas.height = card.offsetHeight;
    }

    function loop() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Check if welcome pane is active
      var welcomePane = document.getElementById('pane-view-welcome');
      var isWelcome = welcomePane && welcomePane.classList.contains('active');

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        // Mouse repulsion
        var dx = p.x - mouseX;
        var dy = p.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          var force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          var angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * 0.8;
          p.vy += Math.sin(angle) * force * 0.8;
        }

        // Damping
        p.vx *= 0.985;
        p.vy *= 0.985;

        // Keep minimum speed
        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed < BASE_SPEED * 0.3) {
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy += (Math.random() - 0.5) * 0.05;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Draw particle (brighter on welcome pane)
        var drawAlpha = isWelcome ? p.alpha : p.alpha * 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + drawAlpha + ')';
        ctx.fill();
      }

      // Draw connections near mouse
      if (mouseX > 0 && mouseY > 0 && isWelcome) {
        for (var i = 0; i < particles.length; i++) {
          for (var j = i + 1; j < particles.length; j++) {
            var a = particles[i], b = particles[j];
            var ddx = a.x - b.x, ddy = a.y - b.y;
            var d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < CONNECT_DIST) {
              // Only draw lines near mouse
              var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              var md = Math.sqrt((mx - mouseX) * (mx - mouseX) + (my - mouseY) * (my - mouseY));
              if (md < MOUSE_RADIUS * 1.5) {
                var lineAlpha = (1 - d / CONNECT_DIST) * (1 - md / (MOUSE_RADIUS * 1.5)) * 0.25;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = 'rgba(217, 119, 87, ' + lineAlpha + ')';
                ctx.lineWidth = 0.6;
                ctx.stroke();
              }
            }
          }
        }
      }

      raf = requestAnimationFrame(loop);
    }

    // Observe card resize
    if (typeof ResizeObserver !== 'undefined') {
      document.addEventListener('DOMContentLoaded', function() {
        var card = document.getElementById('neura-auth-main-card');
        if (card) {
          new ResizeObserver(resize).observe(card);
        }
        initParticles();
      });
    } else {
      document.addEventListener('DOMContentLoaded', initParticles);
    }
  })();
  </script>
"""
    particle_script_crlf = particle_script.replace("\n", "\r\n")
    html = html.replace('</body>', particle_script_crlf + '</body>', 1)
    print("[HTML] Added particle dots script")
else:
    print("[HTML] Particle script already present, skipping")

# 2c. Bump cache-buster to ?v=72
html = html.replace('auth-hero.css?v=70', 'auth-hero.css?v=72')
html = html.replace('auth-hero.css?v=71', 'auth-hero.css?v=72')

with open("public/welcome.html", "w", encoding="utf-8") as f:
    f.write(html)
print("[HTML] Cache-buster updated to v=72")

# ============================================================
# 3. Update auth-hero.css: Add centering + canvas styles
# ============================================================
with open("public/css/auth-hero.css", "r", encoding="utf-8") as f:
    css = f.read()

if 'WELCOME PANE: Vertically Centered Text' not in css:
    center_css = """

/* --------------------------------------------------------------------------
   WELCOME PANE: Vertically Centered Text + Particle Canvas
   -------------------------------------------------------------------------- */
.neura-auth-main-card.is-welcome-view {
  justify-content: center !important;
}

.neura-auth-main-card.is-welcome-view .auth-card-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* Canvas overlay for particle dots */
.auth-card-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: auto;
  border-radius: inherit;
}

/* Ensure card content is above canvas */
.auth-top-pills,
.auth-card-header,
.auth-alert,
.auth-view-pane,
.auth-form {
  position: relative;
  z-index: 5;
}

/* Welcome spacer: vertically center the title block */
.welcome-view-spacer {
  height: 0 !important;
  min-height: 0 !important;
  display: none !important;
}
"""
    css += center_css
    print("[CSS] Added centering + canvas styles")
else:
    print("[CSS] Centering styles already present, skipping")

with open("public/css/auth-hero.css", "w", encoding="utf-8") as f:
    f.write(css)

print("\n=== All updates completed! ===")


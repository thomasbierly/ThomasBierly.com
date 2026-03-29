/* --- Nav background on scroll + dark section detection --- */
const nav = document.querySelector('nav');
const darkSections = document.querySelectorAll('.dark');
const navH = Math.round(nav.getBoundingClientRect().height);

/* --- Scroll reveal (bidirectional) --- */
const reveals = document.querySelectorAll('.reveal');

const exitTop = navH + 100; // px from viewport top where exit triggers

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target;
    if (entry.isIntersecting) {
      el.classList.add('visible');
      el.classList.remove('exit-top');
    } else {
      const { top, bottom } = entry.boundingClientRect;
      if (bottom < exitTop) {
        // Element has cleared the top zone — slide it off
        el.classList.add('exit-top');
        el.classList.remove('visible');
      } else if (top > window.innerHeight - 60) {
        // Element is clearly below the fold — reset for next entry
        el.classList.remove('visible');
        el.classList.remove('exit-top');
      }
      // Gray zone (between viewport top and nav margin): leave state unchanged
      // to avoid the translateY feedback loop that causes shaking
    }
  });
}, {
  threshold: 0,
  rootMargin: `-${exitTop}px 0px -60px 0px`
});

reveals.forEach(el => observer.observe(el));

function updateNav() {
  const scrollY = window.scrollY;

  // Add scrolled class after 50px
  if (scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }

  // Detect if nav overlaps a dark section
  const navBottom = nav.getBoundingClientRect().bottom;
  let onDark = false;

  darkSections.forEach(section => {
    const rect = section.getBoundingClientRect();
    if (rect.top < navBottom && rect.bottom > 0) {
      onDark = true;
    }
  });

  if (onDark) {
    nav.classList.add('on-dark');
  } else {
    nav.classList.remove('on-dark');
  }
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* --- Show nav name only after hero h1 scrolls behind the nav --- */
const heroH1 = document.querySelector('#hero h1');
if (heroH1) {
  const heroNameObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        nav.classList.remove('past-hero');
      } else {
        nav.classList.add('past-hero');
      }
    });
  }, {
    threshold: 0,
    rootMargin: `-${navH}px 0px 0px 0px`
  });
  heroNameObserver.observe(heroH1);
}

/* --- Hamburger / mobile menu --- */
const hamburger = document.querySelector('.nav-hamburger');
const mobileMenu = document.getElementById('mobile-menu');
const mobileOverlay = document.getElementById('mobile-overlay');

function openMenu() {
  hamburger.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
  mobileMenu.classList.add('open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  mobileOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileMenu.classList.remove('open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  mobileOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

if (hamburger) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.contains('open') ? closeMenu() : openMenu();
  });
}

if (mobileOverlay) {
  mobileOverlay.addEventListener('click', closeMenu);
}

// Close menu when a link is tapped
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', closeMenu);
});

/* --- Particle Network (top-right corner) --- */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    resize();
  });

  const w = () => canvas.offsetWidth;
  const h = () => canvas.offsetHeight;

  const particles = [];
  const scale = Math.max(1, (window.innerWidth * window.innerHeight) / (1280 * 800));
  const distScale = Math.max(1, Math.sqrt(scale));
  const count = Math.round(120 * scale);
  const connectionDist = 160 * distScale;
  const mouse = { x: null, y: null, radius: 200 * distScale };

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Only track if mouse is within the canvas bounds
    if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
      mouse.x = mx;
      mouse.y = my;
    } else {
      mouse.x = null;
      mouse.y = null;
    }
  });

  class Particle {
    constructor() {
      this.x = Math.random() * w();
      this.y = Math.random() * h();
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.radius = (Math.random() * 3 + 1.5) * distScale;
      this.alpha = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Soft edge repulsion
      const margin = 60;
      if (this.x < margin) this.vx += (margin - this.x) * 0.0008;
      if (this.x > w() - margin) this.vx -= (this.x - (w() - margin)) * 0.0008;
      if (this.y < margin) this.vy += (margin - this.y) * 0.0008;
      if (this.y > h() - margin) this.vy -= (this.y - (h() - margin)) * 0.0008;

      // Hard bounds
      if (this.x < 0) { this.x = 0; this.vx *= -1; }
      if (this.x > w()) { this.x = w(); this.vx *= -1; }
      if (this.y < 0) { this.y = 0; this.vy *= -1; }
      if (this.y > h()) { this.y = h(); this.vy *= -1; }

      // Mouse repulsion
      if (mouse.x !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.vx -= (dx / dist) * force * 0.015;
          this.vy -= (dy / dist) * force * 0.015;
        }
      }

      // Random drift
      if (Math.random() < 0.008) {
        this.vx += (Math.random() - 0.5) * 0.2;
        this.vy += (Math.random() - 0.5) * 0.2;
      }

      this.vx *= 0.998;
      this.vy *= 0.998;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(176, 141, 87, ${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < count; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, w(), h());

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDist) {
          const alpha = (1 - dist / connectionDist) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(176, 141, 87, ${alpha})`;
          ctx.lineWidth = 0.6 * distScale;
          ctx.stroke();
        }
      }
    }

    // Mouse glow connections
    if (mouse.x !== null) {
      particles.forEach(p => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.2;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(176, 141, 87, ${alpha})`;
          ctx.lineWidth = 0.4 * distScale;
          ctx.stroke();
        }
      });
    }

    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  animate();
})();

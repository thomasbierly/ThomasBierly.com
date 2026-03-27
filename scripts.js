/* ========================================
   PORTFOLIO — Animations & Interactivity
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMatrixRain();
  initParticleNetwork();
  initNavigation();
  initScrollAnimations();
  initSkillBars();
  initGlitchEffects();
});

/* --- Matrix Rain Background --- */
function initMatrixRain() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const chars = '0123456789ABCDEFabcdef<>/{}[]()=+*~@#$%^&|\\;:,.?!_-';
  const charArray = chars.split('');
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = new Array(columns).fill(1);

  function draw() {
    ctx.fillStyle = 'rgba(8, 10, 18, 0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#c8a44e';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = charArray[Math.floor(Math.random() * charArray.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 55);
}

/* --- Particle Network Background --- */
function initParticleNetwork() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const particleCount = Math.min(70, Math.floor(window.innerWidth / 22));
  const connectionDistance = 140;
  const mouse = { x: null, y: null, radius: 180 };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.radius = Math.random() * 1.8 + 0.5;
      this.baseAlpha = Math.random() * 0.4 + 0.08;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

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

      this.vx *= 0.999;
      this.vy *= 0.999;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 164, 78, ${this.baseAlpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          const alpha = (1 - dist / connectionDistance) * 0.1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(200, 164, 78, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

/* --- Navigation --- */
function initNavigation() {
  const nav = document.getElementById('main-nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('active');
      toggle.classList.toggle('active');
    });
  }

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        links.classList.remove('active');
      }
    });
  });

  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-links a');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.pageYOffset >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
        link.style.color = 'var(--accent-gold)';
      } else {
        link.style.color = '';
      }
    });
  });
}

/* --- Scroll Animations (Intersection Observer) --- */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  const animatedElements = document.querySelectorAll(
    '.section-header, .about-card, .research-intro, .research-publications, .project-card, .timeline-item, .cv-skills, .teaching-intro, .course-card'
  );

  animatedElements.forEach(el => observer.observe(el));
}

/* --- Skill Bars Animation --- */
function initSkillBars() {
  const skillFills = document.querySelectorAll('.skill-fill');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        const level = fill.getAttribute('data-level');
        fill.style.setProperty('--level', `${level}%`);
        fill.classList.add('animated');
        observer.unobserve(fill);
      }
    });
  }, { threshold: 0.5 });

  skillFills.forEach(fill => observer.observe(fill));
}

/* --- Subtle Glitch Effects --- */
function initGlitchEffects() {
  const glitchElements = document.querySelectorAll('.glitch');

  setInterval(() => {
    glitchElements.forEach(el => {
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = '';
    });
  }, 6000);

  const heroLines = document.querySelectorAll('.hero-line-1, .hero-line-2');
  setInterval(() => {
    heroLines.forEach(line => {
      if (Math.random() > 0.75) {
        line.style.textShadow = `
          ${Math.random() * 3 - 1.5}px ${Math.random() * 3 - 1.5}px 0 rgba(168, 50, 50, 0.5),
          ${Math.random() * 3 - 1.5}px ${Math.random() * 3 - 1.5}px 0 rgba(200, 164, 78, 0.5)
        `;
        setTimeout(() => {
          line.style.textShadow = '';
        }, 80);
      }
    });
  }, 4000);
}

/* --- Easter Egg: Konami Code --- */
(function() {
  const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  let konamiIndex = 0;

  document.addEventListener('keydown', (e) => {
    if (e.keyCode === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        document.body.style.transition = 'filter 0.5s';
        document.body.style.filter = 'hue-rotate(180deg)';
        setTimeout(() => {
          document.body.style.filter = '';
        }, 3000);
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });
})();

/* =====================================================
   CareerIQ AI — Premium JavaScript
   ===================================================== */

(function () {
  'use strict';

  // ======================================================
  // THEME MANAGER
  // ======================================================
  const ThemeManager = {
    init() {
      if (typeof CareerIQAuth !== 'undefined' && CareerIQAuth.Theme) return;
      const saved = localStorage.getItem('careeriq-theme') || 'dark';
      this.apply(saved);
      const btn = document.getElementById('themeToggle');
      if (btn) btn.addEventListener('click', () => this.toggle());
    },
    apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('careeriq-theme', theme);
    },
    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      this.apply(current === 'dark' ? 'light' : 'dark');
    }
  };

  // ======================================================
  // NAVBAR
  // ======================================================
  const Navbar = {
    init() {
      this.navbar = document.getElementById('navbar');
      this.hamburger = document.getElementById('hamburger');
      this.mobileMenu = document.getElementById('mobileMenu');
      this.mobileLinks = document.querySelectorAll('.mobile-link');

      if (!this.navbar || !this.hamburger || !this.mobileMenu) return;

      window.addEventListener('scroll', () => this.onScroll(), { passive: true });
      this.hamburger.addEventListener('click', () => this.toggleMenu());
      this.mobileLinks.forEach(link => link.addEventListener('click', () => this.closeMenu()));
      this.onScroll();
    },
    onScroll() {
      if (window.scrollY > 20) {
        this.navbar.classList.add('scrolled');
      } else {
        this.navbar.classList.remove('scrolled');
      }
    },
    toggleMenu() {
      const isOpen = this.mobileMenu.classList.toggle('open');
      this.hamburger.classList.toggle('open', isOpen);
      this.hamburger.setAttribute('aria-expanded', isOpen);
    },
    closeMenu() {
      this.mobileMenu.classList.remove('open');
      this.hamburger.classList.remove('open');
      this.hamburger.setAttribute('aria-expanded', false);
    }
  };

  // ======================================================
  // COUNTER ANIMATION
  // ======================================================
  const CounterAnimation = {
    init() {
      this.counters = document.querySelectorAll('.stat-number[data-target]');
      this.animated = false;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !this.animated) {
              this.animated = true;
              this.animate();
            }
          });
        },
        { threshold: 0.5 }
      );
      this.counters.forEach(counter => observer.observe(counter));
    },
    animate() {
      this.counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const start = performance.now();
        const step = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          counter.textContent = Math.floor(eased * target).toLocaleString();
          if (progress < 1) requestAnimationFrame(step);
          else counter.textContent = target.toLocaleString();
        };
        requestAnimationFrame(step);
      });
    }
  };

  // ======================================================
  // SCROLL ANIMATIONS (Intersection Observer)
  // ======================================================
  const ScrollAnimations = {
    init() {
      // Add animate class to elements
      const targets = [
        '.feature-card',
        '.step-item',
        '.testimonial-card',
        '.pricing-card',
        '.faq-item',
        '.section-header',
        '.trusted-section',
        '.cta-content'
      ];
      targets.forEach((selector, sIdx) => {
        document.querySelectorAll(selector).forEach((el, i) => {
          el.classList.add('animate-on-scroll');
          // Add delay classes for staggered effect
          const delayClass = `delay-${Math.min(i + 1, 5)}`;
          el.classList.add(delayClass);
        });
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
      );

      document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    }
  };

  // ======================================================
  // FAQ ACCORDION
  // ======================================================
  const FAQ = {
    init() {
      const items = document.querySelectorAll('.faq-item');
      items.forEach(item => {
        const btn = item.querySelector('.faq-question');
        btn.addEventListener('click', () => {
          const isOpen = item.classList.contains('open');
          // Close all
          items.forEach(i => {
            i.classList.remove('open');
            i.querySelector('.faq-question').setAttribute('aria-expanded', false);
          });
          // Toggle clicked
          if (!isOpen) {
            item.classList.add('open');
            btn.setAttribute('aria-expanded', true);
          }
        });
      });
    }
  };

  // ======================================================
  // PRICING TOGGLE
  // ======================================================
  const PricingToggle = {
    init() {
      this.toggle = document.getElementById('pricingToggle');
      if (!this.toggle) return; // no pricing section on this page
      this.isAnnual = false;
      this.prices = document.querySelectorAll('.price-amount');
      this.toggle.addEventListener('click', () => this.switch());
    },
    switch() {
      this.isAnnual = !this.isAnnual;
      this.toggle.classList.toggle('active', this.isAnnual);
      this.prices.forEach(price => {
        const target = this.isAnnual
          ? parseInt(price.getAttribute('data-annual'))
          : parseInt(price.getAttribute('data-monthly'));
        this.animatePrice(price, target);
      });
    },
    animatePrice(el, target) {
      const start = parseInt(el.textContent);
      const duration = 400;
      const startTime = performance.now();
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      };
      requestAnimationFrame(step);
    }
  };

  // ======================================================
  // SCROLL TO TOP
  // ======================================================
  const ScrollTop = {
    init() {
      this.btn = document.getElementById('scrollTop');
      if (!this.btn) return;
      window.addEventListener('scroll', () => {
        this.btn.classList.toggle('visible', window.scrollY > 400);
      }, { passive: true });
      this.btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };

  // ======================================================
  // PARTICLE SYSTEM (Hero Background)
  // ======================================================
  const Particles = {
    init() {
      const hero = document.querySelector('.hero');
      if (!hero) return;

      const canvas = document.createElement('canvas');
      canvas.id = 'particles';
      canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;';
      hero.querySelector('.hero-bg').appendChild(canvas);

      const ctx = canvas.getContext('2d');
      let particles = [];
      let animId;

      const resize = () => {
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;
      };

      const createParticle = () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        // use two rose-gold variants
        color: Math.random() > 0.5 ? '244,165,176' : '255,215,222'
      });

      const init = () => {
        resize();
        particles = Array.from({ length: 60 }, createParticle);
      };

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
          ctx.fill();

          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        });

        // Draw connections
        particles.forEach((a, i) => {
          particles.slice(i + 1).forEach(b => {
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 120) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              // read the live CSS variable for line colour
              const lineRgb = getComputedStyle(document.documentElement)
                .getPropertyValue('--particle-line-rgb').trim() || '244, 165, 176';
              ctx.strokeStyle = `rgba(${lineRgb}, ${0.08 * (1 - dist / 120)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });

        animId = requestAnimationFrame(draw);
      };

      init();
      draw();
      window.addEventListener('resize', () => { resize(); }, { passive: true });
    }
  };

  // ======================================================
  // TILT EFFECT on Feature Cards
  // ======================================================
  const TiltEffect = {
    init() {
      const cards = document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card');
      cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (e.clientX - cx) / (rect.width / 2);
          const dy = (e.clientY - cy) / (rect.height / 2);
          card.style.transform = `perspective(1000px) rotateX(${-dy * 4}deg) rotateY(${dx * 4}deg) translateZ(8px)`;
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = '';
          card.style.transition = 'transform 0.5s ease';
          setTimeout(() => { card.style.transition = ''; }, 500);
        });
      });
    }
  };

  // ======================================================
  // SMOOTH ACTIVE NAV LINK HIGHLIGHTING
  // ======================================================
  const ActiveNav = {
    init() {
      const sections = document.querySelectorAll('section[id]');
      const navLinks = document.querySelectorAll('.nav-link');

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              navLinks.forEach(link => {
                const href = link.getAttribute('href');
                link.style.color = href === `#${id}` ? 'var(--brand-light)' : '';
              });
            }
          });
        },
        { threshold: 0.4 }
      );

      sections.forEach(s => observer.observe(s));
    }
  };

  // ======================================================
  // HERO MOCKUP SKILL BAR ANIMATION
  // ======================================================
  const SkillBars = {
    init() {
      const bars = document.querySelectorAll('.skill-bar-fill');
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              bars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => { bar.style.width = width; }, 200);
              });
              observer.disconnect();
            }
          });
        },
        { threshold: 0.3 }
      );
      if (bars.length > 0) observer.observe(bars[0].closest('.mockup-window') || document.body);
    }
  };

  // ======================================================
  // TYPING EFFECT for hero headline accent
  // ======================================================
  const TypingEffect = {
    phrases: ['Ideal Career Path', 'Dream Job Match', 'Skill Roadmap', 'Career Potential'],
    current: 0,
    charIdx: 0,
    deleting: false,
    init() {
      this.el = document.querySelector('.hero-headline .gradient-text');
      if (!this.el) return;
      this.originalText = this.el.textContent;
      this.type();
    },
    type() {
      const phrase = this.phrases[this.current];
      if (this.deleting) {
        this.el.textContent = phrase.substring(0, this.charIdx - 1);
        this.charIdx--;
      } else {
        this.el.textContent = phrase.substring(0, this.charIdx + 1);
        this.charIdx++;
      }

      let delay = this.deleting ? 60 : 100;

      if (!this.deleting && this.charIdx === phrase.length) {
        delay = 2000;
        this.deleting = true;
      } else if (this.deleting && this.charIdx === 0) {
        this.deleting = false;
        this.current = (this.current + 1) % this.phrases.length;
        delay = 400;
      }

      setTimeout(() => this.type(), delay);
    }
  };

  // ======================================================
  // ROADMAP ANIMATION (Animated path drawing)
  // ======================================================
  const RoadmapAnimation = {
    init() {
      // Animate step numbers with stagger
      const steps = document.querySelectorAll('.step-item');
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
              }, i * 100);
            }
          });
        },
        { threshold: 0.2 }
      );
      steps.forEach(step => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(30px)';
        step.style.transition = 'all 0.6s cubic-bezier(0.4,0,0.2,1)';
        observer.observe(step);
      });
    }
  };

  // ======================================================
  // MOUSE SPOTLIGHT EFFECT
  // ======================================================
  const Spotlight = {
    init() {
      const hero = document.querySelector('.hero');
      if (!hero) return;

      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        hero.style.setProperty('--mouse-x', `${x}%`);
        hero.style.setProperty('--mouse-y', `${y}%`);
      });
    }
  };

  // ======================================================
  // ACTIVE SECTION PROGRESS BAR
  // ======================================================
  const ReadingProgress = {
    init() {
      const bar = document.createElement('div');
      bar.id = 'readingProgressBar';
      bar.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        height: 3px;
        background: var(--progress-bar-bg, linear-gradient(90deg, #c2185b, #ffd7de, #f4a5b0));
        z-index: 9999;
        width: 0%;
        transition: width 0.1s linear;
        box-shadow: 0 0 8px rgba(var(--progress-glow-rgb, 194, 24, 91), 0.6);
      `;
      document.body.appendChild(bar);

      // Keep glow in sync with theme changes
      const syncGlow = () => {
        const rgb = getComputedStyle(document.documentElement)
          .getPropertyValue('--progress-glow-rgb').trim() || '194, 24, 91';
        bar.style.boxShadow = `0 0 8px rgba(${rgb}, 0.6)`;
      };
      new MutationObserver(syncGlow).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const pct = Math.min((scrollTop / docHeight) * 100, 100);
        bar.style.width = `${pct}%`;
      }, { passive: true });
    }
  };

  // ======================================================
  // SMOOTH HOVER on Logo
  // ======================================================
  const LogoEffect = {
    init() {
      const logo = document.querySelector('.nav-logo');
      if (!logo) return;
      logo.addEventListener('mouseenter', () => {
        logo.style.transform = 'scale(1.05)';
        logo.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
      });
      logo.addEventListener('mouseleave', () => {
        logo.style.transform = 'scale(1)';
      });
    }
  };

  // ======================================================
  // TESTIMONIALS AUTO-SCROLL hint (mobile)
  // ======================================================
  const TestimonialsHint = {
    init() {
      // Nothing needed — CSS grid handles it
    }
  };

  // ======================================================
  // COPY TO CLIPBOARD for code snippets (if any)
  // ======================================================


  // ======================================================
  // FEATURE CARD INTERACTIVE GLOW
  // ======================================================
  const FeatureGlow = {
    init() {
      document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--glow-x', `${x}px`);
          card.style.setProperty('--glow-y', `${y}px`);
        });
      });
    }
  };

  // ======================================================
  // ANIMATE ROADMAP STEPS (how-it-works)
  // ======================================================
  const StepNumbers = {
    init() {
      const stepNumbers = document.querySelectorAll('.step-number');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-pop');
          }
        });
      }, { threshold: 0.5 });

      const style = document.createElement('style');
      style.textContent = `
        @keyframes popIn {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          80% { transform: scale(1.15) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .step-number.animate-pop { animation: popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }
      `;
      document.head.appendChild(style);
      stepNumbers.forEach(n => observer.observe(n));
    }
  };

  // ======================================================
  // PRICING HOVER GLOW
  // ======================================================
  const PricingGlow = {
    init() {
      document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
          card.style.boxShadow = getComputedStyle(document.documentElement)
            .getPropertyValue('--pricing-hover-shadow').trim() ||
            '0 20px 60px rgba(194, 24, 91, 0.18), 0 0 0 1px rgba(194, 24, 91, 0.25)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.boxShadow = '';
        });
      });
    }
  };

  // ======================================================
  // INITIALIZE ALL
  // ======================================================
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    Navbar.init();
    CounterAnimation.init();
    FAQ.init();
    PricingToggle.init();
    ScrollTop.init();
    Particles.init();
    TiltEffect.init();
    ActiveNav.init();
    SkillBars.init();
    TypingEffect.init();
    RoadmapAnimation.init();
    Spotlight.init();
    ReadingProgress.init();

    LogoEffect.init();
    FeatureGlow.init();
    StepNumbers.init();
    PricingGlow.init();

    // Scroll animations — run last so elements are in DOM
    setTimeout(() => ScrollAnimations.init(), 100);

    // Add subtle stagger to trusted logos
    document.querySelectorAll('.trusted-logo').forEach((logo, i) => {
      logo.style.animationDelay = `${i * 0.1}s`;
    });

    // Console easter egg
    console.log('%c🚀 CareerIQ AI', 'font-size:24px;font-weight:900;background:linear-gradient(135deg,#005ed0,#d9e2ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;');
    console.log('%cDiscover your ideal career path with AI 🎯', 'font-size:14px;color:#c5c6ca;');
  });

})();

/*
 * GURUKUL STUDY PORTAL — Motion Engine
 * Smooth, restrained iOS-style interactions.
 * Content/layout stay untouched; this file only controls motion.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia?.('(pointer: fine)');
  const supportsIO = 'IntersectionObserver' in window;

  const prefersReduced = () => reducedMotion?.matches === true;

  /* ---------- helpers ---------- */
  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        fn(...args);
      });
    };
  };

  const safeAdd = (el, className) => {
    if (el && !el.classList.contains(className)) el.classList.add(className);
  };

  /* ---------- page entrance ---------- */
  function pageEntrance() {
    safeAdd(body, 'motion-ready');

    if (prefersReduced()) {
      document.querySelectorAll('[data-reveal]').forEach(el => safeAdd(el, 'is-visible'));
      return;
    }

    const candidates = document.querySelectorAll(
      '[data-reveal], .subject-card, .study-strip, .guide-card, .person, .emblem, section'
    );

    candidates.forEach((el, index) => {
      if (el.dataset.motionBound === '1') return;
      el.dataset.motionBound = '1';
      if (!el.classList.contains('reveal') && !el.classList.contains('reveal-left') && !el.classList.contains('reveal-right')) {
        el.classList.add(index % 3 === 1 ? 'reveal-right' : index % 3 === 2 ? 'reveal-left' : 'reveal');
      }
    });

    const animated = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

    if (!supportsIO) {
      animated.forEach(el => safeAdd(el, 'is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        safeAdd(entry.target, 'is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -45px 0px' });

    animated.forEach(el => observer.observe(el));
  }

  /* ---------- glass topbar ---------- */
  function topbarMotion() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const update = rafThrottle(() => {
      topbar.classList.toggle('scrolled', window.scrollY > 18);
    });

    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------- gentle card tilt ---------- */
  function cardTilt() {
    if (prefersReduced() || !finePointer?.matches) return;

    const cards = document.querySelectorAll('.subject-card, .guide-card, .person');

    cards.forEach(card => {
      if (card.dataset.tiltBound === '1') return;
      card.dataset.tiltBound = '1';

      let frame = 0;

      const move = (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        const rotateX = Math.max(-3, Math.min(3, -y * 4));
        const rotateY = Math.max(-3, Math.min(3, x * 4));

        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          card.style.setProperty('--motion-x', `${(x * 8).toFixed(2)}px`);
          card.style.setProperty('--motion-y', `${(y * 8).toFixed(2)}px`);
          card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0,-5px,0)`;
        });
      };

      const reset = () => {
        cancelAnimationFrame(frame);
        card.style.transform = '';
        card.style.removeProperty('--motion-x');
        card.style.removeProperty('--motion-y');
      };

      card.addEventListener('pointermove', move, { passive: true });
      card.addEventListener('pointerleave', reset, { passive: true });
      card.addEventListener('pointercancel', reset, { passive: true });
    });
  }

  /* ---------- press feedback ---------- */
  function pressFeedback() {
    const interactive = document.querySelectorAll('button, .primary, .secondary, .nav a, .subject-card');

    interactive.forEach(el => {
      if (el.dataset.pressBound === '1') return;
      el.dataset.pressBound = '1';

      el.addEventListener('pointerdown', () => {
        if (!prefersReduced()) el.classList.add('is-pressed');
      }, { passive: true });

      const release = () => el.classList.remove('is-pressed');
      el.addEventListener('pointerup', release, { passive: true });
      el.addEventListener('pointercancel', release, { passive: true });
      el.addEventListener('pointerleave', release, { passive: true });
    });
  }

  /* ---------- magnetic-looking button hover, without cursor chasing ---------- */
  function buttonGlow() {
    if (prefersReduced() || !finePointer?.matches) return;

    document.querySelectorAll('.primary, .secondary, .login-btn').forEach(button => {
      if (button.dataset.glowBound === '1') return;
      button.dataset.glowBound = '1';

      button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        button.style.setProperty('--glow-x', `${x}%`);
        button.style.setProperty('--glow-y', `${y}%`);
      }, { passive: true });

      button.addEventListener('pointerleave', () => {
        button.style.removeProperty('--glow-x');
        button.style.removeProperty('--glow-y');
      }, { passive: true });
    });
  }

  /* ---------- smooth anchor navigation ---------- */
  function smoothAnchors() {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || prefersReduced()) return;

      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  }

  /* ---------- modal motion observer ---------- */
  function modalMotion() {
    const modal = document.querySelector('#password-modal');
    if (!modal) return;

    const observer = new MutationObserver(() => {
      const visible = getComputedStyle(modal).display !== 'none' && modal.getAttribute('aria-hidden') !== 'true';
      modal.classList.toggle('motion-open', visible);
    });

    observer.observe(modal, { attributes: true, attributeFilter: ['style', 'class', 'aria-hidden'] });
  }

  /* ---------- visibility-aware ambient motion ---------- */
  function pageVisibility() {
    document.addEventListener('visibilitychange', () => {
      root.classList.toggle('page-hidden', document.hidden);
    });
  }

  /* ---------- reduced-motion changes while page is open ---------- */
  function motionPreferenceWatcher() {
    if (!reducedMotion?.addEventListener) return;
    reducedMotion.addEventListener('change', () => {
      document.body.classList.toggle('motion-reduced', reducedMotion.matches);
      if (reducedMotion.matches) {
        document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => safeAdd(el, 'is-visible'));
      }
    });
  }

  function init() {
    pageEntrance();
    topbarMotion();
    cardTilt();
    pressFeedback();
    buttonGlow();
    smoothAnchors();
    modalMotion();
    pageVisibility();
    motionPreferenceWatcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

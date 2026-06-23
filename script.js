(function () {
  'use strict';

  function init() {
    document.body.classList.add('js-ready');

    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const header = document.querySelector('.site-header');
    const year = document.getElementById('year');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (year) year.textContent = new Date().getFullYear();

    function setMenu(open) {
      if (!navToggle || !navLinks) return;
      navLinks.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    }

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
      });

      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () { setMenu(false); });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') setMenu(false);
      });

      document.addEventListener('click', function (event) {
        if (!navLinks.classList.contains('open')) return;
        if (navLinks.contains(event.target) || navToggle.contains(event.target)) return;
        setMenu(false);
      });
    }

    function updateHeader() {
      if (header) header.classList.toggle('scrolled', window.scrollY > 8);
    }

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    const revealElements = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    const observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    revealElements.forEach(function (el, index) {
      el.style.transitionDelay = Math.min(index % 3, 2) * 45 + 'ms';
      observer.observe(el);
    });

    document.querySelectorAll('.faq-card').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        document.querySelectorAll('.faq-card').forEach(function (other) {
          if (other !== details) other.open = false;
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());


// Store Bot public status badge
(async () => {
  const badge = document.getElementById('homeStatusBadge');
  const label = document.getElementById('homeStatusText');
  if (!badge || !label) return;

  const labels = {
    operational: 'Operational',
    maintenance: 'Maintenance',
    degraded: 'Degraded',
    partial_outage: 'Partial Outage',
    major_outage: 'Major Outage',
    outage: 'Outage'
  };

  try {
    const response = await fetch('status.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const status = await response.json();
    const key = String(status.overall || 'degraded').toLowerCase().replace(/\s+/g, '_');
    badge.dataset.status = key;
    label.textContent = labels[key] || status.headline || 'View status';
  } catch {
    badge.dataset.status = 'degraded';
    label.textContent = 'Status unavailable';
  }
})();


// Store Bot nav dropdown cleanup
(() => {
  document.addEventListener('click', (event) => {
    document.querySelectorAll('.nav-dropdown[open]').forEach((dropdown) => {
      if (!dropdown.contains(event.target)) dropdown.open = false;
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.nav-dropdown[open]').forEach((dropdown) => { dropdown.open = false; });
  });
})();

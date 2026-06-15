(function () {
  'use strict';

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const header = document.querySelector('.site-header');
  const year = document.getElementById('year');
  const progressBar = document.getElementById('scrollProgressBar');
  const mouseGlow = document.getElementById('mouseGlow');
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
      link.addEventListener('click', function () {
        setMenu(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setMenu(false);
    });
  }

  function updateHeaderState() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  }

  function updateScrollProgress() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = Math.max(0, Math.min(100, progress)) + '%';
  }

  updateHeaderState();
  updateScrollProgress();

  window.addEventListener('scroll', function () {
    updateHeaderState();
    updateScrollProgress();
  }, { passive: true });

  const revealElements = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(function (element) {
      element.classList.add('visible');
    });
  } else {
    const revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -55px 0px' });

    revealElements.forEach(function (element, index) {
      element.style.transitionDelay = Math.min(index % 3, 2) * 80 + 'ms';
      revealObserver.observe(element);
    });
  }

  const sectionIds = ['features', 'autopay', 'pricing', 'setup', 'faq'];
  const navItems = sectionIds.map(function (id) {
    return {
      section: document.getElementById(id),
      link: document.querySelector('.nav-links a[href="#' + id + '"]')
    };
  }).filter(function (item) {
    return item.section && item.link;
  });

  if ('IntersectionObserver' in window && navItems.length) {
    const activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const item = navItems.find(function (navItem) {
          return navItem.section === entry.target;
        });
        if (!item || !entry.isIntersecting) return;

        navItems.forEach(function (navItem) {
          navItem.link.classList.remove('active');
        });
        item.link.classList.add('active');
      });
    }, { threshold: 0.25 });

    navItems.forEach(function (item) {
      activeObserver.observe(item.section);
    });
  }

  if (!reduceMotion && mouseGlow) {
    let ticking = false;
    let latestX = window.innerWidth / 2;
    let latestY = window.innerHeight / 5;

    function renderMouseGlow() {
      document.documentElement.style.setProperty('--mouse-x', latestX + 'px');
      document.documentElement.style.setProperty('--mouse-y', latestY + 'px');
      document.body.classList.add('has-pointer');
      ticking = false;
    }

    window.addEventListener('pointermove', function (event) {
      latestX = event.clientX;
      latestY = event.clientY;

      if (!ticking) {
        window.requestAnimationFrame(renderMouseGlow);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      document.body.classList.remove('has-pointer');
    });
  }
}());

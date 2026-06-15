const navToggle = document.querySelector('#navToggle');
const navLinks = document.querySelector('#navLinks');
const header = document.querySelector('.site-header');
const year = document.querySelector('#year');
const progressBar = document.querySelector('#scrollProgressBar');
const spotlight = document.querySelector('#spotlight');
const heroVisual = document.querySelector('#heroVisual');

if (year) year.textContent = new Date().getFullYear();

function setMenu(open) {
  if (!navToggle || !navLinks) return;
  navLinks.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
}

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    setMenu(!isOpen);
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
}

function updateHeaderState() {
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 8);
}

function updateScrollProgress() {
  if (!progressBar) return;
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
  progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

updateHeaderState();
updateScrollProgress();
window.addEventListener('scroll', () => {
  updateHeaderState();
  updateScrollProgress();
}, { passive: true });

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealElements = document.querySelectorAll('.reveal');

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 3, 2) * 90}ms`;
    revealObserver.observe(element);
  });
}

const sectionIds = ['features', 'autopay', 'pricing', 'setup', 'faq'];
const navItems = sectionIds
  .map((id) => ({ section: document.getElementById(id), link: document.querySelector(`.nav-links a[href="#${id}"]`) }))
  .filter((item) => item.section && item.link);

if ('IntersectionObserver' in window && navItems.length) {
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const item = navItems.find((navItem) => navItem.section === entry.target);
      if (!item) return;
      if (entry.isIntersecting) {
        navItems.forEach((navItem) => navItem.link.classList.remove('active'));
        item.link.classList.add('active');
      }
    });
  }, { threshold: 0.32 });

  navItems.forEach((item) => activeObserver.observe(item.section));
}

const statElements = document.querySelectorAll('[data-count]');

function animateCount(el) {
  const target = Number(el.dataset.count || 0);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1000;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    el.textContent = `${prefix}${value}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

if (!reduceMotion && 'IntersectionObserver' in window) {
  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  statElements.forEach((el) => countObserver.observe(el));
} else {
  statElements.forEach((el) => {
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    el.textContent = `${prefix}${el.dataset.count}${suffix}`;
  });
}

if (!reduceMotion && spotlight) {
  window.addEventListener('pointermove', (event) => {
    const x = `${(event.clientX / window.innerWidth) * 100}%`;
    const y = `${(event.clientY / window.innerHeight) * 100}%`;
    spotlight.style.setProperty('--spot-x', x);
    spotlight.style.setProperty('--spot-y', y);
  }, { passive: true });
}

const tiltCards = document.querySelectorAll('.tilt-card');

if (!reduceMotion) {
  tiltCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 10;
      const rotateX = (0.5 - py) * 10;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

if (!reduceMotion && heroVisual) {
  heroVisual.addEventListener('pointermove', (event) => {
    const rect = heroVisual.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    heroVisual.style.transform = `translate3d(${(px - 0.5) * 10}px, ${(py - 0.5) * 6}px, 0)`;
  });

  heroVisual.addEventListener('pointerleave', () => {
    heroVisual.style.transform = '';
  });
}

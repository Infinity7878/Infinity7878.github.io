const navToggle = document.querySelector('#navToggle');
const navLinks = document.querySelector('#navLinks');
const header = document.querySelector('.site-header');
const year = document.querySelector('#year');

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

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

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

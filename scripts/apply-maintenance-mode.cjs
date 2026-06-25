#!/usr/bin/env node
/*
  Store Bot website maintenance mode patch
  Run from the repo root:
    node scripts/apply-maintenance-mode.cjs
*/

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const scriptsDir = path.join(root, 'scripts');
const stylesPath = path.join(root, 'styles.css');
const configPath = path.join(root, 'maintenance-config.js');
const runtimePath = path.join(root, 'maintenance.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, contents) {
  fs.writeFileSync(file, contents.replace(/\r\n/g, '\n'), 'utf8');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'scripts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.html$/i.test(entry.name)) out.push(full);
  }
  return out;
}

ensureDir(scriptsDir);

const maintenanceConfig = String.raw`/*
  Store Bot maintenance settings

  How to use:
  1. Edit this file.
  2. Commit and push to GitHub Pages.
  3. Set enabled back to false when the work is done.

  Path examples:
    /index.html
    /pricing.html
    /autopay.html
    /dashboard.html

  Owner preview bypass:
    Add ?maintenance_bypass=change-this-token to the page URL.
    Change the token below before using this publicly.
*/

window.STOREBOT_MAINTENANCE = {
  // Turns the entire website into a maintenance page.
  site: {
    enabled: false,
    title: 'Store Bot is under maintenance',
    reason: 'We are updating the site right now. Please check back soon.',
    expectedBack: '',
    contactUrl: 'https://discord.gg/zB7NgPBzBA',
    contactLabel: 'Join the support server'
  },

  // Turns specific pages into maintenance pages.
  pages: {
    // '/pricing.html': {
    //   enabled: true,
    //   title: 'Pricing is being updated',
    //   reason: 'We are updating Premium checkout and billing information.',
    //   expectedBack: 'Later today'
    // },

    // '/dashboard.html': {
    //   enabled: true,
    //   title: 'Dashboard maintenance',
    //   reason: 'We are updating the Premium management dashboard.',
    //   expectedBack: 'A few minutes'
    // }
  },

  // Replaces only specific sections on a page with a maintenance card.
  sections: {
    // '/index.html': [
    //   {
    //     enabled: true,
    //     selector: '#pricing',
    //     title: 'Pricing section under maintenance',
    //     reason: 'We are updating the Premium offer details.'
    //   }
    // ]
  },

  // Optional owner-only preview bypass for checking the real page during maintenance.
  bypass: {
    enabled: true,
    queryParam: 'maintenance_bypass',
    token: 'change-this-token'
  }
};
`;

const maintenanceRuntime = String.raw`(function () {
  'use strict';

  var config = window.STOREBOT_MAINTENANCE || {};
  var activeFullMode = getFullMaintenance();

  if (activeFullMode && !isBypassed()) {
    document.documentElement.classList.add('maintenance-pending');
  }

  function normalizePath(value) {
    var path = String(value || '/').split('?')[0].split('#')[0];
    path = path.replace(/\\/g, '/');
    if (!path || path === '/') return '/index.html';
    if (path.charAt(0) !== '/') path = '/' + path;
    if (path.endsWith('/')) return path + 'index.html';
    return path;
  }

  function currentPath() {
    var path = normalizePath(window.location.pathname);
    var parts = path.split('/');
    var file = parts[parts.length - 1] || 'index.html';
    if (file.indexOf('.') === -1) return path + '.html';
    return path;
  }

  function isEnabled(item) {
    return !!(item && item.enabled === true);
  }

  function isBypassed() {
    var bypass = config.bypass || {};
    if (!bypass.enabled || !bypass.queryParam || !bypass.token || bypass.token === 'change-this-token') return false;
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get(bypass.queryParam) === bypass.token;
    } catch (error) {
      return false;
    }
  }

  function getPageRule() {
    var pages = config.pages || {};
    var path = currentPath();
    return pages[path] || pages[path.replace('/index.html', '/')] || null;
  }

  function getFullMaintenance() {
    if (isEnabled(config.site)) return config.site;
    var pageRule = getPageRule();
    if (isEnabled(pageRule)) return pageRule;
    return null;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderFullMaintenance(rule) {
    var title = rule.title || 'This page is under maintenance';
    var reason = rule.reason || 'We are working on this page right now. Please check back soon.';
    var expectedBack = rule.expectedBack || '';
    var contactUrl = rule.contactUrl || (config.site && config.site.contactUrl) || '';
    var contactLabel = rule.contactLabel || (config.site && config.site.contactLabel) || 'Contact support';

    document.title = title + ' | Store Bot';

    var robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');

    var contactButton = contactUrl
      ? '<a class="button primary" href="' + escapeHtml(contactUrl) + '">' + escapeHtml(contactLabel) + '</a>'
      : '';
    var etaLine = expectedBack
      ? '<p class="maintenance-eta"><strong>Expected back:</strong> ' + escapeHtml(expectedBack) + '</p>'
      : '';

    document.body.className = 'maintenance-page';
    document.body.innerHTML =
      '<main class="maintenance-screen" role="main" aria-labelledby="maintenanceTitle">' +
        '<section class="maintenance-card">' +
          '<div class="maintenance-mark" aria-hidden="true">SB</div>' +
          '<p class="eyebrow">Temporary maintenance</p>' +
          '<h1 id="maintenanceTitle">' + escapeHtml(title) + '</h1>' +
          '<p class="maintenance-reason">' + escapeHtml(reason) + '</p>' +
          etaLine +
          '<div class="maintenance-actions">' +
            contactButton +
            '<button class="button secondary" type="button" onclick="window.location.reload()">Refresh page</button>' +
          '</div>' +
        '</section>' +
      '</main>';

    document.documentElement.classList.remove('maintenance-pending');
    document.documentElement.classList.add('maintenance-rendered');
  }

  function renderSectionMaintenance(item) {
    if (!item || item.enabled !== true || !item.selector) return;
    var target = document.querySelector(item.selector);
    if (!target) return;

    var title = item.title || 'This section is under maintenance';
    var reason = item.reason || 'We are updating this part of the site right now.';
    var expectedBack = item.expectedBack || '';

    target.classList.add('section-maintenance-wrapper');
    target.innerHTML =
      '<div class="container">' +
        '<div class="section-maintenance-card">' +
          '<p class="eyebrow">Temporary maintenance</p>' +
          '<h2>' + escapeHtml(title) + '</h2>' +
          '<p>' + escapeHtml(reason) + '</p>' +
          (expectedBack ? '<p><strong>Expected back:</strong> ' + escapeHtml(expectedBack) + '</p>' : '') +
        '</div>' +
      '</div>';
  }

  function renderSections() {
    if (isBypassed()) return;
    var allSections = config.sections || {};
    var pageSections = allSections[currentPath()] || allSections[currentPath().replace('/index.html', '/')] || [];
    if (!Array.isArray(pageSections)) return;
    pageSections.forEach(renderSectionMaintenance);
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    if (activeFullMode && !isBypassed()) {
      renderFullMaintenance(activeFullMode);
      return;
    }
    renderSections();
  });
}());
`;

const maintenanceCss = String.raw`

/* Maintenance mode */
html.maintenance-pending body {
  visibility: hidden;
}

.maintenance-page {
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.22), transparent 34rem),
    linear-gradient(135deg, #0f172a 0%, #111827 52%, #1f2937 100%);
  color: #f8fafc;
}

.maintenance-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(1.25rem, 5vw, 3rem);
}

.maintenance-card,
.section-maintenance-card {
  width: min(100%, 720px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 28px;
  background: rgba(15, 23, 42, 0.82);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.34);
  padding: clamp(1.5rem, 5vw, 3rem);
}

.maintenance-card {
  text-align: left;
}

.maintenance-mark {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  margin-bottom: 1rem;
  background: rgba(249, 115, 22, 0.18);
  border: 1px solid rgba(249, 115, 22, 0.35);
  color: #fed7aa;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.maintenance-card h1,
.section-maintenance-card h2 {
  margin: 0.35rem 0 0.8rem;
  max-width: 680px;
}

.maintenance-reason,
.maintenance-eta,
.section-maintenance-card p {
  color: rgba(248, 250, 252, 0.78);
  line-height: 1.7;
  max-width: 62ch;
}

.maintenance-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 1.4rem;
}

.section-maintenance-wrapper {
  padding: 4rem 0;
}

.section-maintenance-card {
  margin-inline: auto;
}
`;

write(configPath, maintenanceConfig);
write(runtimePath, maintenanceRuntime);

if (fs.existsSync(stylesPath)) {
  let styles = read(stylesPath);
  styles = styles.replace(/\/\* Maintenance mode \*\/[\s\S]*$/m, '').trimEnd();
  styles += maintenanceCss;
  write(stylesPath, styles + '\n');
} else {
  write(stylesPath, maintenanceCss.trimStart());
}

const htmlFiles = walk(root);
let patchedHtml = 0;

for (const file of htmlFiles) {
  let html = read(file);
  const relDir = path.relative(path.dirname(file), root).replace(/\\/g, '/');
  const prefix = relDir && relDir !== '.' ? relDir + '/' : '';
  const configSrc = prefix + 'maintenance-config.js?v=1';
  const runtimeSrc = prefix + 'maintenance.js?v=1';
  const tags = '  <script src="' + configSrc + '"></script>\n  <script src="' + runtimeSrc + '"></script>';

  html = html
    .replace(/\s*<script\s+src=["'][^"']*maintenance-config\.js(?:\?[^"']*)?["']\s*><\/script>/gi, '')
    .replace(/\s*<script\s+src=["'][^"']*maintenance\.js(?:\?[^"']*)?["']\s*><\/script>/gi, '');

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, tags + '\n</head>');
    write(file, html);
    patchedHtml += 1;
  }
}

console.log('Maintenance mode patch applied.');
console.log('Created/updated maintenance-config.js and maintenance.js.');
console.log('Updated styles.css and ' + patchedHtml + ' HTML file(s).');
console.log('Edit maintenance-config.js to turn on whole-site, page, or section maintenance.');

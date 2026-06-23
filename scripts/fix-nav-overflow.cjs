#!/usr/bin/env node
/*
  Store Bot nav overflow fix
  - Replaces the crowded top nav with a shorter nav + More dropdown
  - Adds CSS so nav items do not wrap on desktop
  - Keeps mobile hamburger behavior intact
  - Creates .bak backups before editing files
*/

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const backupSuffix = `.navfix-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;

const defaultInvite = 'https://discord.com/oauth2/authorize?client_id=1515919161690161224&permissions=2147483648&integration_type=0&scope=bot+applications.commands';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeWithBackup(file, next) {
  const current = read(file);
  if (current === next) return false;
  fs.writeFileSync(file + backupSuffix, current);
  fs.writeFileSync(file, next);
  return true;
}

function getRootHtmlFiles() {
  return fs.readdirSync(root)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(root, name));
}

function getInviteHref(navHtml) {
  const ctaMatch = navHtml.match(/<a\b[^>]*class=["'][^"']*\bnav-cta\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (ctaMatch) return ctaMatch[1];

  const discordMatch = navHtml.match(/href=["'](https:\/\/discord\.com\/oauth2\/authorize[^"']+)["']/i);
  if (discordMatch) return discordMatch[1];

  return defaultInvite;
}

function normalizeCurrentPage(file) {
  const base = path.basename(file);
  if (base === 'index.html') return 'index.html';
  return base;
}

function navFor(file, oldNav) {
  const inviteHref = getInviteHref(oldNav || '');
  const current = normalizeCurrentPage(file);

  const links = [
    ['features.html', 'Features'],
    ['autopay.html', 'AutoPay'],
    ['pricing.html', 'Pricing'],
    ['shop.html', 'Shop Pages'],
    ['reputation.html', 'Reputation'],
    ['docs.html', 'Docs'],
  ];

  const moreLinks = [
    ['status.html', 'Status'],
    ['patch-notes.html', 'Patch Notes'],
    ['dashboard.html', 'Dashboard'],
    ['index.html#setup', 'Setup'],
    ['index.html#faq', 'FAQ'],
  ];

  const active = (href) => {
    const hrefPage = href.split('#')[0] || 'index.html';
    return hrefPage === current ? ' class="active"' : '';
  };

  const moreActive = moreLinks.some(([href]) => (href.split('#')[0] || 'index.html') === current);

  return `<nav class="nav-links" id="site-nav" aria-label="Main navigation">
        ${links.map(([href, label]) => `<a href="${href}"${active(href)}>${label}</a>`).join('\n        ')}
        <details class="nav-dropdown"${moreActive ? ' open' : ''}>
          <summary>More</summary>
          <div class="nav-dropdown-menu">
            ${moreLinks.map(([href, label]) => `<a href="${href}"${active(href)}>${label}</a>`).join('\n            ')}
          </div>
        </details>
        <a class="nav-cta" href="${inviteHref}" target="_blank" rel="noreferrer">Invite Bot</a>
      </nav>`;
}

function fixHtml(file) {
  const html = read(file);
  const navRegex = /<nav\b[^>]*class=["'][^"']*\bnav-links\b[^"']*["'][^>]*>[\s\S]*?<\/nav>/i;
  const match = html.match(navRegex);
  if (!match) return false;

  const next = html.replace(navRegex, navFor(file, match[0]));
  return writeWithBackup(file, next);
}

function appendCssFix() {
  const cssPath = path.join(root, 'styles.css');
  if (!fs.existsSync(cssPath)) {
    console.error('styles.css was not found in the current folder. Run this script from the repo root.');
    process.exitCode = 1;
    return false;
  }

  const marker = '/* Store Bot nav overflow fix */';
  const css = read(cssPath);
  if (css.includes(marker)) {
    console.log('CSS nav fix already exists. Skipping styles.css.');
    return false;
  }

  const fix = `

${marker}
.brand {
  flex: 0 0 auto;
  white-space: nowrap;
}

.brand span,
.brand strong {
  white-space: nowrap;
}

.nav-shell {
  width: min(1280px, calc(100% - 28px));
}

.nav-dropdown {
  position: relative;
}

.nav-dropdown summary {
  list-style: none;
  cursor: pointer;
  color: var(--muted);
  font-weight: 760;
  border-radius: 12px;
}

.nav-dropdown summary::-webkit-details-marker {
  display: none;
}

.nav-dropdown summary::after {
  content: "▾";
  margin-left: 0.35rem;
  font-size: 0.72rem;
}

.nav-dropdown[open] summary,
.nav-dropdown summary:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}

.nav-dropdown-menu {
  display: grid;
  gap: 0.15rem;
}

@media (max-width: 979px) {
  .nav-dropdown summary {
    padding: 0.85rem 1rem;
  }

  .nav-dropdown-menu {
    padding: 0.25rem 0 0.25rem 0.75rem;
  }

  .nav-dropdown-menu a {
    padding-block: 0.7rem;
  }
}

@media (min-width: 980px) {
  .nav-shell {
    gap: 0.75rem;
  }

  .nav-links {
    flex: 1 1 auto;
    justify-content: flex-end;
    min-width: 0;
    gap: 0.12rem;
  }

  .nav-links a,
  .nav-dropdown summary {
    white-space: nowrap;
    padding: 0.52rem 0.58rem;
    font-size: 0.94rem;
  }

  .nav-links .nav-cta {
    margin-left: 0.35rem;
    padding-inline: 1rem;
  }

  .nav-dropdown-menu {
    position: absolute;
    top: calc(100% + 0.55rem);
    right: 0;
    z-index: 200;
    min-width: 190px;
    padding: 0.45rem;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: #11151b;
    box-shadow: var(--shadow);
  }

  .nav-dropdown:not([open]) .nav-dropdown-menu {
    display: none;
  }

  .nav-dropdown-menu a {
    display: block;
    padding: 0.65rem 0.75rem;
  }
}

@media (min-width: 980px) and (max-width: 1120px) {
  .nav-links a,
  .nav-dropdown summary {
    padding-inline: 0.45rem;
    font-size: 0.9rem;
  }

  .brand {
    gap: 0.55rem;
    font-size: 0.98rem;
  }

  .brand-logo {
    width: 38px;
    height: 38px;
  }
}
`;

  return writeWithBackup(cssPath, css + fix);
}

const htmlFiles = getRootHtmlFiles();
let changed = 0;

for (const file of htmlFiles) {
  if (fixHtml(file)) {
    changed += 1;
    console.log(`Updated ${path.basename(file)}`);
  }
}

if (appendCssFix()) {
  changed += 1;
  console.log('Updated styles.css');
}

console.log(`Done. ${changed} file(s) changed. Backups end with ${backupSuffix}`);

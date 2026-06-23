#!/usr/bin/env node
/*
  Store Bot unified nav fix
  - Replaces the header/nav on all live root HTML pages with one consistent nav.
  - Moves low-priority links into a More dropdown so the desktop nav does not wrap.
  - Appends final CSS overrides that stop brand/nav text from breaking lines.
  - Creates .bak files before editing.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const NOW = new Date().toISOString().replace(/[:.]/g, '-');

const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1515919161690161224&permissions=2147483648&integration_type=0&scope=bot+applications.commands';
const SUPPORT_URL = 'https://discord.gg/zB7NgPBzBA';

const liveHtmlFiles = fs.readdirSync(ROOT)
  .filter((file) => file.endsWith('.html'))
  .filter((file) => !file.includes('.bak'))
  .filter((file) => !file.includes('before-'))
  .filter((file) => !file.startsWith('google'));

function activeClass(file, target) {
  return file === target ? ' aria-current="page" class="active"' : '';
}

function buildHeader(file) {
  return `<header class="site-header">
    <a class="skip-link" href="#main">Skip to content</a>
    <nav class="nav" aria-label="Main navigation">
      <a class="brand" href="index.html" aria-label="Store Bot home">
        <img src="assets/storebot-avatar.png" alt="" width="42" height="42" loading="eager" decoding="async">
        <span>Store Bot</span>
      </a>

      <div class="nav-links" id="site-nav-links">
        <a href="features.html"${activeClass(file, 'features.html')}>Features</a>
        <a href="autopay.html"${activeClass(file, 'autopay.html')}>AutoPay</a>
        <a href="pricing.html"${activeClass(file, 'pricing.html')}>Pricing</a>
        <a href="shop.html"${activeClass(file, 'shop.html')}>Shop Pages</a>
        <a href="reputation.html"${activeClass(file, 'reputation.html')}>Reputation</a>
        <a href="docs.html"${activeClass(file, 'docs.html')}>Docs</a>

        <details class="nav-more">
          <summary>More</summary>
          <div class="nav-menu" aria-label="More pages">
            <a href="status.html"${activeClass(file, 'status.html')}>Status</a>
            <a href="patch-notes.html"${activeClass(file, 'patch-notes.html')}>Patch Notes</a>
            <a href="dashboard.html"${activeClass(file, 'dashboard.html')}>Dashboard</a>
            <a href="index.html#setup">Setup</a>
            <a href="index.html#faq">FAQ</a>
          </div>
        </details>

        <a class="nav-cta" href="${INVITE_URL}" target="_blank" rel="noopener">Invite Bot</a>
      </div>
    </nav>
  </header>`;
}

function replaceHeader(html, file) {
  const header = buildHeader(file);

  // Normal case: replace the full site header.
  if (/<header\b[\s\S]*?<\/header>/i.test(html)) {
    return html.replace(/<header\b[\s\S]*?<\/header>/i, header);
  }

  // Fallback: insert after opening body if a page somehow has no header.
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (match) => `${match}\n  ${header}`);
  }

  console.warn(`Skipped ${file}: no <header> or <body> found.`);
  return html;
}

function patchMainAnchors(html) {
  // Make sure the nav's anchors point somewhere real on the homepage.
  // Older pages may have sections without ids. This is intentionally conservative.
  html = html.replace(/<main(?![^>]*\bid=)[^>]*>/i, (match) => match.replace('<main', '<main id="main"'));
  html = html.replace(/<section([^>]*)class="([^"]*setup[^"]*)"/i, '<section$1id="setup" class="$2"');
  html = html.replace(/<section([^>]*)class="([^"]*faq[^"]*)"/i, '<section$1id="faq" class="$2"');

  // If classes are not present, add IDs to the first obvious Setup/FAQ sections by heading text.
  html = html.replace(/<section(?![^>]*\bid=)([^>]*)>\s*<div[^>]*>\s*<span[^>]*>Setup<\/span>/i, '<section id="setup"$1>\n      <div>\n        <span>Setup</span>');
  html = html.replace(/<section(?![^>]*\bid=)([^>]*)>\s*<div[^>]*>\s*<span[^>]*>FAQ<\/span>/i, '<section id="faq"$1>\n      <div>\n        <span>FAQ</span>');
  return html;
}

let changed = [];

for (const file of liveHtmlFiles) {
  const full = path.join(ROOT, file);
  const original = fs.readFileSync(full, 'utf8');
  let updated = replaceHeader(original, file);
  if (file === 'index.html') updated = patchMainAnchors(updated);

  if (updated !== original) {
    fs.writeFileSync(`${full}.before-unified-nav-${NOW}.bak`, original);
    fs.writeFileSync(full, updated);
    changed.push(file);
  }
}

const cssPath = path.join(ROOT, 'styles.css');
if (!fs.existsSync(cssPath)) {
  console.error('Could not find styles.css in this folder. Run this from the repo root.');
  process.exit(1);
}

const cssOriginal = fs.readFileSync(cssPath, 'utf8');
const start = '/* === Store Bot unified nav final fix === */';
const end = '/* === /Store Bot unified nav final fix === */';
const navCss = `${start}
.site-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
}

.nav {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 22px !important;
  min-height: 74px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 22px !important;
  flex-wrap: nowrap !important;
}

.brand {
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  flex: 0 0 auto !important;
  min-width: max-content !important;
  white-space: nowrap !important;
  text-decoration: none;
}

.brand img {
  flex: 0 0 auto !important;
  width: 42px !important;
  height: 42px !important;
  border-radius: 14px;
}

.brand span {
  display: inline-block !important;
  white-space: nowrap !important;
  line-height: 1 !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
}

.nav-links {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: clamp(10px, 1.15vw, 20px) !important;
  margin-left: auto !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  flex-wrap: nowrap !important;
}

.nav-links > a,
.nav-more > summary,
.nav-menu a,
.nav-cta {
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
}

.nav-links > a:not(.nav-cta),
.nav-more > summary {
  font-size: clamp(0.83rem, 0.9vw, 0.96rem) !important;
}

.nav-more {
  position: relative;
  flex: 0 0 auto;
}

.nav-more > summary {
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.nav-more > summary::-webkit-details-marker {
  display: none;
}

.nav-more > summary::after {
  content: "▾";
  margin-left: 0.38rem;
  font-size: 0.72em;
  opacity: 0.72;
}

.nav-menu {
  position: absolute;
  top: calc(100% + 14px);
  right: 0;
  display: grid;
  gap: 4px;
  min-width: 190px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(10, 11, 15, 0.98);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

.nav-menu a {
  display: block;
  padding: 9px 10px;
  border-radius: 10px;
  text-decoration: none;
}

.nav-menu a:hover,
.nav-menu a:focus-visible {
  background: rgba(255, 145, 49, 0.12);
}

.nav-cta {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 auto !important;
  min-width: max-content !important;
  padding: 0.84rem 1.12rem !important;
}

@media (max-width: 1120px) {
  .nav {
    gap: 16px !important;
    padding-inline: 18px !important;
  }

  .nav-links {
    gap: 10px !important;
  }

  .nav-links > a:not(.nav-cta),
  .nav-more > summary {
    font-size: 0.84rem !important;
  }

  .nav-cta {
    padding-inline: 0.95rem !important;
  }
}

@media (max-width: 860px) {
  .site-header {
    position: sticky;
  }

  .nav {
    align-items: flex-start !important;
    min-height: unset;
    padding-block: 12px !important;
    flex-wrap: wrap !important;
  }

  .brand {
    width: auto;
  }

  .nav-links {
    width: 100% !important;
    flex: 0 0 100% !important;
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .nav-links > a:not(.nav-cta),
  .nav-more > summary,
  .nav-cta {
    padding: 0.62rem 0.74rem !important;
    border-radius: 999px;
  }

  .nav-more[open] {
    width: 100%;
  }

  .nav-menu {
    position: static;
    min-width: 100%;
    margin-top: 8px;
  }
}
${end}`;

let cssUpdated = cssOriginal;
const blockRegex = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
cssUpdated = cssUpdated.replace(blockRegex, '').trimEnd() + '\n\n' + navCss + '\n';

if (cssUpdated !== cssOriginal) {
  fs.writeFileSync(`${cssPath}.before-unified-nav-${NOW}.bak`, cssOriginal);
  fs.writeFileSync(cssPath, cssUpdated);
  changed.push('styles.css');
}

console.log('Unified navigation patch complete.');
console.log(`Updated: ${changed.length ? changed.join(', ') : 'nothing changed'}`);
console.log('Check the site locally, then commit and push.');

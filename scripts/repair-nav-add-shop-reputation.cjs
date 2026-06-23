#!/usr/bin/env node
/*
  Store Bot navbar repair + functional Shop/Reputation pages

  Run from the Infinity7878.github.io repo root:
    node scripts/repair-nav-add-shop-reputation.cjs

  This patch:
  - Copies in functional static Shop and Reputation pages.
  - Replaces every live root HTML page header with one consistent navbar.
  - Uses your original nav-shell/nav-toggle/navLinks structure so script.js still controls mobile nav.
  - Removes duplicate skip links and old failed nav CSS patch blocks.
  - Adds homepage cards, docs notes, stylesheet/JS files, and sitemap entries.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PATCH_ROOT = path.resolve(__dirname, '..', 'patch-files');
const NOW = new Date().toISOString().replace(/[:.]/g, '-');

const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1515919161690161224&permissions=2147483648&integration_type=0&scope=bot+applications.commands';
const SUPPORT_URL = 'https://discord.gg/zB7NgPBzBA';
const SITE_URL = 'https://storebot.pro';

function full(file) { return path.join(ROOT, file); }
function exists(file) { return fs.existsSync(full(file)); }
function read(file) { return fs.readFileSync(full(file), 'utf8'); }
function write(file, content) { fs.writeFileSync(full(file), content); }

function backup(file) {
  const target = full(file);
  if (!fs.existsSync(target)) return;
  const backupPath = `${target}.before-shop-rep-functional-${NOW}.bak`;
  if (!fs.existsSync(backupPath)) fs.copyFileSync(target, backupPath);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMarkedBlock(content, start, end) {
  return content.replace(new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'g'), '').trimEnd();
}

if (!exists('index.html') || !exists('styles.css')) {
  console.error('Run this from the repo root. index.html and styles.css were not found.');
  process.exit(1);
}

if (!fs.existsSync(PATCH_ROOT)) {
  console.error('Could not find patch-files folder. Keep scripts/ and patch-files/ together when copying this patch.');
  process.exit(1);
}

const changed = new Set();

function copyPatchFile(file) {
  const source = path.join(PATCH_ROOT, file);
  if (!fs.existsSync(source)) throw new Error(`Missing patch file: ${file}`);
  backup(file);
  fs.copyFileSync(source, full(file));
  changed.add(file);
}

copyPatchFile('shop.html');
copyPatchFile('reputation.html');
copyPatchFile('shop-reputation.css');
copyPatchFile('shop-reputation.js');

function activeClass(file, target) {
  return file === target ? ' class="active" aria-current="page"' : '';
}

function canonicalHeader(file) {
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="nav-shell">
    <a class="brand" href="index.html" aria-label="Store Bot home">
      <img class="brand-logo" src="assets/storebot-avatar.png" alt="" width="42" height="42" loading="eager" decoding="async">
      <span>Store Bot</span>
    </a>

    <button class="nav-toggle" id="navToggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="navLinks">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <nav class="nav-links" id="navLinks" aria-label="Main navigation">
      <a href="features.html"${activeClass(file, 'features.html')}>Features</a>
      <a href="pricing.html"${activeClass(file, 'pricing.html')}>Pricing</a>
      <a href="shop.html"${activeClass(file, 'shop.html')}>Shop</a>
      <a href="reputation.html"${activeClass(file, 'reputation.html')}>Reputation</a>
      <a href="docs.html"${activeClass(file, 'docs.html')}>Docs</a>

      <details class="nav-more">
        <summary>More</summary>
        <div class="nav-menu" aria-label="More pages">
          <a href="autopay.html"${activeClass(file, 'autopay.html')}>AutoPay</a>
          <a href="status.html"${activeClass(file, 'status.html')}>Status</a>
          <a href="patch-notes.html"${activeClass(file, 'patch-notes.html')}>Patch Notes</a>
          <a href="dashboard.html"${activeClass(file, 'dashboard.html')}>Dashboard</a>
          <a href="index.html#setup">Setup</a>
          <a href="index.html#faq">FAQ</a>
        </div>
      </details>

      <a class="nav-cta" href="${INVITE_URL}" target="_blank" rel="noopener">Invite Bot</a>
    </nav>
  </div>
</header>`;
}

function normalizeHeader(html, file) {
  const header = canonicalHeader(file);

  // Remove duplicate skip links from previous failed patches.
  html = html.replace(/<a\s+class=["']skip-link["'][\s\S]*?<\/a>\s*/gi, '');

  let replaced = false;
  html = html.replace(/<header\b[\s\S]*?<\/header>/gi, () => {
    if (replaced) return '';
    replaced = true;
    return header;
  });

  if (!replaced) {
    html = html.replace(/<body[^>]*>/i, (match) => `${match}\n${header}`);
  }

  html = html.replace(/<main(?![^>]*\bid=)[^>]*>/i, (match) => match.replace('<main', '<main id="main"'));

  if (file === 'index.html') {
    html = html.replace(/<section(?![^>]*\bid=)([^>]*class="[^"]*setup[^"]*"[^>]*)>/i, '<section id="setup"$1>');
    html = html.replace(/<section(?![^>]*\bid=)([^>]*class="[^"]*faq[^"]*"[^>]*)>/i, '<section id="faq"$1>');
  }

  return html;
}

const htmlFiles = fs.readdirSync(ROOT)
  .filter((file) => file.endsWith('.html'))
  .filter((file) => !file.includes('.bak'))
  .filter((file) => !file.includes('before-'))
  .filter((file) => !file.startsWith('google'));

for (const file of htmlFiles) {
  const original = read(file);
  const updated = normalizeHeader(original, file);
  if (updated !== original) {
    backup(file);
    write(file, updated);
    changed.add(file);
  }
}

let indexHtml = read('index.html');
if (!indexHtml.includes('id="shop-reputation"')) {
  const promoSection = `

  <section class="section-pad accent-section" id="shop-reputation">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Shop pages + reputation</p>
        <h2>Give your Discord store a public page buyers can trust.</h2>
        <p>Store Bot now has static builders for public shop pages and seller reputation profiles. Create product pages, review profiles, trust badges, and shareable links directly from the website.</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card reveal">
          <span class="card-icon">S</span>
          <h3>Shop pages</h3>
          <p>Build a public storefront with products, prices, payment links, Discord support links, and policies.</p>
          <a class="inline-link" href="shop.html">Build a shop page →</a>
        </article>
        <article class="feature-card reveal">
          <span class="card-icon">★</span>
          <h3>Reputation profiles</h3>
          <p>Show reviews, completed-order signals, response time, seller policies, and a copyable trust badge.</p>
          <a class="inline-link" href="reputation.html">Build reputation →</a>
        </article>
        <article class="feature-card reveal">
          <span class="card-icon">↗</span>
          <h3>Shareable links</h3>
          <p>The static MVP works on GitHub Pages using encoded links, browser drafts, and JSON exports.</p>
          <a class="inline-link" href="docs.html">Read setup docs →</a>
        </article>
      </div>
    </div>
  </section>`;

  if (/<section[^>]*id=["']pricing["'][\s\S]*?<\/section>/i.test(indexHtml)) {
    indexHtml = indexHtml.replace(/(<section[^>]*id=["']pricing["'][\s\S]*?<\/section>)/i, `${promoSection}\n\n$1`);
  } else {
    indexHtml = indexHtml.replace(/<\/main>/i, `${promoSection}\n</main>`);
  }
  backup('index.html');
  write('index.html', indexHtml);
  changed.add('index.html');
}

if (exists('docs.html')) {
  let docs = read('docs.html');
  if (!docs.includes('id="shop-reputation-docs"')) {
    const docsSection = `

    <section class="content-card reveal" id="shop-reputation-docs">
      <h2>Shop pages and reputation profiles</h2>
      <p>The Shop and Reputation builders are static tools that work on GitHub Pages. They save drafts in your browser, generate public share links, and export JSON.</p>
      <ul>
        <li>Use <a class="inline-link" href="shop.html">Shop Pages</a> to create a public storefront with product cards and order links.</li>
        <li>Use <a class="inline-link" href="reputation.html">Reputation</a> to create a seller profile with reviews, order signals, policies, and a copyable trust badge.</li>
        <li>Because GitHub Pages is static, buyer-submitted reviews do not sync to the seller unless you later connect a backend, database, Discord bot command, or form endpoint.</li>
      </ul>
    </section>`;
    docs = docs.replace(/<\/main>/i, `${docsSection}\n  </main>`);
    backup('docs.html');
    write('docs.html', docs);
    changed.add('docs.html');
  }
}

let css = read('styles.css');
const oldBlocks = [
  ['/* === Store Bot nav overflow fix === */', '/* === /Store Bot nav overflow fix === */'],
  ['/* === Store Bot unified nav final fix === */', '/* === /Store Bot unified nav final fix === */'],
  ['/* === Store Bot shop and reputation feature patch === */', '/* === /Store Bot shop and reputation feature patch === */'],
  ['/* === Store Bot reliable nav repair === */', '/* === /Store Bot reliable nav repair === */']
];
for (const [start, end] of oldBlocks) css = stripMarkedBlock(css, start, end);

const reliableNavCss = `
/* === Store Bot reliable nav repair === */
.site-header {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-shell {
  width: min(1240px, calc(100% - 28px));
  min-height: 74px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand,
.brand span,
.nav-links a,
.nav-more > summary,
.nav-cta {
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
}

.brand {
  flex: 0 0 auto;
  min-width: max-content;
}

.brand-logo {
  flex: 0 0 auto;
}

.nav-more {
  position: relative;
}

.nav-more > summary {
  display: block;
  cursor: pointer;
  list-style: none;
  color: var(--muted);
  font-weight: 760;
  padding: 0.85rem 1rem;
  border-radius: 12px;
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

.nav-more[open] > summary,
.nav-more > summary:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}

.nav-menu {
  display: grid;
  gap: 0.2rem;
  padding: 0.45rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #11151b;
}

.nav-menu a {
  display: block;
}

@media (min-width: 980px) {
  .nav-shell {
    gap: clamp(0.65rem, 1.4vw, 1.25rem);
  }

  .nav-toggle {
    display: none !important;
  }

  .nav-links {
    position: static !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: clamp(0.18rem, 0.55vw, 0.5rem) !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    margin-left: auto !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .nav-links > a,
  .nav-more > summary {
    padding: 0.58rem clamp(0.48rem, 0.72vw, 0.76rem) !important;
    font-size: clamp(0.82rem, 0.85vw, 0.96rem) !important;
  }

  .nav-links .nav-cta {
    flex: 0 0 auto;
    padding-inline: clamp(0.78rem, 1vw, 1rem) !important;
  }

  .nav-menu {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    min-width: 190px;
    padding: 0.55rem;
    background: rgba(17, 21, 27, 0.98);
    box-shadow: var(--shadow);
  }
}

@media (max-width: 979px) {
  .nav-links {
    max-height: calc(100vh - 100px);
    overflow: auto;
  }

  .nav-more,
  .nav-more[open] {
    width: 100%;
  }

  .nav-more > summary {
    padding: 0.85rem 1rem;
  }

  .nav-menu {
    margin: 0 0.55rem 0.55rem;
  }

  .nav-menu a {
    padding: 0.75rem 0.85rem;
  }
}
/* === /Store Bot reliable nav repair === */
`;
backup('styles.css');
write('styles.css', css.trimEnd() + '\n\n' + reliableNavCss + '\n');
changed.add('styles.css');

if (exists('sitemap.xml')) {
  let sitemap = read('sitemap.xml');
  for (const entry of ['shop.html', 'reputation.html']) {
    if (!sitemap.includes(`/${entry}`)) {
      const node = `\n  <url>\n    <loc>${SITE_URL}/${entry}</loc>\n  </url>`;
      sitemap = sitemap.replace(/<\/urlset>\s*$/i, `${node}\n</urlset>`);
    }
  }
  backup('sitemap.xml');
  write('sitemap.xml', sitemap);
  changed.add('sitemap.xml');
}

console.log('Store Bot shop/reputation functional patch complete.');
console.log('Updated files:');
for (const file of Array.from(changed).sort()) console.log(' - ' + file);
console.log('\nNext: test locally, then commit and push.');

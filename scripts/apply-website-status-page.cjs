const fs = require('fs');
const path = require('path');

const root = process.cwd();
const patchRoot = path.resolve(__dirname, '..');

function copyFile(name) {
  fs.copyFileSync(path.join(patchRoot, name), path.join(root, name));
  console.log(`Wrote ${name}`);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content);
  console.log(`Updated ${path.relative(root, file)}`);
}

function addNavStatusLink(content) {
  if (content.includes('href="status.html"')) return content;
  if (content.includes('<a href="docs.html">Docs</a>')) {
    return content.replace('<a href="docs.html">Docs</a>', '<a href="docs.html">Docs</a>\n        <a href="status.html">Status</a>');
  }
  return content;
}

function addFooterStatusLink(content) {
  if (content.includes('<a href="status.html">Status</a>')) return content;
  if (content.includes('<a href="docs.html">Docs</a>')) {
    return content.replace('<a href="docs.html">Docs</a>', '<a href="docs.html">Docs</a>\n        <a href="status.html">Status</a>');
  }
  return content;
}

function addHomeStatusBadge(content) {
  if (!content.includes('<body') || content.includes('id="homeStatusBadge"')) return content;
  const marker = '</div>\n          <div class="trust-row" aria-label="Store Bot highlights">';
  const insert = `</div>
          <a class="status-pill" id="homeStatusBadge" href="status.html" aria-label="View Store Bot live service status">
            <span class="status-pill-dot" aria-hidden="true"></span>
            <span><strong>Status:</strong> <span id="homeStatusText">Checking...</span></span>
          </a>
          <div class="trust-row" aria-label="Store Bot highlights">`;
  if (content.includes(marker)) return content.replace(marker, insert);
  return content;
}

function addCss(content) {
  if (content.includes('.status-pill')) return content;
  return `${content}

/* Store Bot public status badge */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  width: fit-content;
  margin-top: 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.055);
  font-weight: 760;
}

.status-pill:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.09);
}

.status-pill-dot {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  background: var(--green);
  box-shadow: 0 0 0 6px rgba(69, 212, 131, 0.15);
}

.status-pill[data-status="maintenance"] .status-pill-dot { background: #5865f2; box-shadow: 0 0 0 6px rgba(88, 101, 242, 0.16); }
.status-pill[data-status="degraded"] .status-pill-dot,
.status-pill[data-status="partial_outage"] .status-pill-dot { background: #facc15; box-shadow: 0 0 0 6px rgba(250, 204, 21, 0.16); }
.status-pill[data-status="major_outage"] .status-pill-dot,
.status-pill[data-status="outage"] .status-pill-dot { background: #ed4245; box-shadow: 0 0 0 6px rgba(237, 66, 69, 0.16); }
`;
}

function addScript(content) {
  if (content.includes('homeStatusBadge')) return content;
  return `${content}

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
`;
}

function addSitemapStatus(content) {
  if (content.includes('https://storebot.pro/status.html')) return content;
  const url = `  <url>\n    <loc>https://storebot.pro/status.html</loc>\n    <priority>0.7</priority>\n  </url>\n`;
  if (content.includes('</urlset>')) return content.replace('</urlset>', `${url}</urlset>`);
  return content;
}

copyFile('status.html');
copyFile('status.json');

for (const name of fs.readdirSync(root)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(root, name);
  let content = read(file);
  const before = content;
  content = addNavStatusLink(content);
  content = addFooterStatusLink(content);
  if (name === 'index.html') content = addHomeStatusBadge(content);
  if (content !== before) write(file, content);
}

const cssFile = path.join(root, 'styles.css');
if (fs.existsSync(cssFile)) {
  const before = read(cssFile);
  const after = addCss(before);
  if (after !== before) write(cssFile, after);
}

const jsFile = path.join(root, 'script.js');
if (fs.existsSync(jsFile)) {
  const before = read(jsFile);
  const after = addScript(before);
  if (after !== before) write(jsFile, after);
}

const sitemapFile = path.join(root, 'sitemap.xml');
if (fs.existsSync(sitemapFile)) {
  const before = read(sitemapFile);
  const after = addSitemapStatus(before);
  if (after !== before) write(sitemapFile, after);
}

console.log('Website status page patch applied.');

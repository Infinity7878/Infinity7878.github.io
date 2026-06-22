const fs = require('fs');
const path = require('path');

const root = process.cwd();
const patchRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'patch-notes.html');
const jsonPath = path.join(root, 'patch-notes.json');
const sourceHtmlPath = path.join(patchRoot, 'patch-notes.html');

if (!fs.existsSync(sourceHtmlPath)) {
  console.error(`Missing source file: ${sourceHtmlPath}`);
  process.exit(1);
}

const defaultJson = {
  updatedAt: new Date().toISOString(),
  summary: 'Store Bot patch notes are updated from the deployment system.',
  notes: [
    {
      id: 'dashboard-live',
      title: 'Web dashboard released',
      summary: 'Store Bot now includes a production web dashboard for managing server storefronts.',
      date: new Date().toISOString(),
      tags: ['Dashboard', 'Store Management'],
      items: [
        'Added Discord login and server selector.',
        'Added product management, panel refresh, AutoPay status, and channel settings.',
        'Added owner command center and live service status pages.'
      ]
    }
  ]
};

function addNavLink(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;

  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('/patch-notes.html') || s.includes('patch-notes.html')) return;

  const link = '<a href="/patch-notes.html">Patch Notes</a>';
  const candidates = [
    ['<a href="/status.html">Status</a>', '<a href="/status.html">Status</a>\n        ' + link],
    ['<a href="status.html">Status</a>', '<a href="status.html">Status</a>\n        ' + link],
    ['<a href="/dashboard.html">Dashboard</a>', '<a href="/dashboard.html">Dashboard</a>\n        ' + link],
    ['<a href="dashboard.html">Dashboard</a>', '<a href="dashboard.html">Dashboard</a>\n        ' + link],
    ['<a href="/docs.html">Docs</a>', '<a href="/docs.html">Docs</a>\n        ' + link],
    ['<a href="docs.html">Docs</a>', '<a href="docs.html">Docs</a>\n        ' + link]
  ];

  for (const [needle, replacement] of candidates) {
    if (s.includes(needle)) {
      s = s.replace(needle, replacement);
      fs.writeFileSync(p, s);
      console.log(`Added Patch Notes link to ${file}`);
      return;
    }
  }

  console.log(`Skipped nav update for ${file}: no known nav insertion point found.`);
}

function updateSitemap() {
  const p = path.join(root, 'sitemap.xml');
  if (!fs.existsSync(p)) return;

  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('/patch-notes.html')) return;

  const entry = `
  <url>
    <loc>https://storebot.pro/patch-notes.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;

  if (s.includes('</urlset>')) {
    s = s.replace('</urlset>', `${entry}\n</urlset>`);
    fs.writeFileSync(p, s);
    console.log('Added patch-notes.html to sitemap.xml');
  }
}

fs.copyFileSync(sourceHtmlPath, htmlPath);
console.log('Installed patch-notes.html');

if (!fs.existsSync(jsonPath)) {
  fs.writeFileSync(jsonPath, JSON.stringify(defaultJson, null, 2));
  console.log('Created patch-notes.json');
} else {
  console.log('patch-notes.json already exists; leaving existing notes intact.');
}

for (const file of ['index.html', 'docs.html', 'status.html', 'dashboard.html', 'privacy.html', 'terms.html']) {
  addNavLink(file);
}

updateSitemap();
console.log('Patch notes page installed. Commit and push the website repo.');

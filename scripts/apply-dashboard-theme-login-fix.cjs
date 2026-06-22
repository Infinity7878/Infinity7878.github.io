#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const patchRoot = path.resolve(__dirname, "..");
const src = path.join(patchRoot, "dashboard.html");
const dest = path.join(root, "dashboard.html");

if (!fs.existsSync(src)) {
  console.error(`Missing ${src}`);
  process.exit(1);
}

if (fs.existsSync(dest)) {
  const backup = path.join(root, `dashboard-before-theme-login-fix-${new Date().toISOString().replace(/[:.]/g, "-")}.html`);
  fs.copyFileSync(dest, backup);
  console.log(`Backup written: ${backup}`);
}

fs.copyFileSync(src, dest);
console.log("Wrote themed dashboard.html");

function patchFile(file, mutator) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  const before = fs.readFileSync(full, "utf8");
  const after = mutator(before);
  if (after !== before) {
    fs.writeFileSync(full, after);
    console.log(`Updated ${file}`);
  }
}

const dashboardNav = '<a href="dashboard.html">Dashboard</a>';

for (const file of ["index.html", "features.html", "autopay.html", "pricing.html", "docs.html", "status.html"]) {
  patchFile(file, (s) => {
    if (s.includes('href="dashboard.html"') || s.includes('href="/dashboard.html"')) return s;
    return s.replace(/(<a[^>]+href=["']status\.html["'][^>]*>Status<\/a>)/i, `$1\n        ${dashboardNav}`);
  });
}

patchFile("sitemap.xml", (s) => {
  if (s.includes("/dashboard.html")) return s;
  return s.replace(/<\/urlset>/i, `  <url>\n    <loc>https://storebot.pro/dashboard.html</loc>\n  </url>\n</urlset>`);
});

console.log("Dashboard theme/login fix patch complete.");

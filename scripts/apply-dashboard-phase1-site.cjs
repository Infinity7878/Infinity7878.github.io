#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const patchRoot = path.resolve(__dirname, "..");
const dashboardSrc = path.join(patchRoot, "dashboard.html");
const dashboardDest = path.join(root, "dashboard.html");

if (!fs.existsSync(dashboardSrc)) {
  console.error(`Missing ${dashboardSrc}`);
  process.exit(1);
}

fs.copyFileSync(dashboardSrc, dashboardDest);
console.log("Wrote dashboard.html");

function patchFile(file, replacements) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  let s = fs.readFileSync(full, "utf8");
  const before = s;
  for (const fn of replacements) s = fn(s);
  if (s !== before) {
    fs.writeFileSync(full, s);
    console.log(`Updated ${file}`);
  }
}

const dashLink = '<a href="/dashboard.html">Dashboard</a>';

patchFile("index.html", [
  (s) => s.includes('/dashboard.html') ? s : s.replace(/(<a[^>]+href=["']\/docs\.html["'][^>]*>Docs<\/a>)/i, `$1\n          ${dashLink}`),
  (s) => s.includes('Dashboard') ? s : s
]);

patchFile("docs.html", [
  (s) => s.includes('/dashboard.html') ? s : s.replace(/(<a[^>]+href=["']\/status\.html["'][^>]*>Status<\/a>)/i, `$1\n          ${dashLink}`)
]);

patchFile("status.html", [
  (s) => s.includes('/dashboard.html') ? s : s.replace(/(<a[^>]+href=["']\/docs\.html["'][^>]*>Docs<\/a>)/i, `$1\n          ${dashLink}`)
]);

patchFile("sitemap.xml", [
  (s) => s.includes("/dashboard.html") ? s : s.replace(/<\/urlset>/i, `  <url>\n    <loc>https://storebot.pro/dashboard.html</loc>\n  </url>\n</urlset>`)
]);

console.log("Dashboard Phase 1 site patch complete.");

#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const source = path.resolve(__dirname, "../dashboard.html");
const target = path.join(root, "dashboard.html");

if (!fs.existsSync(source)) {
  console.error(`Missing source dashboard: ${source}`);
  process.exit(1);
}
if (!fs.existsSync(target)) {
  console.error(`dashboard.html was not found in ${root}. Run this from your GitHub Pages repo.`);
  process.exit(1);
}

const backup = path.join(root, `dashboard-before-management-controls-${new Date().toISOString().replace(/[:.]/g, "-")}.html`);
fs.copyFileSync(target, backup);
fs.copyFileSync(source, target);

const html = fs.readFileSync(target, "utf8");
const bad = /Phase\s*\d|coming next|Coming next|starter|beta|testing/i.test(html);
if (bad) {
  console.warn("Warning: dashboard.html still contains non-production copy. Search the file before pushing.");
}
console.log(`Backed up old dashboard to ${backup}`);
console.log("Installed dashboard management controls page.");

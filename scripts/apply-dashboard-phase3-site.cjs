#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const patchRoot = path.resolve(__dirname, "..");
const source = path.join(patchRoot, "dashboard.html");
const target = path.join(process.cwd(), "dashboard.html");

if (!fs.existsSync(source)) {
  console.error(`Missing source dashboard: ${source}`);
  process.exit(1);
}

if (!fs.existsSync(target)) {
  console.error(`Could not find ${target}. Run this from your GitHub Pages repo folder.`);
  process.exit(1);
}

const backup = `${target}.before-dashboard-phase3-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
fs.copyFileSync(target, backup);
console.log(`Backup written: ${backup}`);

fs.copyFileSync(source, target);
console.log(`Installed Phase 3 dashboard to ${target}`);

#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const patchRoot = path.resolve(__dirname, "..");
const source = path.join(patchRoot, "dashboard.html");
const target = path.join(repoRoot, "dashboard.html");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

if (!fs.existsSync(source)) {
  console.error(`Missing patch dashboard.html: ${source}`);
  process.exit(1);
}

if (fs.existsSync(target)) {
  const backup = path.join(repoRoot, `dashboard-before-phase2-${stamp()}.html`);
  fs.copyFileSync(target, backup);
  console.log(`Backed up existing dashboard.html to ${backup}`);
}

fs.copyFileSync(source, target);
console.log(`Installed Phase 2 dashboard page at ${target}`);

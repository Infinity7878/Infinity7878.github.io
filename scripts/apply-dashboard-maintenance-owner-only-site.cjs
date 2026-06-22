#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const candidates = [
  path.join(process.cwd(), "dashboard.html"),
  path.join(process.cwd(), "storebot-dashboard-phase2-site-patch", "dashboard.html")
];

const target = candidates.find((p) => fs.existsSync(p));
if (!target) {
  console.error("Could not find dashboard.html. Run this from your GitHub Pages repo folder.");
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");
const before = s;

const backup = `${target}.before-maintenance-owner-only-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
fs.copyFileSync(target, backup);
console.log(`Backup written: ${backup}`);

if (!s.includes("const ownerControls = Boolean(o.access?.ownerAccount || me?.owner);")) {
  const needle = `      const bot = o.bot || {};\n      $("overviewBox").innerHTML = \``;
  const replacement = `      const bot = o.bot || {};\n      const ownerControls = Boolean(o.access?.ownerAccount || me?.owner);\n      $("overviewBox").innerHTML = \``;
  if (!s.includes(needle)) {
    console.error("Could not find renderOverview insertion point.");
    process.exit(1);
  }
  s = s.replace(needle, replacement);
}

s = s.replace(
  `<p class="section-text">Pause or resume checkout/order creation for this server. Existing paid orders can still be delivered.</p>`,
  `<p class="section-text">Pause or resume checkout/order creation for this server. Existing paid orders can still be delivered. Only the Store Bot owner can change this setting.</p>`
);

s = s.replace(
  `<button class="button primary" id="enableMaintenanceBtn" type="button">Enable Maintenance</button>`,
  `<button class="button primary" id="enableMaintenanceBtn" type="button" \${ownerControls ? "" : "disabled"}>Enable Maintenance</button>`
);

s = s.replace(
  `<button class="button secondary" id="disableMaintenanceBtn" type="button">Disable Maintenance</button>`,
  `<button class="button secondary" id="disableMaintenanceBtn" type="button" \${ownerControls ? "" : "disabled"}>Disable Maintenance</button>`
);

if (!s.includes("Only the Store Bot owner can enable or disable server maintenance from this dashboard.")) {
  s = s.replace(
    `<div id="controlResult" class="dashboard-note hidden"></div>`,
    `<div id="controlResult" class="dashboard-note hidden"></div>\n          \${ownerControls ? "" : \`<div class="dashboard-note">Only the Store Bot owner can enable or disable server maintenance from this dashboard.</div>\`}`
  );
}

if (s === before) {
  console.log("No changes needed; dashboard maintenance UX appears to already be owner-only.");
} else {
  fs.writeFileSync(target, s);
  console.log(`Updated ${target}: maintenance controls now show as owner-only.`);
}

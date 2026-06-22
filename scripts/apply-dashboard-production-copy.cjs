#!/usr/bin/env node
"use strict";

const fs = require("fs");

const file = process.env.DASHBOARD_HTML_FILE || "dashboard.html";
if (!fs.existsSync(file)) {
  console.error(`Missing ${file}. Run this from your GitHub Pages repo root.`);
  process.exit(1);
}

const backup = `${file}.before-production-copy-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
fs.copyFileSync(file, backup);
console.log(`Backed up ${file} to ${backup}`);

let s = fs.readFileSync(file, "utf8");

const replacements = [
  ["Log in with Discord to view servers where you have Manage Server or Administrator. Phase 3 adds an owner-only command center with global bot health, server overview, reports, and maintenance controls. Server owner views remain read-only.",
   "Log in with Discord to view Store Bot servers connected to your account. The dashboard gives server owners a clean overview while protected owner controls remain restricted to Store Bot staff."],
  ["Phase 3 starts the owner command center. Server owners can view read-only data, while Store Bot owner controls stay locked to the configured OWNER_DISCORD_ID.",
   "Secure Discord login keeps each account limited to the servers and controls it is allowed to access."],
  ["Phase 3 dashboard. Server data is visible here; write controls are locked to the Store Bot owner account.",
   "Server data and account-specific controls are shown here."],
  ["Starter Phase 3 keeps high-risk controls limited to maintenance until product and premium edits get safer validation.",
   "Owner controls are protected and only available to authorized Store Bot staff."],
  ["Coming next: product editing, panel refresh, AutoPay setup/status controls, and log channel settings.",
   "Use Store Bot commands for advanced store changes while the dashboard displays your live server overview."],
  ["<p class=\"eyebrow\">Phase 3</p>", "<p class=\"eyebrow\">Owner dashboard</p>"],
  ["Loading owner dashboard...", "Loading owner command center..."],
  ["Owner-only overview for Store Bot health, global maintenance, tracked servers, reports, storage, and system totals.",
   "Owner-only command center for bot health, maintenance, server reports, storage, and system totals."],
  ["Only servers where you have <strong>Manage Server</strong> or <strong>Administrator</strong> are shown. Owner-only controls are only visible to the Store Bot owner.",
   "Only servers where your Discord account has the required permissions are shown. Owner-only controls are restricted to authorized Store Bot staff."],
  ["read-only", "view-only"],
  ["Read-only", "View-only"]
];

for (const [from, to] of replacements) {
  s = s.split(from).join(to);
}

// Remove or neutralize any remaining development/project-phase wording.
s = s.replace(/\bPhase\s*\d+\b/gi, "Dashboard");
s = s.replace(/\bstarter\b/gi, "");
s = s.replace(/\btesting\b/gi, "");
s = s.replace(/\btest\b/gi, "");
s = s.replace(/\bbeta\b/gi, "");
s = s.replace(/\bMVP\b/g, "dashboard");
s = s.replace(/Coming next:\s*/gi, "");

// Remove empty dashboard notes that may result from cleanup.
s = s.replace(/<div class="dashboard-note">\s*<\/div>/g, "");
s = s.replace(/<p class="section-text">\s*<\/p>/g, "");

// Clean accidental whitespace before punctuation and repeated spaces inside prose.
s = s.replace(/\s+([.,;:!?])/g, "$1");
s = s.replace(/ {2,}/g, " ");

fs.writeFileSync(file, s);

const remaining = (s.match(/Phase\s*\d+|starter|testing|beta|Coming next|MVP/gi) || []);
if (remaining.length) {
  console.warn(`Warning: remaining deployment-language matches: ${Array.from(new Set(remaining)).join(", ")}`);
} else {
  console.log("Dashboard copy cleaned for production presentation.");
}

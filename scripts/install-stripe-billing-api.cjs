#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const apiRoot = process.env.DASHBOARD_API_ROOT || process.argv[2] || "/root/smok-full/storebot-dashboard-api";
const apiFile = path.join(apiRoot, "dashboard-api.cjs");

if (!fs.existsSync(apiFile)) {
  console.error(`Could not find dashboard API file: ${apiFile}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(apiRoot, `dashboard-api-before-stripe-billing-${stamp}.cjs`);
let src = fs.readFileSync(apiFile, "utf8");

if (src.includes("STOREBOT_STRIPE_BILLING_PATCH_V1")) {
  console.log("Stripe billing API patch already appears to be installed.");
  process.exit(0);
}

fs.copyFileSync(apiFile, backupFile);
console.log(`Backup written: ${backupFile}`);

function mustReplace(needle, replacement, label) {
  if (!src.includes(needle)) {
    console.error(`Could not find insertion point: ${label}`);
    process.exit(1);
  }
  src = src.replace(needle, replacement);
}

// Add Stripe billing constants after existing store data constants.
mustReplace(
  'const STORE_DATA_FILE = process.env.STOREBOT_STORE_DATA_FILE || path.join(DATA_DIR, "store_data.json");\n',
  `const STORE_DATA_FILE = process.env.STOREBOT_STORE_DATA_FILE || path.join(DATA_DIR, "store_data.json");\n\n// STOREBOT_STRIPE_BILLING_PATCH_V1\nconst STRIPE_SECRET_KEY = process.env.STOREBOT_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "";\nconst STRIPE_WEBHOOK_SECRET = process.env.STOREBOT_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";\nconst STRIPE_PREMIUM_PRICE_ID = process.env.STOREBOT_STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID || "";\nconst STRIPE_INTRO_PRICE_ID = process.env.STOREBOT_STRIPE_INTRO_PRICE_ID || process.env.STRIPE_INTRO_PRICE_ID || "";\nconst STRIPE_INTRO_COUPON_ID = process.env.STOREBOT_STRIPE_INTRO_COUPON_ID || process.env.STRIPE_INTRO_COUPON_ID || "";\nconst STRIPE_ALLOW_PROMOTION_CODES = String(process.env.STOREBOT_STRIPE_ALLOW_PROMOTION_CODES || "true").toLowerCase() !== "false";\nconst STRIPE_DISABLE_ON_PAYMENT_FAILED = String(process.env.STOREBOT_STRIPE_DISABLE_ON_PAYMENT_FAILED || "true").toLowerCase() !== "false";\nconst BILLING_SUCCESS_URL = process.env.STOREBOT_BILLING_SUCCESS_URL || (FRONTEND_URL + "?billing=success");\nconst BILLING_CANCEL_URL = process.env.STOREBOT_BILLING_CANCEL_URL || (FRONTEND_URL + "?billing=cancelled");\nconst BILLING_PORTAL_RETURN_URL = process.env.STOREBOT_BILLING_PORTAL_RETURN_URL || FRONTEND_URL;\nconst STRIPE_API_BASE = "https://api.stripe.com/v1";\n`,
  "STORE_DATA_FILE constants"
);

// Add Stripe billing routes before the existing admin routes/404 section.
const routes = fs.readFileSync(path.join(__dirname, "stripe-billing-api-routes.txt"), "utf8");

mustReplace(
  '  if (url.pathname === "/api/admin/overview" && req.method === "GET") {',
  routes + '\n  if (url.pathname === "/api/admin/overview" && req.method === "GET") {',
  "billing routes before admin routes"
);

// Include billing status in dashboard controls payload.
mustReplace(
  '    settings: channelSettings.settings,\n    generatedAt: new Date().toISOString()\n  };',
  '    settings: channelSettings.settings,\n    billing: await getBillingStatusForGuild(guildId),\n    generatedAt: new Date().toISOString()\n  };',
  "buildDashboardControlsPayload billing status"
);

// Add a billing hint to overview statuses.
mustReplace(
  '  overview.storage.uploadHuman = formatBytes(overview.storage.uploadBytes);\n  return overview;\n}',
  '  overview.storage.uploadHuman = formatBytes(overview.storage.uploadBytes);\n  return overview;\n}',
  "overview unchanged marker"
);

// Add helper functions before buildDashboardControlsPayload, after refreshDashboardPanel.
const helperMarker = '\nasync function buildDashboardControlsPayload(guildId, session) {';
const helpers = fs.readFileSync(path.join(__dirname, "stripe-billing-api-helpers.txt"), "utf8");

mustReplace(helperMarker, '\n' + helpers + helperMarker, "billing helper functions before buildDashboardControlsPayload");

fs.writeFileSync(apiFile, src);
console.log("Installed Stripe billing API routes and webhook handling.");
console.log("Next: node --check dashboard-api.cjs");

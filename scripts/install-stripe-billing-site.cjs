#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const siteRoot = process.env.STOREBOT_SITE_ROOT || process.argv[2] || process.cwd();
const pricingFile = path.join(siteRoot, "pricing.html");
const dashboardFile = path.join(siteRoot, "dashboard.html");

for (const file of [pricingFile, dashboardFile]) {
  if (!fs.existsSync(file)) {
    console.error(`Missing site file: ${file}`);
    process.exit(1);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(pricingFile, path.join(siteRoot, `pricing-before-stripe-billing-${stamp}.html`));
fs.copyFileSync(dashboardFile, path.join(siteRoot, `dashboard-before-stripe-billing-${stamp}.html`));

let pricing = fs.readFileSync(pricingFile, "utf8");
let dashboard = fs.readFileSync(dashboardFile, "utf8");

if (!pricing.includes("STOREBOT_STRIPE_BILLING_SITE_PATCH_V1")) {
  pricing = pricing.replace(
    '<a class="button primary full" href="https://discord.gg/zB7NgPBzBA">Upgrade in Discord</a>',
    '<!-- STOREBOT_STRIPE_BILLING_SITE_PATCH_V1 -->\n          <a class="button primary full" href="dashboard.html?upgrade=premium">Buy Premium</a>\n          <a class="button secondary full" href="https://discord.gg/zB7NgPBzBA" style="margin-top:10px;">Need help?</a>'
  );
  pricing = pricing.replace(
    '<article class="content-card reveal"><h2>How do I upgrade?</h2><p>Join the support server and ask for Premium. Mention the first-time user offer if this is your first Premium server. Premium is handled through Discord so the right server can be upgraded.</p><a class="button primary" href="https://discord.gg/zB7NgPBzBA">Join Support Server</a></article>',
    '<article class="content-card reveal"><h2>How do I upgrade?</h2><p>Click Buy Premium, log in with Discord, choose the server you want to upgrade, and complete checkout through Stripe. Premium is applied automatically to the selected server after the Stripe webhook confirms payment.</p><a class="button primary" href="dashboard.html?upgrade=premium">Open Dashboard</a></article>'
  );
}

if (!dashboard.includes("STOREBOT_STRIPE_BILLING_SITE_PATCH_V1")) {
  const billingCard = fs.readFileSync(path.join(__dirname, "stripe-billing-dashboard-card.txt"), "utf8");
  const billingFunctions = fs.readFileSync(path.join(__dirname, "stripe-billing-dashboard-functions.txt"), "utf8");

  dashboard = dashboard.replace(
    'const keywords = Array.isArray(autopay.paidKeywords) ? autopay.paidKeywords.join("\\n") : "";\n',
    'const keywords = Array.isArray(autopay.paidKeywords) ? autopay.paidKeywords.join("\\n") : "";\n      const billing = data.billing || {};\n'
  );

  dashboard = dashboard.replace(
    '      box.innerHTML = `\n        <div class="dashboard-card management-card">',
    '      box.innerHTML = `\n' + billingCard + '\n        <div class="dashboard-card management-card">'
  );

  dashboard = dashboard.replace(
    '      document.getElementById("saveProductBtn")?.addEventListener("click", saveProduct);\n',
    '      document.getElementById("startPremiumCheckoutBtn")?.addEventListener("click", startPremiumCheckout);\n      document.getElementById("manageBillingBtn")?.addEventListener("click", openBillingPortal);\n      document.getElementById("saveProductBtn")?.addEventListener("click", saveProduct);\n'
  );

  dashboard = dashboard.replace(
    '    function fillProductForm(p) {\n',
    billingFunctions + '    function fillProductForm(p) {\n'
  );

  dashboard = dashboard.replace(
    '      hideError();\n\n      const apiOnline = await checkApiHealth();',
    '      hideError();\n      const params = new URLSearchParams(window.location.search);\n      if (params.get("billing") === "success") { showError("Premium checkout complete.", "Stripe confirmed your checkout. Premium should appear after the webhook finishes syncing."); setTimeout(hideError, 6000); }\n      if (params.get("billing") === "cancelled") { showError("Checkout cancelled.", "No payment was completed."); setTimeout(hideError, 5000); }\n\n      const apiOnline = await checkApiHealth();'
  );
}

fs.writeFileSync(pricingFile, pricing);
fs.writeFileSync(dashboardFile, dashboard);
console.log("Installed Stripe billing site/dashboard UI patch.");
console.log("Next: open pricing.html and dashboard.html locally, then git add/commit/push.");

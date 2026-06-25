#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const siteRoot = process.env.STOREBOT_SITE_ROOT || process.argv[2] || process.cwd();
const dashboardFile = path.join(siteRoot, "dashboard.html");
const pricingFile = path.join(siteRoot, "pricing.html");

function exists(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

if (!exists(dashboardFile)) {
  console.error(`Missing dashboard.html at: ${dashboardFile}`);
  process.exit(1);
}
if (!exists(pricingFile)) {
  console.error(`Missing pricing.html at: ${pricingFile}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(os.tmpdir(), `storebot-premium-manual-billing-ui-backup-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(dashboardFile, path.join(backupDir, "dashboard.html"));
fs.copyFileSync(pricingFile, path.join(backupDir, "pricing.html"));

let dashboard = fs.readFileSync(dashboardFile, "utf8");
let pricing = fs.readFileSync(pricingFile, "utf8");
let changedDashboard = false;
let changedPricing = false;

const DOLLAR = "$";

const billingCardV3 = String.raw`        <!-- STOREBOT_STRIPE_BILLING_SITE_PATCH_V3 -->
        <div class="dashboard-card management-card" id="premiumBillingCard">
          <p class="eyebrow">Billing</p>
          <h2>Premium billing</h2>
          <p class="section-text">${DOLLAR}{billing.active
            ? (billing.manageAvailable
                ? "Premium is active for this server. Use Stripe billing management to cancel, update payment, view invoices, or reactivate/extend if cancellation is scheduled."
                : "Premium is active for this server, but it does not have a Stripe billing record attached. This usually means Premium was granted manually through the bot, so there is no Stripe subscription to manage.")
            : "Upgrade this Discord server to Store Bot Premium. Checkout is handled securely by Stripe and Premium is applied automatically after payment is confirmed."}</p>
          <div class="component-list">
            <div class="component-row"><div><strong>Status</strong><small>${DOLLAR}{escapeHtml(billing.message || billing.status || "Unknown")}</small></div><span class="${DOLLAR}{billing.active ? "dash-dot" : billing.configured ? "dash-dot warn" : "dash-dot bad"}"></span></div>
            <div class="component-row"><div><strong>Plan</strong><small>${DOLLAR}{escapeHtml(billing.plan || "Free")} ${DOLLAR}{billing.currentPeriodEnd ? "• Renews/expires " + escapeHtml(new Date(billing.currentPeriodEnd).toLocaleDateString()) : ""}</small></div><span class="${DOLLAR}{billing.active ? "dash-dot" : "dash-dot warn"}"></span></div>
            ${DOLLAR}{billing.active && !billing.manageAvailable ? '<div class="component-row"><div><strong>Billing source</strong><small>Manual Premium grant. Stripe billing management is not available for this server.</small></div><span class="dash-dot warn"></span></div>' : ''}
          </div>
          <div class="dashboard-actions billing-actions">
            ${DOLLAR}{billing.active
              ? (billing.manageAvailable
                  ? '<button class="button primary" id="manageBillingBtnPrimary" type="button">Manage Subscription</button><span class="billing-pill success">Premium Active</span>'
                  : '<span class="billing-pill success">Premium Active</span><span class="billing-pill muted">No Stripe subscription attached</span>')
              : '<button class="button primary" id="startPremiumCheckoutBtn" type="button" ' + (billing.configured ? "" : "disabled") + '>Buy Premium</button><button class="button secondary" id="manageBillingBtn" type="button" ' + (billing.manageAvailable ? "" : "disabled") + '>Manage Existing Subscription</button>'}
          </div>
          <div class="dashboard-note">${DOLLAR}{billing.active
            ? (billing.manageAvailable
                ? "Manage Subscription opens Stripe, where the server owner can cancel Premium, change payment method, view receipts, or reactivate/extend a subscription."
                : "This Premium status was likely granted from the bot/admin tools instead of Stripe checkout. To cancel or change it, use your Store Bot admin command or update the server's Premium record in the bot data.")
            : "Already bought Premium? Log in, select the server, then use Manage Existing Subscription if Stripe billing is attached to that server."}</div>
          <div id="billingResult" class="dashboard-note hidden"></div>
        </div>`;

const billingCardRegex = /\s*<!-- STOREBOT_STRIPE_BILLING_SITE_PATCH_V[123] -->[\s\S]*?<div id="billingResult" class="dashboard-note hidden"><\/div>\s*<\/div>/;
if (billingCardRegex.test(dashboard)) {
  dashboard = dashboard.replace(billingCardRegex, "\n" + billingCardV3);
  changedDashboard = true;
} else {
  // Fallback copy-only fix if the billing card exists but the older marker was removed.
  const before = dashboard;
  dashboard = dashboard.replace(/Update Premium/g, "Manage Subscription");
  dashboard = dashboard.replace(/<button class="button secondary" id="startPremiumCheckoutBtn" type="button" disabled>Premium Active<\/button>/g, '<span class="billing-pill success">Premium Active</span>');
  if (dashboard !== before) changedDashboard = true;
}

// Make sure both Manage Subscription button IDs are wired. Previous patch versions could
// add the new button but skip this listener because the string already existed in the page.
if (!dashboard.includes("STOREBOT_PREMIUM_MANAGE_LISTENERS_V2")) {
  const listenerBlock = '      // STOREBOT_PREMIUM_MANAGE_LISTENERS_V2\n      document.getElementById("manageBillingBtn")?.addEventListener("click", openBillingPortal);\n      document.getElementById("manageBillingBtnPrimary")?.addEventListener("click", openBillingPortal);';

  const manageLineRegex = /^\s*document\.getElementById\("manageBillingBtn"\)\?\.addEventListener\("click",\s*openBillingPortal\);\s*$/m;
  if (manageLineRegex.test(dashboard)) {
    dashboard = dashboard.replace(manageLineRegex, listenerBlock);
    changedDashboard = true;
  } else {
    const checkoutLine = 'document.getElementById("startPremiumCheckoutBtn")?.addEventListener("click", startPremiumCheckout);';
    if (dashboard.includes(checkoutLine)) {
      dashboard = dashboard.replace(checkoutLine, checkoutLine + "\n" + listenerBlock);
      changedDashboard = true;
    }
  }
}

// Dashboard-only CSS for readable disabled controls and clear manual/Stripe Premium state.
const billingCss = String.raw`
/* STOREBOT_PREMIUM_BILLING_VISUAL_FIX_V1 */
#premiumBillingCard .billing-actions {
  align-items: center;
  flex-wrap: wrap;
}
#premiumBillingCard .button:disabled,
#premiumBillingCard .button[disabled] {
  opacity: 1;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.16);
  cursor: not-allowed;
  transform: none;
}
#premiumBillingCard .button:disabled:hover,
#premiumBillingCard .button[disabled]:hover {
  transform: none;
}
#premiumBillingCard .billing-pill {
  display: inline-flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  padding: 0 1.05rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.84);
  background: rgba(255, 255, 255, 0.08);
  font-weight: 820;
  line-height: 1.15;
}
#premiumBillingCard .billing-pill.success {
  color: #b7f7cf;
  background: rgba(34, 197, 94, 0.13);
  border-color: rgba(34, 197, 94, 0.32);
}
#premiumBillingCard .billing-pill.muted {
  color: rgba(255, 255, 255, 0.72);
}
`;

if (!dashboard.includes("STOREBOT_PREMIUM_BILLING_VISUAL_FIX_V1")) {
  if (dashboard.includes("</style>")) {
    dashboard = dashboard.replace("</style>", billingCss + "\n</style>");
    changedDashboard = true;
  } else if (dashboard.includes("</head>")) {
    dashboard = dashboard.replace("</head>", `<style>${billingCss}\n</style>\n</head>`);
    changedDashboard = true;
  }
}

if (!dashboard.includes("STOREBOT_PREMIUM_DASHBOARD_INTENT_V1")) {
  const loadMeNeedle = 'async function loadMe() {\n      $("loginBtn").href = `${API_BASE}/auth/discord`;\n      hideError();';
  const loadMeInsert = 'async function loadMe() {\n      $("loginBtn").href = `${API_BASE}/auth/discord`;\n      hideError();\n      // STOREBOT_PREMIUM_DASHBOARD_INTENT_V1\n      const premiumIntentParams = new URLSearchParams(window.location.search);\n      const premiumBillingIntent = premiumIntentParams.get("billing");\n      const premiumUpgradeIntent = premiumIntentParams.get("upgrade");\n      if (premiumBillingIntent === "manage") {\n        showError("Manage or cancel Premium", "Log in with Discord, select the Premium server, then click Manage Subscription in the Billing card. If the server was granted Premium manually, there may not be a Stripe subscription to manage.");\n      } else if (premiumUpgradeIntent === "premium") {\n        showError("Buy Premium", "Log in with Discord, select the server you want to upgrade, then click Buy Premium in the Billing card.");\n      }';
  if (dashboard.includes(loadMeNeedle)) {
    dashboard = dashboard.replace(loadMeNeedle, loadMeInsert);
    changedDashboard = true;
  }
}

// Pricing page: make Premium purchase/cancel obvious from the public site.
if (pricing.includes('href="https://discord.gg/zB7NgPBzBA">Upgrade in Discord</a>')) {
  pricing = pricing.replace(
    '<a class="button primary full" href="https://discord.gg/zB7NgPBzBA">Upgrade in Discord</a>',
    '<!-- STOREBOT_PREMIUM_BILLING_EASY_SITE_PATCH_V1 -->\n          <a class="button primary full" href="dashboard.html?upgrade=premium">Buy Premium</a>\n          <a class="button secondary full" href="dashboard.html?billing=manage" style="margin-top:10px;">Manage / Cancel Premium</a>\n          <a class="button secondary full" href="https://discord.gg/zB7NgPBzBA" style="margin-top:10px;">Need help?</a>'
  );
  changedPricing = true;
} else if (!pricing.includes("STOREBOT_PREMIUM_BILLING_EASY_SITE_PATCH_V1")) {
  const buyNeedle = '<a class="button primary full" href="dashboard.html?upgrade=premium">Buy Premium</a>';
  if (pricing.includes(buyNeedle)) {
    pricing = pricing.replace(
      buyNeedle,
      '<!-- STOREBOT_PREMIUM_BILLING_EASY_SITE_PATCH_V1 -->\n          <a class="button primary full" href="dashboard.html?upgrade=premium">Buy Premium</a>\n          <a class="button secondary full" href="dashboard.html?billing=manage" style="margin-top:10px;">Manage / Cancel Premium</a>'
    );
    changedPricing = true;
  }
}

const oldUpgradeArticle = '<article class="content-card reveal"><h2>How do I upgrade?</h2><p>Join the support server and ask for Premium. Mention the first-time user offer if this is your first Premium server. Premium is handled through Discord so the right server can be upgraded.</p><a class="button primary" href="https://discord.gg/zB7NgPBzBA">Join Support Server</a></article>';
const newUpgradeArticle = '<article class="content-card reveal"><h2>How do I upgrade?</h2><p>Click Buy Premium, log in with Discord, choose the server you want to upgrade, and complete checkout through Stripe. Premium is applied automatically after payment confirms.</p><a class="button primary" href="dashboard.html?upgrade=premium">Open Dashboard</a></article>';
if (pricing.includes(oldUpgradeArticle)) {
  pricing = pricing.replace(oldUpgradeArticle, newUpgradeArticle);
  changedPricing = true;
}

if (!pricing.includes("How do I cancel or manage Premium?")) {
  const cancelCard = '<article class="content-card reveal"><h2>How do I cancel or manage Premium?</h2><p>Open the dashboard, log in with Discord, select your Premium server, then click Manage Subscription. Stripe lets you cancel, update your payment method, view receipts, or reactivate/extend a subscription. Manually granted Premium from bot/admin tools will not have a Stripe subscription to manage.</p><a class="button secondary" href="dashboard.html?billing=manage">Manage Premium</a></article>';
  if (pricing.includes(newUpgradeArticle)) {
    pricing = pricing.replace(newUpgradeArticle, newUpgradeArticle + cancelCard);
    changedPricing = true;
  } else {
    const fallbackAnchor = '</div>\n    </main>';
    if (pricing.includes(fallbackAnchor)) {
      pricing = pricing.replace(fallbackAnchor, `        ${cancelCard}\n      </div>\n    </main>`);
      changedPricing = true;
    }
  }
}

if (changedDashboard) fs.writeFileSync(dashboardFile, dashboard);
if (changedPricing) fs.writeFileSync(pricingFile, pricing);

console.log(`Backups saved outside the repo at: ${backupDir}`);
console.log(changedDashboard ? "Updated dashboard.html Premium billing UI." : "No dashboard.html changes were needed or the known billing block was not found.");
console.log(changedPricing ? "Updated pricing.html Premium CTAs/cancel guidance." : "No pricing.html changes were needed.");
console.log("Next: test locally, then git add dashboard.html pricing.html scripts/apply-premium-manual-billing-ui-fix.cjs && git commit && git push.");

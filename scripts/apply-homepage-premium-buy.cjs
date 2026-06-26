#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const siteRoot = process.env.STOREBOT_SITE_ROOT || process.argv[2] || process.cwd();
const indexFile = path.join(siteRoot, "index.html");
const pricingFile = path.join(siteRoot, "pricing.html");
const stylesFile = path.join(siteRoot, "styles.css");
const dashboardFile = path.join(siteRoot, "dashboard.html");

const SUPPORT_URL = "https://discord.gg/zB7NgPBzBA";
const INVITE_URL = "https://discord.com/oauth2/authorize?client_id=1515919161690161224&permissions=2147483648&integration_type=0&scope=bot+applications.commands";
const BUY_URL = "dashboard.html?upgrade=premium";
const MANAGE_URL = "dashboard.html?billing=manage";

function exists(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content);
}

function backup(files) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(os.tmpdir(), `storebot-homepage-premium-buy-backup-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  for (const file of files) {
    if (exists(file)) fs.copyFileSync(file, path.join(backupDir, path.basename(file)));
  }
  return backupDir;
}

function normalizeSupportLink(html) {
  return html.replace(/href="https:\/\/discord\.gg\/zB7NgPBzBA">Upgrade in Discord<\/a>/g, `href="${BUY_URL}">Buy Premium</a>`);
}

function removeDuplicateWhitespace(html) {
  return html.replace(/\n{4,}/g, "\n\n\n");
}

function injectAfter(html, needle, insertion) {
  if (!html.includes(needle)) return html;
  return html.replace(needle, needle + insertion);
}

function replaceFirst(html, needle, replacement) {
  if (!html.includes(needle)) return html;
  return html.replace(needle, replacement);
}

function patchNav(html) {
  if (html.includes("STOREBOT_HOME_BUY_PREMIUM_NAV_V1") || html.includes(`href="${BUY_URL}">Buy Premium</a>`)) {
    return html;
  }

  const pricingLink = '<a href="#pricing">Pricing</a>';
  if (html.includes(pricingLink)) {
    return html.replace(pricingLink, `${pricingLink}\n        <!-- STOREBOT_HOME_BUY_PREMIUM_NAV_V1 -->\n        <a href="${BUY_URL}">Buy Premium</a>`);
  }

  const supportLink = `<a class="nav-cta" href="${INVITE_URL}">Invite Bot</a>`;
  if (html.includes(supportLink)) {
    return html.replace(supportLink, `<!-- STOREBOT_HOME_BUY_PREMIUM_NAV_V1 -->\n        <a href="${BUY_URL}">Buy Premium</a>\n        ${supportLink}`);
  }

  return html;
}

function patchHero(html) {
  if (html.includes("STOREBOT_HOME_BUY_PREMIUM_HERO_V1")) return html;

  const originalHeroActions = `<div class="hero-actions" aria-label="Primary calls to action">
            <a class="button primary" href="${INVITE_URL}">Invite Store Bot</a>
            <a class="button secondary" href="${SUPPORT_URL}">Join Support Server</a>
          </div>`;

  const newHeroActions = `<div class="hero-actions" aria-label="Primary calls to action">
            <a class="button primary" href="${INVITE_URL}">Invite Store Bot</a>
            <!-- STOREBOT_HOME_BUY_PREMIUM_HERO_V1 -->
            <a class="button secondary" href="${BUY_URL}">Buy Premium</a>
            <a class="button ghost" href="${SUPPORT_URL}">Support</a>
          </div>`;

  if (html.includes(originalHeroActions)) return html.replace(originalHeroActions, newHeroActions);

  const inviteButton = `<a class="button primary" href="${INVITE_URL}">Invite Store Bot</a>`;
  if (html.includes(inviteButton)) {
    return html.replace(inviteButton, `${inviteButton}\n            <!-- STOREBOT_HOME_BUY_PREMIUM_HERO_V1 -->\n            <a class="button secondary" href="${BUY_URL}">Buy Premium</a>`);
  }

  return html;
}

function patchStatsOrInsertPremiumCard(html) {
  if (html.includes("STOREBOT_HOME_PREMIUM_CHECKOUT_SECTION_V1")) return html;

  const premiumSection = `

    <!-- STOREBOT_HOME_PREMIUM_CHECKOUT_SECTION_V1 -->
    <section class="premium-checkout-strip container reveal" aria-labelledby="premium-checkout-title">
      <div class="premium-checkout-copy">
        <p class="eyebrow">Premium checkout</p>
        <h2 id="premium-checkout-title">Buy Store Bot Premium from the website.</h2>
        <p>Premium is <strong>$3/month</strong>, with a <strong>$1 first-month offer</strong> for new Premium users. Log in with Discord, choose the server you want to upgrade, then finish checkout securely through Stripe.</p>
      </div>
      <div class="premium-checkout-actions">
        <a class="button primary" href="${BUY_URL}">Buy Premium</a>
        <a class="button secondary" href="${MANAGE_URL}">Manage Premium</a>
      </div>
    </section>`;

  const statsClose = `    <section class="stats container reveal" aria-label="Store Bot quick facts">
      <div class="stat-card hover-card"><strong>10</strong><span>free products to launch fast</span></div>
      <div class="stat-card hover-card"><strong>200</strong><span>premium product slots</span></div>
      <div class="stat-card hover-card"><strong>$3</strong><span>premium monthly plan</span></div>
    </section>`;

  if (html.includes(statsClose)) return injectAfter(html, statsClose, premiumSection);

  const heroEnd = "    </section>";
  const heroIndex = html.indexOf(heroEnd, html.indexOf('<section class="hero'));
  if (heroIndex !== -1) {
    const insertAt = heroIndex + heroEnd.length;
    return html.slice(0, insertAt) + premiumSection + html.slice(insertAt);
  }

  return html;
}

function patchPricingCard(html) {
  let output = html;

  output = output.replace(/<a class="button primary full" href="https:\/\/discord\.gg\/zB7NgPBzBA">Upgrade in Discord<\/a>/g,
    `<!-- STOREBOT_HOME_BUY_PREMIUM_PRICING_V1 -->\n            <a class="button primary full" href="${BUY_URL}">Buy Premium</a>\n            <a class="button secondary full" href="${MANAGE_URL}" style="margin-top:10px;">Manage Premium</a>`);

  output = output.replace(/<a class="button primary full" href="dashboard\.html\?upgrade=premium">Buy Premium<\/a>(?!\n\s*<a class="button secondary full" href="dashboard\.html\?billing=manage")/g,
    `<!-- STOREBOT_HOME_BUY_PREMIUM_PRICING_V1 -->\n            <a class="button primary full" href="${BUY_URL}">Buy Premium</a>\n            <a class="button secondary full" href="${MANAGE_URL}" style="margin-top:10px;">Manage Premium</a>`);

  if (!output.includes("$1 first-month") && output.includes("$3<span>/mo</span>")) {
    output = output.replace("<div class=\"price\">$3<span>/mo</span></div>", "<div class=\"price\">$3<span>/mo</span></div>\n            <p class=\"price-note\">$1 first-month offer for new Premium users.</p>");
  }

  return output;
}

function patchFinalCta(html) {
  if (html.includes("STOREBOT_HOME_BUY_PREMIUM_FINAL_CTA_V1")) return html;

  const finalActions = `<div class="hero-actions center">
            <a class="button primary" href="${INVITE_URL}">Invite Store Bot</a>
            <a class="button secondary" href="${SUPPORT_URL}">Get Support</a>
          </div>`;

  const newFinalActions = `<div class="hero-actions center">
            <a class="button primary" href="${INVITE_URL}">Invite Store Bot</a>
            <!-- STOREBOT_HOME_BUY_PREMIUM_FINAL_CTA_V1 -->
            <a class="button secondary" href="${BUY_URL}">Buy Premium</a>
            <a class="button ghost" href="${SUPPORT_URL}">Get Support</a>
          </div>`;

  if (html.includes(finalActions)) return html.replace(finalActions, newFinalActions);
  return html;
}

function patchSchema(html) {
  // Keep the schema accurate without requiring a full JSON parser for inline HTML.
  let output = html;
  output = output.replace(/"url": "https:\/\/infinity7878\.github\.io\/"/g, '"url": "https://storebot.pro/"');
  output = output.replace(/"image": "https:\/\/infinity7878\.github\.io\/assets\/storebot-banner\.png"/g, '"image": "https://storebot.pro/assets/storebot-banner.png"');

  if (!output.includes("first month for $1") && output.includes("How much is Store Bot Premium?")) {
    output = output.replace(
      "Store Bot Premium is $3 per month and unlocks more product slots, forwarding AutoPay, discounts, gift cards, custom branding, staff roles, and logs.",
      "Store Bot Premium is $3 per month, with a $1 first-month offer for new Premium users. It unlocks more product slots, forwarding AutoPay, discounts, gift cards, custom branding, staff roles, and logs."
    );
  }
  return output;
}

function patchDashboardIntent(html) {
  if (!html || html.includes("STOREBOT_HOME_BUY_PREMIUM_DASHBOARD_HINT_V1")) return html;

  const loadMeNeedle = 'async function loadMe() {\n      $("loginBtn").href = `${API_BASE}/auth/discord`;\n      hideError();';
  const loadMeInsert = 'async function loadMe() {\n      $("loginBtn").href = `${API_BASE}/auth/discord`;\n      hideError();\n      // STOREBOT_HOME_BUY_PREMIUM_DASHBOARD_HINT_V1\n      const premiumIntentParams = new URLSearchParams(window.location.search);\n      if (premiumIntentParams.get("upgrade") === "premium") {\n        showError("Buy Premium", "Log in with Discord, select the server you want to upgrade, then click Buy Premium in the Billing card.");\n      } else if (premiumIntentParams.get("billing") === "manage") {\n        showError("Manage Premium", "Log in with Discord, select your Premium server, then use Manage Subscription if Stripe billing is attached.");\n      }';

  if (html.includes(loadMeNeedle)) return html.replace(loadMeNeedle, loadMeInsert);
  return html;
}

function patchStyles(css) {
  if (css.includes("STOREBOT_HOME_PREMIUM_CHECKOUT_STYLES_V1")) return css;

  return css + `

/* STOREBOT_HOME_PREMIUM_CHECKOUT_STYLES_V1 */
.button.ghost {
  color: var(--muted);
  background: transparent;
  border: 1px solid transparent;
  box-shadow: none;
}
.button.ghost:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--line);
}
.premium-checkout-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.4rem;
  align-items: center;
  margin-top: -1rem;
  margin-bottom: 2.5rem;
  padding: 1.35rem;
  border: 1px solid rgba(255, 157, 18, 0.24);
  border-radius: var(--radius);
  background:
    linear-gradient(135deg, rgba(255, 157, 18, 0.13), rgba(255, 255, 255, 0.055)),
    rgba(19, 22, 30, 0.76);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
}
.premium-checkout-copy h2 {
  margin: 0.18rem 0 0.42rem;
  font-size: clamp(1.45rem, 3vw, 2rem);
  letter-spacing: -0.04em;
  line-height: 1.08;
}
.premium-checkout-copy p:last-child {
  margin-bottom: 0;
  color: var(--muted);
}
.premium-checkout-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.price-note {
  margin: -0.55rem 0 1rem;
  color: var(--accent-3);
  font-weight: 800;
}
@media (min-width: 800px) {
  .premium-checkout-strip {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 1.55rem 1.7rem;
  }
  .premium-checkout-actions {
    justify-content: flex-end;
  }
}
`;
}

if (!exists(indexFile)) {
  console.error(`Missing index.html at: ${indexFile}`);
  process.exit(1);
}

const backupDir = backup([indexFile, pricingFile, stylesFile, dashboardFile]);

let index = read(indexFile);
let changedIndex = false;
let newIndex = index;
newIndex = normalizeSupportLink(newIndex);
newIndex = patchSchema(newIndex);
newIndex = patchNav(newIndex);
newIndex = patchHero(newIndex);
newIndex = patchStatsOrInsertPremiumCard(newIndex);
newIndex = patchPricingCard(newIndex);
newIndex = patchFinalCta(newIndex);
newIndex = removeDuplicateWhitespace(newIndex);
if (newIndex !== index) {
  write(indexFile, newIndex);
  changedIndex = true;
}

let changedPricing = false;
if (exists(pricingFile)) {
  const pricing = read(pricingFile);
  let newPricing = normalizeSupportLink(pricing);
  newPricing = patchSchema(newPricing);
  newPricing = patchPricingCard(newPricing);
  newPricing = newPricing.replace(/Join the support server and ask for Premium\.?/g, "Click Buy Premium, log in with Discord, choose the server you want to upgrade, and finish checkout through Stripe.");
  newPricing = newPricing.replace(/Premium is handled through Discord so the right server can be upgraded\.?/g, "Premium is applied automatically after payment confirms.");
  if (!newPricing.includes("STOREBOT_PRICING_BUY_PREMIUM_HELP_V1") && newPricing.includes("How do I upgrade?")) {
    newPricing = newPricing.replace(/<a class="button primary" href="https:\/\/discord\.gg\/zB7NgPBzBA">Join Support Server<\/a>/g,
      `<!-- STOREBOT_PRICING_BUY_PREMIUM_HELP_V1 -->\n<a class="button primary" href="${BUY_URL}">Buy Premium</a>`);
  }
  if (newPricing !== pricing) {
    write(pricingFile, removeDuplicateWhitespace(newPricing));
    changedPricing = true;
  }
}

let changedStyles = false;
if (exists(stylesFile)) {
  const css = read(stylesFile);
  const newCss = patchStyles(css);
  if (newCss !== css) {
    write(stylesFile, newCss);
    changedStyles = true;
  }
}

let changedDashboard = false;
if (exists(dashboardFile)) {
  const dashboard = read(dashboardFile);
  const newDashboard = patchDashboardIntent(dashboard);
  if (newDashboard !== dashboard) {
    write(dashboardFile, newDashboard);
    changedDashboard = true;
  }
}

console.log(`Backups saved outside the repo at: ${backupDir}`);
console.log(changedIndex ? "Updated index.html with homepage Buy Premium CTAs." : "No index.html changes needed.");
console.log(changedPricing ? "Updated pricing.html Premium CTAs." : exists(pricingFile) ? "No pricing.html changes needed." : "pricing.html not found; skipped.");
console.log(changedStyles ? "Updated styles.css for the homepage Premium strip." : exists(stylesFile) ? "No styles.css changes needed." : "styles.css not found; skipped.");
console.log(changedDashboard ? "Updated dashboard.html URL-intent message." : exists(dashboardFile) ? "No dashboard.html changes needed." : "dashboard.html not found; homepage links still point to dashboard.html?upgrade=premium, so make sure your dashboard patch exists before publishing.");
console.log("Next: test locally, then git add index.html pricing.html styles.css dashboard.html scripts/apply-homepage-premium-buy.cjs && git commit && git push.");

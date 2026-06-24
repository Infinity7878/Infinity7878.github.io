#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

const dashboardEnv = process.env.DASHBOARD_ENV_FILE || "/root/storebot-dashboard.env";
loadEnvFile(dashboardEnv);
const botRoot = process.env.DASHBOARD_BOT_ROOT || "/root/smok-full/smok-store-bot-free";
loadEnvFile(process.env.DASHBOARD_BOT_ENV_FILE || path.join(botRoot, ".env"));

const secret = process.env.STOREBOT_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "";
const webhook = process.env.STOREBOT_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
const price = process.env.STOREBOT_STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID || "";

console.log("Stripe billing config check:", {
  dashboardEnv,
  botRoot,
  secretKeyPresent: Boolean(secret),
  secretKeyShape: secret ? (secret.startsWith("sk_test_") ? "test" : secret.startsWith("sk_live_") ? "live" : "unknown") : "missing",
  webhookSecretPresent: Boolean(webhook),
  webhookSecretShape: webhook ? (webhook.startsWith("whsec_") ? "looks-valid" : "unknown") : "missing",
  premiumPricePresent: Boolean(price),
  premiumPriceShape: price ? (price.startsWith("price_") ? "looks-valid" : "unknown") : "missing",
  successUrl: process.env.STOREBOT_BILLING_SUCCESS_URL || "default dashboard URL",
  cancelUrl: process.env.STOREBOT_BILLING_CANCEL_URL || "default dashboard URL"
});

if (!secret || !price || !webhook) {
  process.exitCode = 1;
  console.error("Missing required Stripe billing env. Required: STOREBOT_STRIPE_SECRET_KEY, STOREBOT_STRIPE_WEBHOOK_SECRET, STOREBOT_STRIPE_PREMIUM_PRICE_ID");
}

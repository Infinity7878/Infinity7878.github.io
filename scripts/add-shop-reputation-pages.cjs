#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const files = {
  index: path.join(root, 'index.html'),
  styles: path.join(root, 'styles.css'),
  sitemap: path.join(root, 'sitemap.xml'),
  readme: path.join(root, 'README.md'),
  shop: path.join(root, 'shop.html'),
  reputation: path.join(root, 'reputation.html'),
};

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, value) {
  fs.writeFileSync(file, value, 'utf8');
}

function backup(file) {
  if (!exists(file)) return;
  const backupName = `${file}.before-shop-reputation-${stamp}.bak`;
  fs.copyFileSync(file, backupName);
  console.log(`Backed up ${path.basename(file)} -> ${path.basename(backupName)}`);
}

function upsertByMarker(source, startMarker, endMarker, replacement, beforeNeedle) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);

  if (start !== -1 && end !== -1 && end > start) {
    return source.slice(0, start) + replacement + source.slice(end + endMarker.length);
  }

  const needleIndex = source.indexOf(beforeNeedle);
  if (needleIndex === -1) {
    throw new Error(`Could not find insertion point: ${beforeNeedle}`);
  }

  return source.slice(0, needleIndex) + replacement + '\n' + source.slice(needleIndex);
}

function addNavLinks(html, activePage = '') {
  if (html.includes('href="shop.html"') && html.includes('href="reputation.html"')) return html;

  const shopClass = activePage === 'shop' ? ' class="active"' : '';
  const reputationClass = activePage === 'reputation' ? ' class="active"' : '';
  const insert = `\n  <a${shopClass} href="shop.html">Shop Pages</a>\n  <a${reputationClass} href="reputation.html">Reputation</a>`;

  if (html.includes('<a href="pricing.html">Pricing</a>')) {
    return html.replace('<a href="pricing.html">Pricing</a>', `<a href="pricing.html">Pricing</a>${insert}`);
  }

  if (html.includes('<a class="active" href="pricing.html">Pricing</a>')) {
    return html.replace('<a class="active" href="pricing.html">Pricing</a>', `<a class="active" href="pricing.html">Pricing</a>${insert}`);
  }

  if (html.includes('<a href="autopay.html">AutoPay</a>')) {
    return html.replace('<a href="autopay.html">AutoPay</a>', `<a href="autopay.html">AutoPay</a>${insert}`);
  }

  return html;
}

function addFooterLinks(html) {
  const footerMatch = html.match(/<div class="footer-links"[\s\S]*?<\/div>/);
  if (footerMatch && footerMatch[0].includes('href="shop.html"') && footerMatch[0].includes('href="reputation.html"')) {
    return html;
  }

  return html.replace(/(<div class="footer-links"[\s\S]*?<a href="pricing\.html">Pricing<\/a>)/, '$1\n  <a href="shop.html">Shop Pages</a>\n  <a href="reputation.html">Reputation</a>');
}

const nav = (active = '') => `
 <a class="skip-link" href="#main">Skip to content</a>
 <header class="site-header" id="top">
 <nav class="nav-shell" aria-label="Primary navigation">
 <a class="brand" href="index.html" aria-label="Store Bot home">
 <img src="assets/storebot-avatar.png" alt="" class="brand-logo" width="42" height="42" />
 <span>Store Bot</span>
 </a>
 <button class="nav-toggle" id="navToggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="navLinks">
 <span></span><span></span><span></span>
 </button>
 <div class="nav-links" id="navLinks">
 <a${active === 'features' ? ' class="active"' : ''} href="features.html">Features</a>
 <a${active === 'autopay' ? ' class="active"' : ''} href="autopay.html">AutoPay</a>
 <a${active === 'pricing' ? ' class="active"' : ''} href="pricing.html">Pricing</a>
 <a${active === 'shop' ? ' class="active"' : ''} href="shop.html">Shop Pages</a>
 <a${active === 'reputation' ? ' class="active"' : ''} href="reputation.html">Reputation</a>
 <a${active === 'docs' ? ' class="active"' : ''} href="docs.html">Docs</a>
 <a href="status.html">Status</a>
 <a href="/patch-notes.html">Patch Notes</a>
 <a href="dashboard.html">Dashboard</a>
 <a href="index.html#setup">Setup</a>
 <a href="index.html#faq">FAQ</a>
 <a class="nav-cta" href="https://discord.com/oauth2/authorize?client_id=1515919161690161224&permissions=2147483648&integration_type=0&scope=bot+applications.commands">Invite Bot</a>
 </div>
 </nav>
 </header>`;

const footer = `
 <footer class="site-footer">
 <div class="container footer-grid">
 <p>© <span id="year"></span> Store Bot. Built for Discord storefronts.</p>
 <div class="footer-links" aria-label="Footer links">
 <a href="index.html">Home</a>
 <a href="features.html">Features</a>
 <a href="autopay.html">AutoPay</a>
 <a href="pricing.html">Pricing</a>
 <a href="shop.html">Shop Pages</a>
 <a href="reputation.html">Reputation</a>
 <a href="docs.html">Docs</a>
 <a href="privacy-policy.html">Privacy</a>
 <a href="tos.html">Terms</a>
 <a href="https://discord.gg/zB7NgPBzBA">Support</a>
 </div>
 </div>
 </footer>`;

const shopHtml = `<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <title>Discord Shop Pages | Store Bot Seller Websites</title>
 <meta name="description" content="Create a clean public shop page for your Discord store with products, payment links, reviews, policies, and a trusted Discord invite button." />
 <meta name="robots" content="index, follow, max-image-preview:large" />
 <meta name="author" content="Store Bot" />
 <meta name="theme-color" content="#f97316" />
 <link rel="canonical" href="https://storebot.pro/shop.html" />
 <link rel="icon" href="assets/storebot-avatar.png" />
 <link rel="stylesheet" href="styles.css?v=9" />
 <meta property="og:site_name" content="Store Bot" />
 <meta property="og:title" content="Discord Shop Pages | Store Bot" />
 <meta property="og:description" content="Turn your Discord shop into a public storefront with products, reviews, policies, and trust-focused buyer links." />
 <meta property="og:type" content="website" />
 <meta property="og:url" content="https://storebot.pro/shop.html" />
 <meta property="og:image" content="https://storebot.pro/assets/storebot-banner.png" />
 <meta name="twitter:card" content="summary_large_image" />
 <meta name="twitter:title" content="Discord Shop Pages | Store Bot" />
 <meta name="twitter:description" content="Create a public shop page for your Discord store with products, reviews, payment links, and trust signals." />
 <meta name="twitter:image" content="https://storebot.pro/assets/storebot-banner.png" />
 <script type="application/ld+json">
 {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Store Bot Shop Pages",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Discord",
  "url": "https://storebot.pro/shop.html",
  "description": "Store Bot Shop Pages help Discord sellers create public product pages with reviews, policies, payment links, and Discord invite calls to action.",
  "offers": [
   {"@type":"Offer","name":"Free","price":"0","priceCurrency":"USD"},
   {"@type":"Offer","name":"Premium","price":"3","priceCurrency":"USD"}
  ]
 }
 </script>
</head>
<body class="inner-page shop-page">
${nav('shop')}
<main id="main">
 <section class="section-pad page-hero">
  <div class="container hero-grid">
   <div class="reveal">
    <p class="eyebrow">Discord shop websites</p>
    <h1>Give your Discord shop a clean public storefront.</h1>
    <p class="hero-text">Most Discord shops are just channels, embeds, and DMs. Store Bot Shop Pages turn your products, reviews, payment instructions, policies, and Discord invite into a buyer-friendly page that looks more trustworthy.</p>
    <div class="hero-actions">
     <a class="button primary" href="https://discord.gg/zB7NgPBzBA">Request early access</a>
     <a class="button secondary" href="reputation.html">View reputation tools</a>
    </div>
    <div class="trust-row" aria-label="Shop page highlights">
     <span>Product listings</span>
     <span>Verified reviews</span>
     <span>Payment links</span>
     <span>Discord CTA</span>
    </div>
   </div>
   <article class="shop-preview-card reveal" aria-label="Example Discord shop page preview">
    <div class="shop-preview-header">
     <span class="verified-badge">Verified Store Bot seller</span>
     <strong>Nova Keys</strong>
     <p>Digital keys, setup services, and VIP access delivered through Discord.</p>
    </div>
    <div class="seller-metrics" aria-label="Example seller metrics">
     <span><strong>4.9★</strong> rating</span>
     <span><strong>128</strong> completed orders</span>
     <span><strong>12m</strong> avg response</span>
    </div>
    <div class="shop-product-list">
     <div class="product-row"><span>VIP Access</span><strong>$5.00</strong></div>
     <div class="product-row"><span>License Key</span><strong>$10.00</strong></div>
     <div class="product-row"><span>Setup Service</span><strong>$15.00</strong></div>
    </div>
    <p class="panel-note">Preview only. Sellers control their real products, prices, payment instructions, and policies.</p>
   </article>
  </div>
 </section>

 <section class="stats container reveal" aria-label="Shop page quick facts">
  <div class="stat-card"><strong>1</strong><span>public page for each seller</span></div>
  <div class="stat-card"><strong>5★</strong><span>review-focused layout</span></div>
  <div class="stat-card"><strong>$3</strong><span>Premium add-on ready</span></div>
 </section>

 <section class="section-pad" id="what-you-get">
  <div class="container">
   <div class="section-heading reveal">
    <p class="eyebrow">What sellers get</p>
    <h2>A storefront that makes Discord selling feel less sketchy.</h2>
    <p>Shop Pages are designed to help buyers understand what is being sold, how ordering works, and why the seller can be trusted before they join the Discord server.</p>
   </div>
   <div class="feature-grid">
    <article class="feature-card reveal"><span class="card-icon">01</span><h3>Public product catalog</h3><p>Show products, prices, descriptions, stock notes, delivery type, and a clear button to buy or join the Discord server.</p></article>
    <article class="feature-card reveal"><span class="card-icon">02</span><h3>Trust-first profile</h3><p>Display completed orders, response expectations, seller policies, Discord invite, payment methods, and support information.</p></article>
    <article class="feature-card reveal"><span class="card-icon">03</span><h3>Verified reviews</h3><p>Use reviews collected after Store Bot deliveries so buyers can separate real feedback from random testimonials.</p></article>
    <article class="feature-card reveal"><span class="card-icon">04</span><h3>Policy sections</h3><p>Add refund policy, delivery policy, support hours, terms, and dispute instructions without making buyers dig through channels.</p></article>
    <article class="feature-card reveal"><span class="card-icon">05</span><h3>Analytics-ready CTAs</h3><p>Track page views, Discord invite clicks, product clicks, and which listings get the most buyer attention.</p></article>
    <article class="feature-card reveal"><span class="card-icon">06</span><h3>Store Bot integration</h3><p>Start with a public page now, then connect order counts, reviews, and seller verification as Store Bot data grows.</p></article>
   </div>
  </div>
 </section>

 <section class="section-pad accent-section" id="example-flow">
  <div class="container split-grid">
   <div class="reveal">
    <p class="eyebrow">Buyer flow</p>
    <h2>Built for buyers who do not know your server yet.</h2>
    <p class="section-text">A public shop page gives people a reason to trust the seller before they join, open a ticket, or send payment.</p>
    <div class="check-list" role="list">
     <span role="listitem">Buyer finds the page from Discord, Google, a profile link, or an ad</span>
     <span role="listitem">They compare products, reviews, policies, and payment options</span>
     <span role="listitem">They join the Discord server or start the Store Bot order flow</span>
    </div>
   </div>
   <article class="notice-card reveal">
    <p class="eyebrow">Positioning</p>
    <h3>This is not a payment processor.</h3>
    <p>Shop Pages present the seller's products and trust signals. Payments still happen through the seller's configured payment method or Store Bot's existing order flow.</p>
    <a class="inline-link" href="pricing.html">See Store Bot pricing →</a>
   </article>
  </div>
 </section>

 <section class="section-pad" id="pricing-preview">
  <div class="container">
   <div class="section-heading reveal">
    <p class="eyebrow">Suggested plans</p>
    <h2>Easy to bundle with Store Bot Premium.</h2>
    <p>This page is written so you can sell Shop Pages as an add-on later without promising features that do not exist yet.</p>
   </div>
   <div class="pricing-grid">
    <article class="price-card reveal"><div><h3>Starter page</h3><p>For sellers testing a public profile.</p></div><div class="price">Free</div><ul><li>Basic public shop page</li><li>Up to 5 highlighted products</li><li>Discord invite button</li><li>Store Bot branding</li></ul><a class="button secondary full" href="https://discord.gg/zB7NgPBzBA">Ask about access</a></article>
    <article class="price-card premium reveal"><div class="badge">Premium</div><div><h3>Trusted seller page</h3><p>For active stores that want more trust signals.</p></div><div class="price">$3<span>/mo</span></div><p class="price-note">Can be bundled with Store Bot Premium.</p><ul><li>More products and custom branding</li><li>Verified review layout</li><li>Seller policies and trust badges</li><li>Basic click analytics</li></ul><a class="button primary full" href="https://discord.gg/zB7NgPBzBA">Join Support</a></article>
   </div>
  </div>
 </section>
</main>
${footer}
<script src="script.js?v=7" defer></script>
</body>
</html>
`;

const reputationHtml = `<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <title>Discord Seller Reputation Pages | Store Bot Reviews</title>
 <meta name="description" content="Build buyer trust with Discord seller reputation pages, verified order reviews, completed order counts, policy sections, and public trust badges." />
 <meta name="robots" content="index, follow, max-image-preview:large" />
 <meta name="author" content="Store Bot" />
 <meta name="theme-color" content="#f97316" />
 <link rel="canonical" href="https://storebot.pro/reputation.html" />
 <link rel="icon" href="assets/storebot-avatar.png" />
 <link rel="stylesheet" href="styles.css?v=9" />
 <meta property="og:site_name" content="Store Bot" />
 <meta property="og:title" content="Discord Seller Reputation Pages | Store Bot" />
 <meta property="og:description" content="Show verified reviews, completed order counts, policies, and trust badges for Discord sellers." />
 <meta property="og:type" content="website" />
 <meta property="og:url" content="https://storebot.pro/reputation.html" />
 <meta property="og:image" content="https://storebot.pro/assets/storebot-banner.png" />
 <meta name="twitter:card" content="summary_large_image" />
 <meta name="twitter:title" content="Discord Seller Reputation Pages | Store Bot" />
 <meta name="twitter:description" content="Build buyer trust with verified reviews and public seller reputation pages for Discord stores." />
 <meta name="twitter:image" content="https://storebot.pro/assets/storebot-banner.png" />
 <script type="application/ld+json">
 {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Store Bot Reputation Pages",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Discord",
  "url": "https://storebot.pro/reputation.html",
  "description": "Store Bot Reputation Pages help Discord sellers collect and display verified reviews, completed order counts, policy notes, and trust signals."
 }
 </script>
</head>
<body class="inner-page reputation-page">
${nav('reputation')}
<main id="main">
 <section class="section-pad page-hero">
  <div class="container hero-grid">
   <div class="reveal">
    <p class="eyebrow">Seller reputation</p>
    <h1>Make Discord sellers easier to trust.</h1>
    <p class="hero-text">Buyers hesitate when a shop only exists as a Discord channel. Reputation Pages give sellers a public trust profile with verified reviews, completed order counts, policies, and report/dispute context.</p>
    <div class="hero-actions">
     <a class="button primary" href="https://discord.gg/zB7NgPBzBA">Request early access</a>
     <a class="button secondary" href="shop.html">View shop pages</a>
    </div>
    <div class="trust-row" aria-label="Reputation highlights">
     <span>Verified reviews</span>
     <span>Order history</span>
     <span>Trust badge</span>
     <span>Policy clarity</span>
    </div>
   </div>
   <article class="reputation-card reveal" aria-label="Example seller reputation card">
    <div class="trust-score"><span>4.9</span><strong>Trusted seller score</strong><small>Based on verified Store Bot review signals</small></div>
    <div class="seller-metrics">
     <span><strong>128</strong> completed orders</span>
     <span><strong>97%</strong> positive reviews</span>
     <span><strong>0</strong> active disputes</span>
    </div>
    <div class="review-stack">
     <blockquote>“Fast delivery and clear setup instructions.” <span>Verified order</span></blockquote>
     <blockquote>“Support answered quickly after purchase.” <span>Verified order</span></blockquote>
    </div>
    <p class="panel-note">Example only. Real reputation data should be pulled from completed Store Bot orders and review prompts.</p>
   </article>
  </div>
 </section>

 <section class="section-pad" id="why-it-sells">
  <div class="container">
   <div class="section-heading reveal">
    <p class="eyebrow">Why sellers want it</p>
    <h2>Trust is the biggest problem in Discord selling.</h2>
    <p>A seller reputation page gives buyers something public to check before paying. It also gives honest sellers a cleaner way to prove they have real customers.</p>
   </div>
   <div class="feature-grid">
    <article class="feature-card reveal"><span class="card-icon">01</span><h3>Verified order reviews</h3><p>Collect reviews after delivery so sellers can show feedback connected to real Store Bot orders.</p></article>
    <article class="feature-card reveal"><span class="card-icon">02</span><h3>Public trust profile</h3><p>Give every seller a shareable profile with rating, completed orders, Discord invite, policies, and support details.</p></article>
    <article class="feature-card reveal"><span class="card-icon">03</span><h3>Dispute context</h3><p>Show clean signals like no active disputes, report handling, seller response notes, and policy transparency.</p></article>
    <article class="feature-card reveal"><span class="card-icon">04</span><h3>Trust badge</h3><p>Let sellers display a Store Bot verified badge on their shop page, Discord profile, or website widget.</p></article>
    <article class="feature-card reveal"><span class="card-icon">05</span><h3>Review moderation</h3><p>Give store owners control over obvious spam while keeping verified purchase reviews meaningful.</p></article>
    <article class="feature-card reveal"><span class="card-icon">06</span><h3>Conversion boost</h3><p>Make the seller look more established before the buyer joins the server, opens a ticket, or sends payment.</p></article>
   </div>
  </div>
 </section>

 <section class="section-pad accent-section" id="trust-signals">
  <div class="container split-grid">
   <div class="reveal">
    <p class="eyebrow">Trust signals</p>
    <h2>Show useful proof without overpromising safety.</h2>
    <p class="section-text">The copy avoids promising that every seller is safe. It focuses on transparent signals: reviews, order counts, policies, and report status.</p>
    <div class="check-list" role="list">
     <span role="listitem">Average review score and verified review count</span>
     <span role="listitem">Completed Store Bot orders and recent activity</span>
     <span role="listitem">Refund policy, delivery policy, and support expectations</span>
     <span role="listitem">Report/dispute status when moderation tools exist</span>
    </div>
   </div>
   <article class="notice-card reveal">
    <p class="eyebrow">Important</p>
    <h3>Use “verified order,” not “guaranteed safe.”</h3>
    <p>For legal and trust reasons, the site should avoid guaranteeing that a seller will never scam. The better claim is that reviews are tied to completed Store Bot orders when the seller uses Store Bot.</p>
    <a class="inline-link" href="shop.html">See shop page feature →</a>
   </article>
  </div>
 </section>

 <section class="section-pad" id="reputation-flow">
  <div class="container">
   <div class="section-heading reveal">
    <p class="eyebrow">How it works</p>
    <h2>A simple reputation loop.</h2>
    <p>Start with static public pages now. Later, connect these sections to Store Bot's real order and review data.</p>
   </div>
   <ol class="steps reveal">
    <li><strong>Order completed</strong><span>Store Bot marks the order delivered or completed.</span></li>
    <li><strong>Buyer review requested</strong><span>The customer can leave a star rating and short feedback.</span></li>
    <li><strong>Review is labeled verified</strong><span>The review is connected to a Store Bot order record instead of random public comments.</span></li>
    <li><strong>Profile updates</strong><span>The seller's public page shows fresh rating, completed order count, and trust signals.</span></li>
   </ol>
  </div>
 </section>

 <section class="section-pad cta-section">
  <div class="container">
   <div class="cta-card reveal">
    <p class="eyebrow">Next add-on</p>
    <h2>Turn Store Bot reviews into a seller trust product.</h2>
    <p>Reputation Pages are a natural upsell for sellers who already use Store Bot to manage orders and collect reviews.</p>
    <div class="hero-actions center">
     <a class="button primary" href="https://discord.gg/zB7NgPBzBA">Ask about early access</a>
     <a class="button secondary" href="pricing.html">View pricing</a>
    </div>
   </div>
  </div>
 </section>
</main>
${footer}
<script src="script.js?v=7" defer></script>
</body>
</html>
`;

const homeSection = `<!-- Store Bot Shop Reputation Section: start -->
<section class="section-pad trust-showcase-section" id="shop-reputation">
 <div class="container split-grid">
  <div class="reveal">
   <p class="eyebrow">New seller tools</p>
   <h2>Public shop pages and seller reputation for Discord stores.</h2>
   <p class="section-text">Store Bot is built for sellers who need more than a Discord channel full of product posts. Shop Pages and Reputation Pages help sellers show products, policies, completed order signals, and verified reviews in one public place.</p>
   <div class="hero-actions">
    <a class="button primary" href="shop.html">Explore Shop Pages</a>
    <a class="button secondary" href="reputation.html">View Reputation Tools</a>
   </div>
  </div>
  <article class="trust-showcase-card reveal" aria-label="Example seller trust profile">
   <span class="verified-badge">Verified Store Bot seller</span>
   <h3>Example Seller Profile</h3>
   <p>Display products, Discord invite, payment instructions, support policy, and verified order reviews from one page.</p>
   <div class="seller-metrics">
    <span><strong>4.9★</strong> rating</span>
    <span><strong>128</strong> orders</span>
    <span><strong>0</strong> active disputes</span>
   </div>
   <div class="review-stack">
    <blockquote>“Fast delivery and easy checkout.” <span>Verified order</span></blockquote>
   </div>
   <p class="panel-note">Example only. Real seller pages can connect to Store Bot order and review data as the feature grows.</p>
  </article>
 </div>
</section>
<!-- Store Bot Shop Reputation Section: end -->`;

const extraCss = `
/* Store Bot Shop + Reputation pages: start */
.trust-showcase-section {
 background: linear-gradient(90deg, rgba(251, 146, 60, 0.08), transparent 42%), rgba(255, 255, 255, 0.012);
 border-block: 1px solid var(--line);
}

.trust-showcase-card,
.shop-preview-card,
.reputation-card {
 border: 1px solid var(--line);
 background: linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.038));
 border-radius: var(--radius);
 box-shadow: var(--shadow);
 backdrop-filter: blur(14px);
 padding: 1.25rem;
}

.shop-preview-header {
 display: grid;
 gap: 0.4rem;
 padding-bottom: 1rem;
 border-bottom: 1px solid var(--line);
}

.shop-preview-header strong {
 font-size: 1.45rem;
 letter-spacing: -0.04em;
}

.shop-preview-header p,
.trust-showcase-card p,
.shop-preview-card p,
.reputation-card p,
.review-stack span,
.trust-score small {
 color: var(--muted);
}

.verified-badge {
 display: inline-flex;
 width: fit-content;
 align-items: center;
 gap: 0.45rem;
 padding: 0.45rem 0.72rem;
 border-radius: 999px;
 border: 1px solid rgba(52, 211, 153, 0.32);
 color: #bbf7d0;
 background: rgba(52, 211, 153, 0.09);
 font-size: 0.84rem;
 font-weight: 850;
}

.verified-badge::before {
 content: "✓";
 color: var(--green);
 font-weight: 1000;
}

.seller-metrics {
 display: grid;
 grid-template-columns: 1fr;
 gap: 0.7rem;
 margin: 1rem 0;
}

.seller-metrics span {
 display: block;
 padding: 0.85rem;
 border: 1px solid var(--line);
 border-radius: 16px;
 background: rgba(0, 0, 0, 0.18);
 color: var(--muted);
}

.seller-metrics strong {
 display: block;
 color: #fed7aa;
 font-size: 1.35rem;
 line-height: 1.1;
}

.shop-product-list {
 display: grid;
 gap: 0.75rem;
 margin-top: 1rem;
}

.review-stack {
 display: grid;
 gap: 0.75rem;
 margin-top: 1rem;
}

.review-stack blockquote {
 margin: 0;
 padding: 0.95rem 1rem;
 border: 1px solid var(--line);
 border-left: 4px solid #fb923c;
 border-radius: 16px;
 background: rgba(0, 0, 0, 0.18);
 color: var(--text);
 font-weight: 760;
}

.review-stack span {
 display: block;
 margin-top: 0.35rem;
 font-size: 0.86rem;
 font-weight: 800;
}

.trust-score {
 display: grid;
 gap: 0.35rem;
 padding: 1.1rem;
 border: 1px solid rgba(251, 146, 60, 0.34);
 border-radius: 20px;
 background: radial-gradient(circle at top left, rgba(251, 146, 60, 0.18), transparent 18rem), rgba(0, 0, 0, 0.16);
}

.trust-score span {
 color: #fed7aa;
 font-size: clamp(3rem, 12vw, 5rem);
 line-height: 0.9;
 font-weight: 1000;
 letter-spacing: -0.08em;
}

.trust-score strong {
 font-size: 1.2rem;
 letter-spacing: -0.035em;
}

@media (min-width: 760px) {
 .seller-metrics { grid-template-columns: repeat(3, 1fr); }
}
/* Store Bot Shop + Reputation pages: end */
`;

function updateIndex() {
  if (!exists(files.index)) {
    console.warn('index.html not found; skipping homepage injection.');
    return;
  }

  backup(files.index);
  let html = read(files.index);
  html = addNavLinks(html);
  html = addFooterLinks(html);
  html = upsertByMarker(
    html,
    '<!-- Store Bot Shop Reputation Section: start -->',
    '<!-- Store Bot Shop Reputation Section: end -->',
    homeSection,
    '<section class="section-pad" id="pricing">'
  );
  write(files.index, html);
  console.log('Updated index.html with Shop/Reputation section and nav links.');
}

function updateStyles() {
  if (!exists(files.styles)) {
    console.warn('styles.css not found; skipping styles update.');
    return;
  }

  backup(files.styles);
  let css = read(files.styles);
  const start = '/* Store Bot Shop + Reputation pages: start */';
  const end = '/* Store Bot Shop + Reputation pages: end */';
  if (css.includes(start) && css.includes(end)) {
    css = css.replace(new RegExp(`${start}[\\s\\S]*?${end}`), extraCss.trim());
  } else {
    css += `\n\n${extraCss}`;
  }
  write(files.styles, css);
  console.log('Updated styles.css with Shop/Reputation styles.');
}

function updateSitemap() {
  if (!exists(files.sitemap)) {
    console.warn('sitemap.xml not found; skipping sitemap update.');
    return;
  }

  backup(files.sitemap);
  let xml = read(files.sitemap);
  const entries = `
 <url>
  <loc>https://storebot.pro/shop.html</loc>
  <lastmod>2026-06-22</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.85</priority>
 </url>

 <url>
  <loc>https://storebot.pro/reputation.html</loc>
  <lastmod>2026-06-22</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.85</priority>
 </url>
`;

  if (!xml.includes('https://storebot.pro/shop.html')) {
    xml = xml.replace('</urlset>', `${entries}\n</urlset>`);
  }
  write(files.sitemap, xml);
  console.log('Updated sitemap.xml with shop.html and reputation.html.');
}

function updateReadme() {
  if (!exists(files.readme)) return;
  backup(files.readme);
  let md = read(files.readme);
  if (!md.includes('Shop Pages: `shop.html`')) {
    md = md.replace('  * Pricing: `pricing.html`', '  * Pricing: `pricing.html`\n  * Shop Pages: `shop.html`\n  * Reputation: `reputation.html`');
  }
  write(files.readme, md);
  console.log('Updated README.md page list.');
}

function writePages() {
  backup(files.shop);
  backup(files.reputation);
  write(files.shop, shopHtml);
  write(files.reputation, reputationHtml);
  console.log('Wrote shop.html and reputation.html.');
}

function main() {
  writePages();
  updateIndex();
  updateStyles();
  updateSitemap();
  updateReadme();

  console.log('\nDone. Next commands:');
  console.log('  git status');
  console.log('  git add index.html shop.html reputation.html styles.css sitemap.xml README.md');
  console.log('  git commit -m "Add shop and reputation pages"');
  console.log('  git push');
}

main();

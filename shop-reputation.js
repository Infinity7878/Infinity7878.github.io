(() => {
  'use strict';

  const INDEX_URL = 'data/shops-index.json';
  const DETAIL_BASE = 'data/shops/';
  const INVITE_BOT_URL = 'https://discord.com/oauth2/authorize?client_id=1515919161690161224&permissions=2147483648&integration_type=0&scope=bot+applications.commands';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = raw.includes('://') ? new URL(raw) : null;
      if (url) {
        const host = url.hostname.replace(/^www\./i, '').toLowerCase();
        const parts = url.pathname.split('/').filter(Boolean);
        if ((host === 'discord.gg' || host === 'discord.com' || host === 'discordapp.com') && parts.length) {
          if (parts[0].toLowerCase() === 'invite' && parts[1]) return parts[1].toLowerCase();
          return parts[0].toLowerCase();
        }
      }
    } catch (_) {}

    return raw
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^discord\.gg\//i, '')
      .replace(/^discord\.com\/invite\//i, '')
      .replace(/^discordapp\.com\/invite\//i, '')
      .replace(/[/?#].*$/, '')
      .toLowerCase();
  }

  function formatNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString() : '0';
  }

  function stars(value) {
    const rating = Math.max(0, Math.min(5, Number(value || 0)));
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
  }

  function getQueryTarget() {
    const params = new URLSearchParams(window.location.search);
    return params.get('server') || params.get('guild') || params.get('id') || params.get('shop') || params.get('invite') || '';
  }

  async function fetchJson(url) {
    const response = await fetch(url + (url.includes('?') ? '&' : '?') + 'ts=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load ' + url + ' (' + response.status + ')');
    return response.json();
  }

  function findShop(index, input) {
    const key = normalizeKey(input);
    const query = normalize(input);
    const shops = Array.isArray(index?.shops) ? index.shops : [];
    if (!key && !query) return null;
    return shops.find((shop) => {
      const candidates = [
        shop.serverId,
        shop.guildId,
        shop.slug,
        shop.inviteCode,
        shop.inviteUrl,
        shop.name
      ].map((item) => normalizeKey(item));
      return candidates.includes(key) || normalize(shop.name) === query;
    }) || null;
  }

  function filterShops(index, input) {
    const query = normalize(input);
    const key = normalizeKey(input);
    const shops = Array.isArray(index?.shops) ? index.shops : [];
    if (!query && !key) return shops;
    return shops.filter((shop) => {
      const haystack = [
        shop.name,
        shop.description,
        shop.serverId,
        shop.guildId,
        shop.slug,
        shop.inviteCode,
        shop.inviteUrl,
        ...(Array.isArray(shop.tags) ? shop.tags : [])
      ].map(normalize).join(' ');
      return haystack.includes(query) || haystack.includes(key);
    });
  }

  async function loadShopDetail(indexItem) {
    const slug = indexItem?.slug || indexItem?.serverId || indexItem?.guildId;
    if (!slug) throw new Error('Missing shop id');
    return fetchJson(DETAIL_BASE + encodeURIComponent(slug) + '.json');
  }

  function statusMessage(text, type = 'info') {
    return `<div class="lookup-message ${escapeHtml(type)}">${escapeHtml(text)}</div>`;
  }

  function shopCard(shop) {
    const slug = encodeURIComponent(shop.slug || shop.serverId || shop.guildId || '');
    const name = escapeHtml(shop.name || 'Unnamed shop');
    const desc = escapeHtml(shop.description || 'No description provided yet.');
    const rating = Number(shop.rating || shop.stats?.rating || 0);
    const reviews = shop.reviewCount ?? shop.stats?.reviewCount ?? 0;
    const orders = shop.completedOrders ?? shop.stats?.completedOrders ?? 0;
    const products = shop.productCount ?? (Array.isArray(shop.products) ? shop.products.length : 0);
    const tags = Array.isArray(shop.tags) ? shop.tags.slice(0, 4) : [];
    return `<article class="directory-card">
      <div class="directory-card-top">
        <div>
          <h3>${name}</h3>
          <p>${desc}</p>
        </div>
        ${shop.verified ? '<span class="verified-badge">Verified seller</span>' : '<span class="soft-badge">Listed seller</span>'}
      </div>
      <div class="seller-metrics compact">
        <span><strong>${rating ? rating.toFixed(1) + '★' : '—'}</strong> rating</span>
        <span><strong>${formatNumber(reviews)}</strong> verified reviews</span>
        <span><strong>${formatNumber(orders)}</strong> completed orders</span>
        <span><strong>${formatNumber(products)}</strong> products</span>
      </div>
      ${tags.length ? `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      <div class="card-actions">
        <a class="button primary small" href="shop.html?shop=${slug}">View shop</a>
        <a class="button secondary small" href="reputation.html?shop=${slug}">View reputation</a>
      </div>
    </article>`;
  }

  function renderDirectory(index, query = '') {
    const list = $('#shopResults');
    const count = $('#shopResultCount');
    if (!list) return;
    const results = filterShops(index, query);
    if (count) count.textContent = `${results.length} shop${results.length === 1 ? '' : 's'} found`;
    if (!results.length) {
      list.innerHTML = statusMessage('No matching Store Bot shops were found. The bot needs to be in the server and the server must have public shop pages enabled.', 'warning');
      return;
    }
    list.innerHTML = results.map(shopCard).join('');
  }

  function renderProducts(products) {
    if (!Array.isArray(products) || !products.length) {
      return statusMessage('This seller has not published any public products yet.', 'info');
    }
    return `<div class="shop-product-grid">${products.map((product) => `
      <article class="product-card-live">
        <div>
          <h3>${escapeHtml(product.name || 'Unnamed product')}</h3>
          <p>${escapeHtml(product.description || 'No product description provided.')}</p>
        </div>
        <div class="product-card-bottom">
          <strong>${escapeHtml(product.price || 'Contact seller')}</strong>
          <span>${escapeHtml(product.deliveryType || product.type || 'Store Bot delivery')}</span>
          ${product.stock ? `<small>${escapeHtml(product.stock)}</small>` : ''}
        </div>
      </article>`).join('')}</div>`;
  }

  function renderReviews(reviews) {
    const verified = Array.isArray(reviews) ? reviews.filter((review) => review.verifiedOrder === true) : [];
    if (!verified.length) {
      return statusMessage('No verified order reviews have been published for this seller yet.', 'info');
    }
    return `<div class="review-stack live-reviews">${verified.map((review) => `
      <blockquote>
        <div class="review-rating" aria-label="${escapeHtml(review.rating || 0)} out of 5 stars">${stars(review.rating)}</div>
        “${escapeHtml(review.text || 'No written feedback provided.')}”
        <span>${escapeHtml(review.author || 'Verified buyer')} · Verified Store Bot order</span>
      </blockquote>`).join('')}</div>`;
  }

  function renderPolicies(policies) {
    if (!policies || typeof policies !== 'object') return '';
    const rows = Object.entries(policies).filter(([, value]) => value);
    if (!rows.length) return '';
    return `<div class="policy-grid">${rows.map(([key, value]) => `
      <article class="notice-card compact-card">
        <p class="eyebrow">${escapeHtml(key)}</p>
        <p>${escapeHtml(value)}</p>
      </article>`).join('')}</div>`;
  }

  function renderShopDetail(shop) {
    const target = $('#shopDetail');
    if (!target) return;
    const stats = shop.stats || {};
    const rating = Number(stats.rating || 0);
    const invite = shop.inviteUrl || '#';
    const products = Array.isArray(shop.products) ? shop.products : [];
    const reviews = Array.isArray(shop.reviews) ? shop.reviews : [];
    document.title = `${shop.name || 'Discord shop'} | Store Bot Shop`;
    target.innerHTML = `<section class="section-pad page-hero generated-hero">
      <div class="container hero-grid">
        <div class="reveal visible">
          <p class="eyebrow">Generated Store Bot shop</p>
          <h1>${escapeHtml(shop.name || 'Discord shop')}</h1>
          <p class="hero-text">${escapeHtml(shop.description || 'This shop page is generated from Store Bot server data.')}</p>
          <div class="hero-actions">
            <a class="button primary" href="${escapeHtml(invite)}" target="_blank" rel="noopener">Join Discord</a>
            <a class="button secondary" href="reputation.html?shop=${encodeURIComponent(shop.slug || shop.serverId || '')}">View reputation</a>
          </div>
          <div class="trust-row">
            ${shop.verified ? '<span>Verified Store Bot seller</span>' : '<span>Public Store Bot seller</span>'}
            <span>${formatNumber(stats.completedOrders)} completed orders</span>
            <span>${formatNumber(products.length)} public products</span>
            <span>${formatNumber(stats.reviewCount)} verified reviews</span>
          </div>
          ${shop.isDemo ? '<p class="panel-note warning-note">Demo data is showing. Replace the JSON files with bot-exported server data for live shops.</p>' : ''}
        </div>
        <article class="shop-preview-card reveal visible">
          <div class="shop-preview-header">
            ${shop.verified ? '<span class="verified-badge">Verified Store Bot seller</span>' : '<span class="soft-badge">Store Bot seller</span>'}
            <strong>${escapeHtml(shop.name || 'Discord shop')}</strong>
            <p>Public seller profile generated by Store Bot.</p>
          </div>
          <div class="seller-metrics">
            <span><strong>${rating ? rating.toFixed(1) + '★' : '—'}</strong> rating</span>
            <span><strong>${formatNumber(stats.completedOrders)}</strong> completed orders</span>
            <span><strong>${stats.averageResponseMinutes ? stats.averageResponseMinutes + 'm' : '—'}</strong> avg response</span>
          </div>
        </article>
      </div>
    </section>
    <section class="section-pad compact-top">
      <div class="container">
        <div class="section-heading reveal visible">
          <p class="eyebrow">Products</p>
          <h2>Public product catalog</h2>
          <p>Products are read from Store Bot data. Buyers cannot create or edit products from this website.</p>
        </div>
        ${renderProducts(products)}
      </div>
    </section>
    <section class="section-pad accent-section">
      <div class="container split-grid">
        <div>
          <p class="eyebrow">Verified reviews</p>
          <h2>Reviews from completed Store Bot orders only.</h2>
          <p class="section-text">This page does not accept public self-submitted reviews. Reviews must be exported by the bot after a real Store Bot order is completed.</p>
          ${renderReviews(reviews)}
        </div>
        <div>${renderPolicies(shop.policies)}</div>
      </div>
    </section>`;
  }

  function renderReputationDetail(shop) {
    const target = $('#reputationDetail');
    if (!target) return;
    const stats = shop.stats || {};
    const rating = Number(stats.rating || 0);
    const positive = stats.positivePercent || 0;
    document.title = `${shop.name || 'Seller'} Reputation | Store Bot`;
    target.innerHTML = `<section class="section-pad page-hero generated-hero">
      <div class="container hero-grid">
        <div class="reveal visible">
          <p class="eyebrow">Generated reputation page</p>
          <h1>${escapeHtml(shop.name || 'Discord seller')}</h1>
          <p class="hero-text">This reputation page is generated from Store Bot order and review data. Buyers cannot add reviews directly from the website.</p>
          <div class="hero-actions">
            <a class="button primary" href="shop.html?shop=${encodeURIComponent(shop.slug || shop.serverId || '')}">View shop</a>
            <a class="button secondary" href="${escapeHtml(shop.inviteUrl || '#')}" target="_blank" rel="noopener">Join Discord</a>
          </div>
          <div class="trust-row">
            ${shop.verified ? '<span>Verified Store Bot seller</span>' : '<span>Listed Store Bot seller</span>'}
            <span>${formatNumber(stats.completedOrders)} completed orders</span>
            <span>${formatNumber(stats.reviewCount)} verified reviews</span>
            <span>${formatNumber(stats.activeDisputes)} active disputes</span>
          </div>
          ${shop.isDemo ? '<p class="panel-note warning-note">Demo data is showing. Replace the JSON files with bot-exported server data for live reputation pages.</p>' : ''}
        </div>
        <article class="reputation-card reveal visible">
          <div class="trust-score"><span>${rating ? rating.toFixed(1) : '—'}</span><strong>Seller rating</strong><small>Based only on verified Store Bot reviews</small></div>
          <div class="seller-metrics">
            <span><strong>${formatNumber(stats.completedOrders)}</strong> completed orders</span>
            <span><strong>${positive ? positive + '%' : '—'}</strong> positive reviews</span>
            <span><strong>${formatNumber(stats.activeDisputes)}</strong> active disputes</span>
          </div>
        </article>
      </div>
    </section>
    <section class="section-pad compact-top">
      <div class="container split-grid">
        <div>
          <p class="eyebrow">Verified reviews</p>
          <h2>Buyer feedback</h2>
          ${renderReviews(shop.reviews)}
        </div>
        <div>
          <p class="eyebrow">Trust signals</p>
          <h2>Seller transparency</h2>
          <div class="check-list" role="list">
            <span role="listitem">Reviews are exported by Store Bot after completed orders.</span>
            <span role="listitem">Public visitors cannot submit reputation reviews from this website.</span>
            <span role="listitem">Order counts and dispute counts come from bot data.</span>
            <span role="listitem">Store Bot does not guarantee seller safety; it displays transparent trust signals.</span>
          </div>
          ${renderPolicies(shop.policies)}
        </div>
      </div>
    </section>`;
  }

  async function initLookup(pageType) {
    const form = $('#lookupForm');
    const input = $('#lookupInput');
    const message = $('#lookupMessage');
    const detail = pageType === 'shop' ? $('#shopDetail') : $('#reputationDetail');
    let index;

    function showMessage(html) {
      if (message) message.innerHTML = html;
    }

    async function lookup(value) {
      const clean = String(value || '').trim();
      if (!clean) {
        showMessage(statusMessage('Enter a Discord server ID, shop slug, or Discord invite link.', 'info'));
        return;
      }
      showMessage(statusMessage('Searching Store Bot public shop data...', 'info'));
      if (detail) detail.innerHTML = '';
      const item = findShop(index, clean);
      if (!item) {
        showMessage(`<div class="lookup-message warning"><strong>No public shop found.</strong><br>The bot must be in that Discord server and the server must have public Shop/Reputation pages enabled. <a href="${INVITE_BOT_URL}" target="_blank" rel="noopener">Invite Store Bot</a>.</div>`);
        return;
      }
      try {
        const shop = await loadShopDetail(item);
        showMessage(statusMessage(`Loaded ${shop.name || item.name}.`, 'success'));
        if (pageType === 'shop') renderShopDetail(shop);
        else renderReputationDetail(shop);
      } catch (error) {
        showMessage(statusMessage('The shop exists in the index, but the detailed JSON file could not be loaded. Check data/shops/' + (item.slug || item.serverId) + '.json.', 'warning'));
      }
    }

    try {
      index = await fetchJson(INDEX_URL);
      renderDirectory(index);
      const target = getQueryTarget();
      if (target) {
        if (input) input.value = target;
        lookup(target);
      }
    } catch (error) {
      showMessage(statusMessage('Unable to load data/shops-index.json. Make sure the bot export has created the shop index file.', 'warning'));
    }

    if (form && input) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        lookup(input.value);
      });
      input.addEventListener('input', () => {
        if (pageType === 'shop' && index) renderDirectory(index, input.value);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const pageType = document.body.dataset.shopPage;
    if (pageType === 'shop' || pageType === 'reputation') initLookup(pageType);
  });
})();

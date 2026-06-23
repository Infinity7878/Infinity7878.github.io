(function () {
  'use strict';

  const DEFAULT_INVITE = 'https://discord.gg/zB7NgPBzBA';
  const page = document.body ? document.body.dataset.page : '';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function safeUrl(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const url = new URL(text, window.location.href);
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return '';
      return url.href;
    } catch {
      return '';
    }
  }

  function encodeState(data) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/=+$/g, '');
  }

  function decodeState(value) {
    try {
      const padded = String(value || '') + '='.repeat((4 - String(value || '').length % 4) % 4);
      return JSON.parse(decodeURIComponent(escape(atob(padded))));
    } catch {
      return null;
    }
  }

  function getHashData(key) {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    return decodeState(params.get(key));
  }

  async function copyText(text, statusEl, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      if (statusEl) statusEl.textContent = successMessage || 'Copied.';
    } catch {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
      if (statusEl) statusEl.textContent = successMessage || 'Copied.';
    }
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function parseProducts(text, fallbackLink) {
    return String(text || '').split(/\n+/).map(function (line) {
      const parts = line.split('|').map((part) => part.trim());
      if (!parts[0]) return null;
      return {
        name: parts[0],
        price: parts[1] || 'Contact',
        description: parts[2] || 'Open a Discord ticket for details.',
        link: safeUrl(parts[3]) || safeUrl(fallbackLink) || DEFAULT_INVITE
      };
    }).filter(Boolean).slice(0, 30);
  }

  function parseReviews(text) {
    return String(text || '').split(/\n+/).map(function (line) {
      const parts = line.split('|').map((part) => part.trim());
      if (!parts[0] && !parts[3]) return null;
      const rating = Math.max(1, Math.min(5, Number(parts[0]) || 5));
      return {
        rating,
        name: parts[1] || 'Customer',
        badge: parts[2] || 'Customer review',
        text: parts[3] || parts.slice(1).join(' ') || 'Positive experience.'
      };
    }).filter(Boolean).slice(0, 50);
  }

  function stars(rating) {
    const value = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    return '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(0, 5 - value);
  }

  function avgRating(reviews) {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviews.length;
  }

  const shopDemo = {
    name: 'Example Server Store',
    tagline: 'VIP access, plugins, license keys, and Discord setup services.',
    discord: DEFAULT_INVITE,
    payment: DEFAULT_INVITE,
    color: '#f97316',
    policy: 'Digital products are delivered after payment confirmation. No refunds after delivery unless required by law.',
    products: [
      { name: 'VIP Access', price: '$5/mo', description: 'Monthly perks, private role, and priority support.', link: DEFAULT_INVITE },
      { name: 'Plugin Setup', price: '$15', description: 'Installed and configured for your game or Discord server.', link: DEFAULT_INVITE },
      { name: 'License Key', price: '$10', description: 'Digital license delivered after payment confirmation.', link: DEFAULT_INVITE }
    ]
  };

  const repDemo = {
    name: 'Example Server Store',
    headline: 'Digital products, VIP perks, and fast Discord support.',
    discord: DEFAULT_INVITE,
    orders: 125,
    response: 'Under 24 hours',
    policy: 'Reviews are customer-submitted signals. Buyers should still read policies and ask questions before purchasing.',
    reviews: [
      { rating: 5, name: 'Alex', badge: 'Verified order', text: 'Fast delivery and clear setup instructions.' },
      { rating: 5, name: 'Morgan', badge: 'Repeat buyer', text: 'Product worked exactly as described and support was quick.' },
      { rating: 4, name: 'Jay', badge: 'Customer review', text: 'Good experience overall. The seller answered before I paid.' }
    ]
  };

  function productLines(products) {
    return (products || []).map((p) => [p.name, p.price, p.description, p.link].join(' | ')).join('\n');
  }

  function reviewLines(reviews) {
    return (reviews || []).map((r) => [r.rating, r.name, r.badge, r.text].join(' | ')).join('\n');
  }

  function shopDataFromForm() {
    const fallback = $('shopPayment') ? $('shopPayment').value : '';
    return {
      name: $('shopName').value.trim() || 'Untitled Shop',
      tagline: $('shopTagline').value.trim(),
      discord: safeUrl($('shopDiscord').value) || DEFAULT_INVITE,
      payment: safeUrl(fallback) || '',
      color: $('shopColor').value || '#f97316',
      policy: $('shopPolicy').value.trim(),
      products: parseProducts($('shopProducts').value, fallback)
    };
  }

  function fillShopForm(data) {
    $('shopName').value = data.name || '';
    $('shopTagline').value = data.tagline || '';
    $('shopDiscord').value = data.discord || '';
    $('shopPayment').value = data.payment || '';
    $('shopColor').value = data.color || '#f97316';
    $('shopPolicy').value = data.policy || '';
    $('shopProducts').value = productLines(data.products || []);
  }

  function renderShop(container, data) {
    if (!container) return;
    const products = data.products && data.products.length ? data.products : shopDemo.products;
    const discord = safeUrl(data.discord) || DEFAULT_INVITE;
    const color = data.color || '#f97316';
    container.style.setProperty('--profile-accent', color);
    container.innerHTML = `
      <article class="public-shop-card">
        <div class="profile-topline">
          <span class="profile-badge">Discord shop</span>
          <span>${products.length} product${products.length === 1 ? '' : 's'}</span>
        </div>
        <h3>${escapeHtml(data.name || 'Untitled Shop')}</h3>
        <p>${escapeHtml(data.tagline || 'Digital products and services sold through Discord.')}</p>
        <div class="profile-actions">
          <a class="button primary" href="${escapeHtml(discord)}" target="_blank" rel="noopener">Join Discord</a>
          ${data.payment ? `<a class="button secondary" href="${escapeHtml(data.payment)}" target="_blank" rel="noopener">Payment link</a>` : ''}
        </div>
        <div class="product-grid-generated">
          ${products.map((product) => `
            <section class="generated-product">
              <div>
                <strong>${escapeHtml(product.name)}</strong>
                <span>${escapeHtml(product.description)}</span>
              </div>
              <div class="generated-product-side">
                <b>${escapeHtml(product.price)}</b>
                <a href="${escapeHtml(safeUrl(product.link) || discord)}" target="_blank" rel="noopener">Buy / order</a>
              </div>
            </section>
          `).join('')}
        </div>
        ${data.policy ? `<div class="profile-policy"><strong>Seller policy</strong><p>${escapeHtml(data.policy)}</p></div>` : ''}
      </article>`;
  }

  function shopShareLink(data) {
    const base = window.location.href.split('#')[0].split('?')[0];
    return `${base}#shop=${encodeState(data)}`;
  }

  function initShop() {
    if (!$('shopForm')) return;
    renderShop($('shopHeroPreview'), shopDemo);

    const fromHash = getHashData('shop');
    const saved = decodeState(localStorage.getItem('storebot-shop-draft') || '');
    const initial = fromHash || saved || shopDemo;
    fillShopForm(initial);
    renderShop($('shopPreview'), initial);

    if (fromHash) {
      $('publicViewSection').hidden = false;
      $('publicShopTitle').textContent = fromHash.name || 'Shop page';
      $('publicShopSubtitle').textContent = fromHash.tagline || 'Products and policies from this seller.';
      renderShop($('publicShopView'), fromHash);
    }

    let current = initial;
    const setLinks = () => {
      const link = shopShareLink(current);
      $('openShopLink').href = link;
      return link;
    };
    setLinks();

    $('shopForm').addEventListener('submit', function (event) {
      event.preventDefault();
      current = shopDataFromForm();
      localStorage.setItem('storebot-shop-draft', encodeState(current));
      renderShop($('shopPreview'), current);
      setLinks();
      $('shopStatus').textContent = 'Shop page generated. Copy the share link or download the JSON.';
    });

    $('loadShopDemo').addEventListener('click', function () {
      fillShopForm(shopDemo);
      current = shopDemo;
      renderShop($('shopPreview'), current);
      setLinks();
      $('shopStatus').textContent = 'Demo shop loaded.';
    });

    $('resetShopBuilder').addEventListener('click', function () {
      localStorage.removeItem('storebot-shop-draft');
      fillShopForm({ color: '#f97316', products: [] });
      current = shopDataFromForm();
      renderShop($('shopPreview'), current);
      setLinks();
      $('shopStatus').textContent = 'Builder reset.';
    });

    $('copyShopLink').addEventListener('click', function () {
      current = shopDataFromForm();
      renderShop($('shopPreview'), current);
      copyText(shopShareLink(current), $('shopStatus'), 'Shop share link copied.');
    });

    $('downloadShopJson').addEventListener('click', function () {
      current = shopDataFromForm();
      downloadJson('storebot-shop-page.json', current);
      $('shopStatus').textContent = 'Shop JSON downloaded.';
    });
  }

  function repDataFromForm() {
    return {
      name: $('repName').value.trim() || 'Untitled Seller',
      headline: $('repHeadline').value.trim(),
      discord: safeUrl($('repDiscord').value) || DEFAULT_INVITE,
      orders: Math.max(0, Number($('repOrders').value) || 0),
      response: $('repResponse').value.trim(),
      policy: $('repPolicy').value.trim(),
      reviews: parseReviews($('repReviews').value)
    };
  }

  function fillRepForm(data) {
    $('repName').value = data.name || '';
    $('repHeadline').value = data.headline || '';
    $('repDiscord').value = data.discord || '';
    $('repOrders').value = data.orders || '';
    $('repResponse').value = data.response || '';
    $('repPolicy').value = data.policy || '';
    $('repReviews').value = reviewLines(data.reviews || []);
  }

  function renderRep(container, data) {
    if (!container) return;
    const reviews = data.reviews && data.reviews.length ? data.reviews : [];
    const avg = avgRating(reviews);
    const discord = safeUrl(data.discord) || DEFAULT_INVITE;
    container.innerHTML = `
      <article class="public-shop-card reputation-card">
        <div class="profile-topline">
          <span class="profile-badge">Seller reputation</span>
          <span>${reviews.length} review${reviews.length === 1 ? '' : 's'}</span>
        </div>
        <h3>${escapeHtml(data.name || 'Untitled Seller')}</h3>
        <p>${escapeHtml(data.headline || 'Seller profile and customer review signals.')}</p>
        <div class="rep-metrics">
          <div><strong>${avg ? avg.toFixed(1) : '—'}</strong><span>Average rating</span></div>
          <div><strong>${escapeHtml(String(data.orders || 0))}</strong><span>Completed orders</span></div>
          <div><strong>${escapeHtml(data.response || 'Ask seller')}</strong><span>Response time</span></div>
        </div>
        <div class="profile-actions">
          <a class="button primary" href="${escapeHtml(discord)}" target="_blank" rel="noopener">Contact seller</a>
        </div>
        <div class="reviews-list">
          ${(reviews.length ? reviews : repDemo.reviews).map((review) => `
            <section class="review-item">
              <div class="review-head"><strong>${escapeHtml(review.name)}</strong><span>${escapeHtml(review.badge)}</span></div>
              <div class="stars" aria-label="${escapeHtml(String(review.rating))} out of 5 stars">${stars(review.rating)}</div>
              <p>${escapeHtml(review.text)}</p>
            </section>
          `).join('')}
        </div>
        ${data.policy ? `<div class="profile-policy"><strong>Seller policy</strong><p>${escapeHtml(data.policy)}</p></div>` : ''}
      </article>`;
  }

  function repShareLink(data) {
    const base = window.location.href.split('#')[0].split('?')[0];
    return `${base}#rep=${encodeState(data)}`;
  }

  function repBadge(data) {
    const reviews = data.reviews || [];
    const avg = avgRating(reviews);
    const link = repShareLink(data);
    const label = avg ? `${avg.toFixed(1)}★ seller reputation` : 'Seller reputation';
    return `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:#111827;color:#fff;text-decoration:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-weight:800;"><span style="color:#fb923c;">★</span> ${escapeHtml(data.name || 'Seller')} — ${escapeHtml(label)}</a>`;
  }

  function initRep() {
    if (!$('repForm')) return;
    renderRep($('repHeroPreview'), repDemo);

    const fromHash = getHashData('rep');
    const saved = decodeState(localStorage.getItem('storebot-rep-draft') || '');
    const initial = fromHash || saved || repDemo;
    fillRepForm(initial);
    renderRep($('repPreview'), initial);

    if (fromHash) {
      $('publicRepSection').hidden = false;
      $('publicRepTitle').textContent = fromHash.name || 'Seller reputation';
      $('publicRepSubtitle').textContent = fromHash.headline || 'Reviews and seller signals from this profile.';
      renderRep($('publicRepView'), fromHash);
    }

    let current = initial;
    const setLinks = () => {
      const link = repShareLink(current);
      $('openRepLink').href = link;
      return link;
    };
    setLinks();

    $('repForm').addEventListener('submit', function (event) {
      event.preventDefault();
      current = repDataFromForm();
      localStorage.setItem('storebot-rep-draft', encodeState(current));
      renderRep($('repPreview'), current);
      setLinks();
      $('repStatus').textContent = 'Reputation profile generated. Copy the share link or trust badge.';
    });

    $('loadRepDemo').addEventListener('click', function () {
      fillRepForm(repDemo);
      current = repDemo;
      renderRep($('repPreview'), current);
      setLinks();
      $('repStatus').textContent = 'Demo profile loaded.';
    });

    $('resetRepBuilder').addEventListener('click', function () {
      localStorage.removeItem('storebot-rep-draft');
      fillRepForm({ reviews: [] });
      current = repDataFromForm();
      renderRep($('repPreview'), current);
      setLinks();
      $('repStatus').textContent = 'Builder reset.';
    });

    $('addQuickReview').addEventListener('click', function () {
      const name = $('quickReviewName').value.trim() || 'Customer';
      const rating = Number($('quickReviewRating').value) || 5;
      const text = $('quickReviewText').value.trim();
      if (!text) {
        $('repStatus').textContent = 'Add review text first.';
        return;
      }
      const currentReviews = parseReviews($('repReviews').value);
      currentReviews.push({ rating, name, badge: 'Customer review', text });
      $('repReviews').value = reviewLines(currentReviews);
      $('quickReviewName').value = '';
      $('quickReviewText').value = '';
      current = repDataFromForm();
      localStorage.setItem('storebot-rep-draft', encodeState(current));
      renderRep($('repPreview'), current);
      setLinks();
      $('repStatus').textContent = 'Review added to your local draft.';
    });

    $('copyRepLink').addEventListener('click', function () {
      current = repDataFromForm();
      renderRep($('repPreview'), current);
      copyText(repShareLink(current), $('repStatus'), 'Reputation share link copied.');
    });

    $('copyRepBadge').addEventListener('click', function () {
      current = repDataFromForm();
      copyText(repBadge(current), $('repStatus'), 'Trust badge HTML copied.');
    });

    $('downloadRepJson').addEventListener('click', function () {
      current = repDataFromForm();
      downloadJson('storebot-reputation-profile.json', current);
      $('repStatus').textContent = 'Reputation JSON downloaded.';
    });
  }

  if (page === 'shop') initShop();
  if (page === 'reputation') initRep();
}());

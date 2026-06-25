(function () {
  'use strict';

  var config = window.STOREBOT_MAINTENANCE || {};
  var activeFullMode = getFullMaintenance();

  if (activeFullMode && !isBypassed()) {
    document.documentElement.classList.add('maintenance-pending');
  }

  function normalizePath(value) {
    var path = String(value || '/').split('?')[0].split('#')[0];
    path = path.replace(/\\/g, '/');
    if (!path || path === '/') return '/index.html';
    if (path.charAt(0) !== '/') path = '/' + path;
    if (path.endsWith('/')) return path + 'index.html';
    return path;
  }

  function currentPath() {
    var path = normalizePath(window.location.pathname);
    var parts = path.split('/');
    var file = parts[parts.length - 1] || 'index.html';
    if (file.indexOf('.') === -1) return path + '.html';
    return path;
  }

  function isEnabled(item) {
    return !!(item && item.enabled === true);
  }

  function isBypassed() {
    var bypass = config.bypass || {};
    if (!bypass.enabled || !bypass.queryParam || !bypass.token || bypass.token === 'change-this-token') return false;
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get(bypass.queryParam) === bypass.token;
    } catch (error) {
      return false;
    }
  }

  function getPageRule() {
    var pages = config.pages || {};
    var path = currentPath();
    return pages[path] || pages[path.replace('/index.html', '/')] || null;
  }

  function getFullMaintenance() {
    if (isEnabled(config.site)) return config.site;
    var pageRule = getPageRule();
    if (isEnabled(pageRule)) return pageRule;
    return null;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderFullMaintenance(rule) {
    var title = rule.title || 'This page is under maintenance';
    var reason = rule.reason || 'We are working on this page right now. Please check back soon.';
    var expectedBack = rule.expectedBack || '';
    var contactUrl = rule.contactUrl || (config.site && config.site.contactUrl) || '';
    var contactLabel = rule.contactLabel || (config.site && config.site.contactLabel) || 'Contact support';

    document.title = title + ' | Store Bot';

    var robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');

    var contactButton = contactUrl
      ? '<a class="button primary" href="' + escapeHtml(contactUrl) + '">' + escapeHtml(contactLabel) + '</a>'
      : '';
    var etaLine = expectedBack
      ? '<p class="maintenance-eta"><strong>Expected back:</strong> ' + escapeHtml(expectedBack) + '</p>'
      : '';

    document.body.className = 'maintenance-page';
    document.body.innerHTML =
      '<main class="maintenance-screen" role="main" aria-labelledby="maintenanceTitle">' +
        '<section class="maintenance-card">' +
          '<div class="maintenance-mark" aria-hidden="true">SB</div>' +
          '<p class="eyebrow">Temporary maintenance</p>' +
          '<h1 id="maintenanceTitle">' + escapeHtml(title) + '</h1>' +
          '<p class="maintenance-reason">' + escapeHtml(reason) + '</p>' +
          etaLine +
          '<div class="maintenance-actions">' +
            contactButton +
            '<button class="button secondary" type="button" onclick="window.location.reload()">Refresh page</button>' +
          '</div>' +
        '</section>' +
      '</main>';

    document.documentElement.classList.remove('maintenance-pending');
    document.documentElement.classList.add('maintenance-rendered');
  }

  function renderSectionMaintenance(item) {
    if (!item || item.enabled !== true || !item.selector) return;
    var target = document.querySelector(item.selector);
    if (!target) return;

    var title = item.title || 'This section is under maintenance';
    var reason = item.reason || 'We are updating this part of the site right now.';
    var expectedBack = item.expectedBack || '';

    target.classList.add('section-maintenance-wrapper');
    target.innerHTML =
      '<div class="container">' +
        '<div class="section-maintenance-card">' +
          '<p class="eyebrow">Temporary maintenance</p>' +
          '<h2>' + escapeHtml(title) + '</h2>' +
          '<p>' + escapeHtml(reason) + '</p>' +
          (expectedBack ? '<p><strong>Expected back:</strong> ' + escapeHtml(expectedBack) + '</p>' : '') +
        '</div>' +
      '</div>';
  }

  function renderSections() {
    if (isBypassed()) return;
    var allSections = config.sections || {};
    var pageSections = allSections[currentPath()] || allSections[currentPath().replace('/index.html', '/')] || [];
    if (!Array.isArray(pageSections)) return;
    pageSections.forEach(renderSectionMaintenance);
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    if (activeFullMode && !isBypassed()) {
      renderFullMaintenance(activeFullMode);
      return;
    }
    renderSections();
  });
}());

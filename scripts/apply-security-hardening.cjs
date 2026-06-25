#!/usr/bin/env node
/*
  Store Bot website security hardening patch.
  Run from the root of Infinity7878.github.io.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(ROOT, '.security-hardening-backups', stamp);

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function backup(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  const dest = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full, dest);
}

function patchShopReputation() {
  const rel = 'shop-reputation.js';
  if (!exists(rel)) {
    console.warn('Skipped shop-reputation.js: file not found.');
    return;
  }

  backup(rel);
  let s = read(rel);

  // Harden escapeHtml so it also escapes single quotes.
  const hardenedEscape = `function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }`;

  const escapeStart = s.indexOf('function escapeHtml');
  if (escapeStart !== -1) {
    const openBrace = s.indexOf('{', escapeStart);
    let depth = 0;
    let end = -1;
    for (let i = openBrace; i < s.length; i++) {
      if (s[i] === '{') depth += 1;
      if (s[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (openBrace !== -1 && end !== -1) {
      s = s.slice(0, escapeStart) + hardenedEscape + s.slice(end);
    } else {
      console.warn('Could not parse escapeHtml() in shop-reputation.js; leaving it unchanged.');
    }
  } else {
    console.warn('Could not find escapeHtml() in shop-reputation.js; leaving it unchanged.');
  }

  // Add safeUrl helper after escapeHtml if missing.
  if (!/function\s+safeUrl\s*\(/.test(s)) {
    const safeUrl = `

  function safeUrl(url) {
    const raw = String(url ?? '').trim();
    if (!raw || raw === '#') return '#';

    try {
      const parsed = new URL(raw, window.location.origin);
      const allowedProtocols = new Set(['https:', 'http:']);
      if (!allowedProtocols.has(parsed.protocol)) return '#';

      // Relative URLs are okay for same-origin internal links. External links must be http/https.
      if (!/^https?:\\/\\//i.test(raw) && parsed.origin === window.location.origin) {
        return parsed.pathname + parsed.search + parsed.hash;
      }

      return parsed.href;
    } catch (_) {
      return '#';
    }
  }`;

    const marker = hardenedEscape;
    if (s.includes(marker)) {
      s = s.replace(marker, marker + safeUrl);
    } else {
      // Fallback: insert after the opening constants.
      s = s.replace(/(const\s+\$\$\s*=\s*[^;]+;\s*)/m, `$1${safeUrl}\n`);
    }
  }

  // Apply safeUrl to known bot-exported invite URL hrefs.
  s = s.replace(
    /const\s+invite\s*=\s*shop\.inviteUrl\s*\|\|\s*['"]#['"];?/g,
    "const invite = safeUrl(shop.inviteUrl || '#');"
  );

  s = s.replace(
    /href="\$\{escapeHtml\(shop\.inviteUrl\s*\|\|\s*['"]#['"]\)\}"/g,
    'href="${escapeHtml(safeUrl(shop.inviteUrl || \'#\'))}"'
  );

  // Generic safety for future inviteUrl href patterns.
  s = s.replace(
    /href="\$\{escapeHtml\(([^}]*inviteUrl[^}]*)\)\}"/g,
    (match, inner) => match.includes('safeUrl(') ? match : `href="\${escapeHtml(safeUrl(${inner}))}"`
  );

  write(rel, s);
  console.log('Patched shop-reputation.js');
}

function patchDashboardApiBase() {
  const rel = 'dashboard.html';
  if (!exists(rel)) {
    console.warn('Skipped dashboard.html: file not found.');
    return;
  }

  backup(rel);
  let s = read(rel);
  const before = s;

  s = s.replace(
    /const\s+API_BASE\s*=\s*\(\s*window\.STOREBOT_DASHBOARD_API_BASE\s*\|\|\s*["']https:\/\/api\.storebot\.pro["']\s*\)\.replace\(\/\\\/\+\$\/,\s*["']["']\s*\);/m,
    'const API_BASE = "https://api.storebot.pro";'
  );

  // Looser fallback for the one-line current version.
  s = s.replace(
    /const\s+API_BASE\s*=\s*\(window\.STOREBOT_DASHBOARD_API_BASE\s*\|\|\s*"https:\/\/api\.storebot\.pro"\)\.replace\(\/\\\/\+\$\/,\s*""\);/,
    'const API_BASE = "https://api.storebot.pro";'
  );

  if (s === before && s.includes('STOREBOT_DASHBOARD_API_BASE')) {
    console.warn('WARNING: dashboard.html still references STOREBOT_DASHBOARD_API_BASE. Check manually.');
  } else {
    console.log('Patched dashboard.html API base');
  }

  write(rel, s);
}

const CSP_CONTENT = "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.storebot.pro; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self' https://api.storebot.pro; upgrade-insecure-requests";

function patchHtmlSecurityMeta() {
  const htmlFiles = fs.readdirSync(ROOT)
    .filter((name) => name.toLowerCase().endsWith('.html'))
    .filter((name) => fs.statSync(path.join(ROOT, name)).isFile());

  for (const rel of htmlFiles) {
    backup(rel);
    let s = read(rel);
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${CSP_CONTENT}">`;
    const referrerMeta = '<meta name="referrer" content="strict-origin-when-cross-origin">';

    if (/http-equiv=["']Content-Security-Policy["']/i.test(s)) {
      s = s.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i, cspMeta);
    } else if (/<meta\s+charset=[^>]*>/i.test(s)) {
      s = s.replace(/(<meta\s+charset=[^>]*>)/i, `$1\n  ${cspMeta}`);
    } else {
      s = s.replace(/<head[^>]*>/i, (m) => `${m}\n  ${cspMeta}`);
    }

    if (/name=["']referrer["']/i.test(s)) {
      s = s.replace(/<meta\s+name=["']referrer["'][^>]*>/i, referrerMeta);
    } else if (s.includes(cspMeta)) {
      s = s.replace(cspMeta, `${cspMeta}\n  ${referrerMeta}`);
    }

    write(rel, s);
  }

  console.log(`Patched security meta tags in ${htmlFiles.length} HTML file(s).`);
}

function writeHeadersFile() {
  const rel = '_headers';
  backup(rel);
  const headers = `# Security headers for hosts that support _headers files, such as Cloudflare Pages or Netlify.
# GitHub Pages does not apply this file directly. If you stay on GitHub Pages behind Cloudflare,
# add these headers in Cloudflare Rules / Transform Rules instead.
/*
  Content-Security-Policy: ${CSP_CONTENT}
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
`;
  write(rel, headers);
  console.log('Wrote _headers');
}

function writeSecurityTxt() {
  const rel = path.join('.well-known', 'security.txt');
  backup(rel);
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z');
  const content = `Contact: https://discord.gg/zB7NgPBzBA
Preferred-Languages: en
Expires: ${expires}
Canonical: https://storebot.pro/.well-known/security.txt
`;
  write(rel, content);
  console.log('Wrote .well-known/security.txt');
}

function writeRobotsHint() {
  const rel = 'robots.txt';
  if (!exists(rel)) return;
  backup(rel);
  let s = read(rel);
  if (!/\.well-known\/security\.txt/i.test(s)) {
    s = s.trimEnd() + '\n\n# Security contact\nAllow: /.well-known/security.txt\n';
    write(rel, s);
    console.log('Updated robots.txt security.txt allow hint');
  }
}

function main() {
  if (!exists('index.html')) {
    console.error('Run this script from the root of the Infinity7878.github.io repo. index.html was not found.');
    process.exit(1);
  }

  fs.mkdirSync(backupDir, { recursive: true });
  patchShopReputation();
  patchDashboardApiBase();
  patchHtmlSecurityMeta();
  writeHeadersFile();
  writeSecurityTxt();
  writeRobotsHint();

  console.log('\nDone. Backups were written to:');
  console.log(backupDir);
  console.log('\nNext: run git diff, then commit and push.');
}

main();

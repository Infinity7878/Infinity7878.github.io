#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const file = path.join(root, 'patch-notes.html');

if (!fs.existsSync(file)) {
  console.error('patch-notes.html was not found. Run this from the root of the website repo.');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');
const original = html;

function insertBeforeNeedle(source, needle, insert) {
  const index = source.indexOf(needle);
  if (index === -1) throw new Error(`Could not find insertion point: ${needle}`);
  return source.slice(0, index) + insert + source.slice(index);
}

// The broken nav happens because patch-notes.html was generated as a standalone page
// without the shared site stylesheet/script that styles .site-header, .nav-shell,
// .nav-links, .nav-dropdown, and the mobile nav toggle.
if (!/href=["']styles\.css(?:\?v=[^"']*)?["']/i.test(html)) {
  const stylesheet = '  <link rel="stylesheet" href="styles.css?v=8" />\n';
  if (html.includes('  <style>')) {
    html = html.replace('  <style>', stylesheet + '  <style>');
  } else {
    html = insertBeforeNeedle(html, '</head>', stylesheet);
  }
}

if (!/href=["']assets\/storebot-avatar\.png["']/i.test(html)) {
  const icon = '  <link rel="icon" href="assets/storebot-avatar.png" />\n';
  if (html.includes('  <link rel="stylesheet"')) {
    html = html.replace(/(  <link rel="stylesheet" href="styles\.css\?v=8" \/>\n)/, icon + '$1');
  } else {
    html = insertBeforeNeedle(html, '</head>', icon);
  }
}

if (!/src=["']script\.js(?:\?v=[^"']*)?["']/i.test(html)) {
  const script = '  <script src="script.js?v=8" defer></script>\n';
  html = insertBeforeNeedle(html, '</head>', script);
}

// Match the current site footer filenames.
html = html.replace(/href="\/privacy\.html"/g, 'href="privacy-policy.html"');
html = html.replace(/href="\/terms\.html"/g, 'href="tos.html"');
html = html.replace(/href="\/dashboard\.html"/g, 'href="dashboard.html"');
html = html.replace(/href="\/docs\.html"/g, 'href="docs.html"');
html = html.replace(/href="\/status\.html"/g, 'href="status.html"');
html = html.replace(/href="\/patch-notes\.html"/g, 'href="patch-notes.html"');

if (html === original) {
  console.log('patch-notes.html already looks fixed. No changes made.');
  process.exit(0);
}

const backup = path.join(root, `patch-notes.html.before-nav-fix-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.writeFileSync(backup, original);
fs.writeFileSync(file, html);

console.log('Fixed patch-notes.html nav styling.');
console.log(`Backup saved: ${path.basename(backup)}`);

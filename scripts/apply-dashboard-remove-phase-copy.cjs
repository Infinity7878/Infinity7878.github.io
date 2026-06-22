const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'dashboard.html');
if (!fs.existsSync(file)) {
  console.error('dashboard.html not found. Run this from your GitHub Pages repo root.');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');
const before = html;

// Specific copy currently visible on the live dashboard.
html = html.replace(
  /Log in with Discord to view servers where you have Manage Server or Administrator\.\s*Phase\s*3\s*adds an owner-only command center with global bot health, server overview, reports, and maintenance controls\.\s*Server owner views remain read-only\./gi,
  'Log in with Discord to manage Store Bot across your servers. View server health, products, orders, storage usage, configuration status, and owner-only controls from one secure dashboard.'
);

html = html.replace(
  /Phase\s*3\s*starts the owner command center\.\s*Server owners can view read-only data, while Store Bot owner controls stay locked to the configured OWNER_DISCORD_ID\./gi,
  'The dashboard gives the Store Bot owner access to global health, server overviews, reports, and maintenance controls. Server managers can securely view their own server details.'
);

// Common phase/starter labels from earlier dashboard builds.
html = html.replace(/Phase\s*1\s*Dashboard/gi, 'Dashboard');
html = html.replace(/Phase\s*2\s*Controls/gi, 'Server Controls');
html = html.replace(/Phase\s*3\s*Controls/gi, 'Owner Controls');
html = html.replace(/Phase\s*3\s*Owner Command Center/gi, 'Owner Command Center');
html = html.replace(/Phase\s*3\s*Command Center/gi, 'Owner Command Center');
html = html.replace(/Phase\s*3/gi, '');
html = html.replace(/Phase\s*2/gi, '');
html = html.replace(/Phase\s*1/gi, '');

// Remove customer-facing unfinished language.
html = html.replace(/\bstarter\b/gi, '');
html = html.replace(/\btesting\b/gi, '');
html = html.replace(/\bbeta\b/gi, '');
html = html.replace(/\bcoming next\b/gi, '');
html = html.replace(/\bread-only\b/gi, 'secure');

// Clean up extra spaces left by removals.
html = html.replace(/[ \t]{2,}/g, ' ');
html = html.replace(/>\s+</g, '><');

const forbidden = [
  /Phase\s*\d/i,
  /\bstarter\b/i,
  /\btesting\b/i,
  /\bbeta\b/i,
  /\bcoming next\b/i
];

const stillBad = forbidden.filter((rx) => rx.test(html));
if (stillBad.length) {
  console.error('dashboard.html still contains unfinished wording. Matches:');
  for (const rx of stillBad) console.error(`- ${rx}`);
  const lines = html.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (forbidden.some((rx) => rx.test(line))) {
      console.error(`${i + 1}: ${line.slice(0, 240)}`);
    }
  });
  process.exit(2);
}

if (html === before) {
  console.log('No changes were needed. dashboard.html already looked production-ready.');
} else {
  fs.writeFileSync(file, html);
  console.log('Updated dashboard.html and removed phase/testing copy.');
}

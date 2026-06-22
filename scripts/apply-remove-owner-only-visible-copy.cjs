const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'dashboard.html');
if (!fs.existsSync(file)) {
  console.error('dashboard.html not found. Run this from your GitHub Pages repo root.');
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const before = s;

const removals = [
  'Owner-only controls are only visible to the Store Bot owner.',
  'Sensitive owner controls remain locked to the Store Bot owner account.',
  'Owner-only admin controls for global bot health and maintenance',
];

for (const text of removals) {
  s = s.split(text).join('');
}

// Clean up common empty paragraph/list remnants left by removing the text.
s = s
  .replace(/<p[^>]*>\s*<\/p>/gi, '')
  .replace(/<li[^>]*>\s*<\/li>/gi, '')
  .replace(/\n\s*\n\s*\n/g, '\n\n');

if (s === before) {
  console.log('No matching owner-only copy was found. dashboard.html may already be clean or the wording is different.');
} else {
  fs.writeFileSync(file, s);
  console.log('Removed owner-only visibility copy from dashboard.html.');
}

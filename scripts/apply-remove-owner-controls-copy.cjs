const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'dashboard.html');

if (!fs.existsSync(file)) {
  console.error('dashboard.html was not found. Run this from your GitHub Pages repo root.');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');
const before = html;

const exactPhrases = [
  'Sensitive owner controls remain locked to the Store Bot owner account.',
  'Sensitive owner controls remain locked to the Store Bot owner account',
  'Sensitive owner controls remain locked to the Store Bot owner account. ',
  'Sensitive owner controls remain locked to the Store Bot owner account.\n'
];

for (const phrase of exactPhrases) {
  html = html.split(phrase).join('');
}

// Remove nearby wrapper paragraphs/list items if the phrase was placed alone in HTML.
html = html.replace(/\s*<p[^>]*>\s*Sensitive owner controls remain locked to the Store Bot owner account\.?\s*<\/p>\s*/gi, '\n');
html = html.replace(/\s*<li[^>]*>\s*Sensitive owner controls remain locked to the Store Bot owner account\.?\s*<\/li>\s*/gi, '\n');
html = html.replace(/\s*<span[^>]*>\s*Sensitive owner controls remain locked to the Store Bot owner account\.?\s*<\/span>\s*/gi, '');

// Clean empty paragraphs/list leftovers.
html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
html = html.replace(/\n{3,}/g, '\n\n');

if (html === before) {
  console.log('No matching owner-controls copy was found. dashboard.html was not changed.');
} else {
  fs.writeFileSync(file, html);
  console.log('Removed owner-controls copy from dashboard.html.');
}

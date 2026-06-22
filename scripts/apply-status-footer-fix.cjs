const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'status.html');
if (!fs.existsSync(file)) {
  console.error('status.html not found. Run this script from your GitHub Pages repo root.');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');

const newFooter = `  <footer class="site-footer">
    <div class="container footer-grid">
      <p>© <span id="year"></span> Store Bot. Built for Discord storefronts.</p>
      <div class="footer-links" aria-label="Footer links">
        <a href="index.html">Home</a>
        <a href="features.html">Features</a>
        <a href="autopay.html">AutoPay</a>
        <a href="pricing.html">Pricing</a>
        <a href="docs.html">Docs</a>
        <a href="privacy-policy.html">Privacy</a>
        <a href="tos.html">Terms</a>
        <a href="https://discord.gg/zB7NgPBzBA">Support</a>
      </div>
    </div>
  </footer>`;

const footerRegex = /  <footer class="site-footer">[\s\S]*?  <\/footer>/;
if (!footerRegex.test(html)) {
  console.error('Could not find the status.html footer block.');
  process.exit(1);
}

html = html.replace(footerRegex, newFooter);

// Keep the status page JS version as-is; just make sure script.js still runs so #year is filled.
fs.writeFileSync(file, html);
console.log('Fixed status.html footer to match the main site footer layout.');

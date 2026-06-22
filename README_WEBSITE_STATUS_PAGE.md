# Store Bot Website Status Page Patch

Adds a public status page to the GitHub Pages website:

- `status.html`
- `status.json`
- navigation/footer Status link
- homepage status badge
- sitemap entry

## Install locally in the GitHub Pages repo

```bash
cd Infinity7878.github.io
cp -r /path/to/storebot-website-status-page-patch/* .
node --check scripts/apply-website-status-page.cjs
node scripts/apply-website-status-page.cjs
```

Then commit and push:

```bash
git add .
git commit -m "Add Store Bot public status page"
git push
```

After GitHub Pages deploys, visit:

```text
https://storebot.pro/status.html
```

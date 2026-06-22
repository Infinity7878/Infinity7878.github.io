# Store Bot Status Footer Fix

Fixes `status.html` footer so it matches the normal Store Bot website footer layout:

- copyright text on the left
- compact footer links on the right
- no duplicate brand/description block

Run from the GitHub Pages repo root:

```bash
node --check scripts/apply-status-footer-fix.cjs
node scripts/apply-status-footer-fix.cjs
```

# Store Bot Dashboard Site — Phase 1

Adds `dashboard.html` to the GitHub Pages site.

The dashboard calls:

```text
https://api.storebot.pro
```

It supports:

- Login with Discord
- Server selector
- Read-only server overview
- Bot health summary
- Product/order/storage counts

Run from the website repo:

```bash
node --check scripts/apply-dashboard-phase1-site.cjs
node scripts/apply-dashboard-phase1-site.cjs
```

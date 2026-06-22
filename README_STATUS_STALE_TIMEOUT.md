# Store Bot Status Stale Timeout Patch

Adds browser-side stale heartbeat detection to `status.html`.

If `status.json.updatedAt` is older than 10 minutes, the page marks the overall status and all bot-dependent services as offline/outage until a fresh VPS update arrives.

It also treats `status.json` fetch failure as an outage and removes the PM2 restarts metric from the visible site metrics.

## Install

Run from the root of your GitHub Pages repo:

```bash
node --check scripts/apply-status-stale-timeout.cjs
node scripts/apply-status-stale-timeout.cjs
```

Then commit and push:

```bash
git add status.html
git commit -m "Mark status services offline when VPS heartbeat is stale"
git push
```

## Behavior

- Fresh `status.json`: normal status display.
- `updatedAt` older than 10 minutes: major outage display.
- `status.json` cannot load: major outage display.

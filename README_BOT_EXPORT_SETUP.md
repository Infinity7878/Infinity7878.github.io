# Store Bot Shop/Reputation Export Setup

GitHub Pages cannot read private Discord bot memory or your bot database directly. The website searches static JSON files:

- `data/shops-index.json`
- `data/shops/<shop-slug>.json`

Your Store Bot needs to export those files from its real server/product/order/review data, then publish them the same way it already publishes `status.json`.

## Required bot-side flow

1. Server owner invites Store Bot.
2. Server owner enables public pages in the bot, for example `/setup public-pages enabled:true`.
3. Bot saves public page settings per guild.
4. Bot exports only public-safe fields: server name, invite URL/code, products, policies, order counts, and verified reviews.
5. Bot writes `data/shops-index.json` and `data/shops/<slug>.json` into the website repo.
6. Bot commits/pushes the website repo, or uses whatever deployment process your current `status.json` exporter uses.

## Do not export

- Buyer emails
- Payment email content
- Payment account names
- Download file paths
- Secret forwarding aliases
- Private product stock/keys
- Discord user IDs unless you intentionally want them public
- Unverified reviews

## JSON shape

See `scripts/export-shop-reputation-data.example.cjs` for the exact output structure.

## Testing locally

After your bot exports data, open:

- `shop.html`
- `shop.html?shop=<slug>`
- `reputation.html?shop=<slug>`

For GitHub Pages live URLs:

- `https://storebot.pro/shop.html?shop=<slug>`
- `https://storebot.pro/reputation.html?shop=<slug>`

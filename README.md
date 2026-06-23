# Store Bot website

[Store Bot](https://storebot.pro/) is a Discord storefront bot for selling digital products, managing orders, staff logs, discounts, gift cards, and AutoPay forwarding.

## Pages

- Homepage: `index.html`
- Features: `features.html`
- AutoPay: `autopay.html`
- Pricing: `pricing.html`
- Docs: `docs.html`
- Privacy Policy: `privacy-policy.html`
- Terms of Service: `tos.html`

## Deployment

This repo is set up for GitHub Pages with `storebot.pro` in `CNAME`.


## Shop + Reputation pages

The public shop and reputation pages read bot-exported JSON from `data/shops-index.json` and `data/shops/<slug>.json`. See `README_SHOP_REPUTATION_DATA.md` and `scripts/export-shop-reputation-data.example.cjs`. Reviews are display-only and should only be exported by Store Bot after verified completed orders.

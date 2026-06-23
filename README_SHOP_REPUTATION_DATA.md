# Store Bot Shop + Reputation Website Data

The Shop and Reputation pages are intentionally display-only. Buyers and sellers cannot add reviews from the website.

The website reads:

- `data/shops-index.json` for search results
- `data/shops/<slug>.json` for a full shop/reputation page

The included files are live-export ready and do not include demo shops. Use the same deployment process you already use for `status.json`: let the bot write the JSON file, then publish/push it to the website.

## Public URLs

- Shop lookup: `https://storebot.pro/shop.html`
- Direct shop: `https://storebot.pro/shop.html?shop=<slug>`
- Reputation lookup: `https://storebot.pro/reputation.html`
- Direct reputation: `https://storebot.pro/reputation.html?shop=<slug>`

## Required index shape

```json
{
  "version": 1,
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "shops": [
    {
      "serverId": "123456789012345678",
      "slug": "123456789012345678",
      "name": "Example Shop",
      "description": "Digital products and services.",
      "inviteCode": "abc123",
      "inviteUrl": "https://discord.gg/abc123",
      "rating": 4.9,
      "reviewCount": 24,
      "completedOrders": 128,
      "productCount": 3,
      "tags": ["keys", "vip", "plugins"],
      "verified": true,
      "activeDisputes": 0,
      "lastUpdated": "2026-06-23T00:00:00.000Z"
    }
  ]
}
```

## Required shop detail shape

```json
{
  "version": 1,
  "serverId": "123456789012345678",
  "slug": "123456789012345678",
  "name": "Example Shop",
  "description": "Digital products and services.",
  "inviteCode": "abc123",
  "inviteUrl": "https://discord.gg/abc123",
  "verified": true,
  "stats": {
    "rating": 4.9,
    "reviewCount": 24,
    "completedOrders": 128,
    "positivePercent": 97,
    "activeDisputes": 0,
    "averageResponseMinutes": 12
  },
  "products": [],
  "reviews": [
    {
      "id": "review-id",
      "rating": 5,
      "text": "Fast delivery.",
      "author": "Verified buyer",
      "createdAt": "2026-06-23T00:00:00.000Z",
      "verifiedOrder": true
    }
  ],
  "policies": {
    "refunds": "Seller refund policy.",
    "delivery": "Seller delivery policy.",
    "support": "Seller support policy."
  },
  "lastUpdated": "2026-06-23T00:00:00.000Z"
}
```

Only reviews with `verifiedOrder: true` are rendered.

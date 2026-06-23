// Example Store Bot exporter for GitHub Pages JSON files.
// This is a template. Wire the getPublicStores() function to your real Store Bot database.

const fs = require('node:fs/promises');
const path = require('node:path');

const SITE_ROOT = process.env.STOREBOT_SITE_ROOT || process.cwd();
const DATA_DIR = path.join(SITE_ROOT, 'data');
const SHOPS_DIR = path.join(DATA_DIR, 'shops');

function safeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'shop';
}

async function getPublicStores() {
  // TODO: Replace this with your real DB reads.
  // Only return servers where the owner enabled public shop/reputation pages.
  return [];
}

function verifiedReviewsOnly(reviews) {
  return (reviews || []).filter((review) => review && review.verifiedOrder === true);
}

async function main() {
  await fs.mkdir(SHOPS_DIR, { recursive: true });
  const stores = await getPublicStores();
  if (!stores.length && process.env.ALLOW_EMPTY_EXPORT !== '1') {
    console.log('No public stores returned. Refusing to overwrite existing shop data. Set ALLOW_EMPTY_EXPORT=1 to export an empty index.');
    return;
  }
  const generatedAt = new Date().toISOString();

  const index = {
    version: 1,
    generatedAt,
    source: 'Store Bot export',
    shops: []
  };

  for (const store of stores) {
    const slug = safeSlug(store.slug || store.serverId || store.guildId);
    const reviews = verifiedReviewsOnly(store.reviews);
    const rating = reviews.length
      ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length) * 10) / 10
      : 0;

    const detail = {
      version: 1,
      serverId: String(store.serverId || store.guildId),
      slug,
      name: store.name || 'Discord Shop',
      description: store.description || '',
      inviteCode: store.inviteCode || '',
      inviteUrl: store.inviteUrl || '',
      verified: Boolean(store.verified),
      stats: {
        rating,
        reviewCount: reviews.length,
        completedOrders: Number(store.completedOrders || 0),
        positivePercent: Number(store.positivePercent || 0),
        activeDisputes: Number(store.activeDisputes || 0),
        averageResponseMinutes: Number(store.averageResponseMinutes || 0)
      },
      paymentMethods: store.paymentMethods || [],
      products: store.products || [],
      reviews,
      policies: store.policies || {},
      lastUpdated: generatedAt
    };

    index.shops.push({
      serverId: detail.serverId,
      slug,
      name: detail.name,
      description: detail.description,
      inviteCode: detail.inviteCode,
      inviteUrl: detail.inviteUrl,
      rating,
      reviewCount: reviews.length,
      completedOrders: detail.stats.completedOrders,
      productCount: detail.products.length,
      tags: store.tags || [],
      verified: detail.verified,
      activeDisputes: detail.stats.activeDisputes,
      lastUpdated: generatedAt
    });

    await fs.writeFile(path.join(SHOPS_DIR, `${slug}.json`), JSON.stringify(detail, null, 2));
  }

  await fs.writeFile(path.join(DATA_DIR, 'shops-index.json'), JSON.stringify(index, null, 2));
  console.log(`Exported ${index.shops.length} public Store Bot shops.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

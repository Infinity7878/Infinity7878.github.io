// Store Bot -> storebot.pro shop/reputation exporter
// Drop this into your Store Bot project and wire getPublicStoresFromYourBotData()
// to your real Store Bot storage. This uses the same idea as exporting status.json:
// write JSON into the website repo, then git add/commit/push that repo.

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const SITE_ROOT = process.env.STOREBOT_SITE_ROOT || '/root/Infinity7878.github.io';
const DATA_DIR = path.join(SITE_ROOT, 'data');
const SHOPS_DIR = path.join(DATA_DIR, 'shops');
const SHOULD_GIT_PUSH = process.env.STOREBOT_SITE_GIT_PUSH === '1';

function safeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'shop';
}

function inviteCodeFromUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    if ((host === 'discord.gg' || host === 'discord.com' || host === 'discordapp.com') && parts.length) {
      if (parts[0].toLowerCase() === 'invite' && parts[1]) return parts[1];
      return parts[0];
    }
  } catch (_) {}
  return raw.replace(/^https?:\/\//i, '').replace(/^discord\.gg\//i, '').replace(/^discord\.com\/invite\//i, '').split(/[/?#]/)[0];
}

function verifiedReviewsOnly(reviews) {
  return (Array.isArray(reviews) ? reviews : []).filter((review) => review && review.verifiedOrder === true);
}

function averageRating(reviews) {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

function positivePercent(reviews) {
  if (!reviews.length) return 0;
  const positive = reviews.filter((review) => Number(review.rating || 0) >= 4).length;
  return Math.round((positive / reviews.length) * 100);
}

function cleanProduct(product) {
  return {
    id: String(product.id || product.productId || safeSlug(product.name || 'product')),
    name: String(product.name || 'Unnamed product'),
    price: String(product.priceText || product.price || 'Contact seller'),
    description: String(product.description || ''),
    deliveryType: String(product.deliveryType || product.type || 'Store Bot delivery'),
    stock: product.publicStockText || product.stockText || undefined
  };
}

function cleanReview(review) {
  return {
    id: String(review.id || review.reviewId || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
    text: String(review.text || review.comment || ''),
    author: String(review.author || 'Verified buyer'),
    createdAt: review.createdAt || new Date().toISOString(),
    verifiedOrder: true
  };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

async function getPublicStoresFromYourBotData() {
  // TODO: Replace this function with your real Store Bot DB reads.
  // The example below assumes optional JSON files. It is intentionally safe:
  // if the files do not exist, it exports an empty index instead of fake/demo data.

  const botDataRoot = process.env.STOREBOT_DATA_ROOT || path.join(process.cwd(), 'data');
  const stores = await readJson(path.join(botDataRoot, 'stores.json'), {});
  const products = await readJson(path.join(botDataRoot, 'products.json'), {});
  const reviews = await readJson(path.join(botDataRoot, 'reviews.json'), {});
  const orders = await readJson(path.join(botDataRoot, 'orders.json'), {});

  const rows = [];

  for (const [guildId, store] of Object.entries(stores || {})) {
    if (!store || store.publicPagesEnabled !== true) continue;

    const guildProducts = Array.isArray(products[guildId]) ? products[guildId] : [];
    const guildReviews = Array.isArray(reviews[guildId]) ? reviews[guildId] : [];
    const guildOrders = Array.isArray(orders[guildId]) ? orders[guildId] : [];
    const completedOrders = guildOrders.filter((order) => ['completed', 'delivered', 'paid'].includes(String(order.status || '').toLowerCase())).length;

    rows.push({
      serverId: guildId,
      slug: store.publicSlug || guildId,
      name: store.publicName || store.name || 'Discord Shop',
      description: store.publicDescription || store.description || '',
      inviteUrl: store.inviteUrl || '',
      verified: Boolean(store.verifiedSeller || store.premium),
      paymentMethods: store.paymentMethods || [],
      policies: {
        refunds: store.refundPolicy || '',
        delivery: store.deliveryPolicy || '',
        support: store.supportPolicy || ''
      },
      tags: store.tags || [],
      products: guildProducts.filter((p) => p && p.public !== false && p.enabled !== false),
      reviews: guildReviews,
      completedOrders,
      activeDisputes: Number(store.activeDisputes || 0),
      averageResponseMinutes: Number(store.averageResponseMinutes || 0)
    });
  }

  return rows;
}

async function exportShopReputationData(stores) {
  await fs.mkdir(SHOPS_DIR, { recursive: true });

  const generatedAt = new Date().toISOString();
  const index = {
    version: 1,
    generatedAt,
    source: 'Store Bot export',
    shops: []
  };

  const currentFiles = await fs.readdir(SHOPS_DIR).catch(() => []);
  const written = new Set();

  for (const store of stores) {
    const slug = safeSlug(store.slug || store.serverId || store.guildId);
    const verifiedReviews = verifiedReviewsOnly(store.reviews).map(cleanReview);
    const rating = averageRating(verifiedReviews);
    const products = (Array.isArray(store.products) ? store.products : []).map(cleanProduct);
    const inviteUrl = String(store.inviteUrl || '').trim();
    const inviteCode = store.inviteCode || inviteCodeFromUrl(inviteUrl);

    const detail = {
      version: 1,
      serverId: String(store.serverId || store.guildId),
      slug,
      name: String(store.name || 'Discord Shop'),
      description: String(store.description || ''),
      inviteCode,
      inviteUrl,
      verified: Boolean(store.verified),
      stats: {
        rating,
        reviewCount: verifiedReviews.length,
        completedOrders: Number(store.completedOrders || 0),
        positivePercent: positivePercent(verifiedReviews),
        activeDisputes: Number(store.activeDisputes || 0),
        averageResponseMinutes: Number(store.averageResponseMinutes || 0)
      },
      paymentMethods: Array.isArray(store.paymentMethods) ? store.paymentMethods.map(String) : [],
      products,
      reviews: verifiedReviews,
      policies: store.policies || {},
      lastUpdated: generatedAt
    };

    index.shops.push({
      serverId: detail.serverId,
      slug,
      name: detail.name,
      description: detail.description,
      inviteCode,
      inviteUrl,
      rating,
      reviewCount: verifiedReviews.length,
      completedOrders: detail.stats.completedOrders,
      productCount: products.length,
      tags: Array.isArray(store.tags) ? store.tags.map(String) : [],
      verified: detail.verified,
      activeDisputes: detail.stats.activeDisputes,
      lastUpdated: generatedAt
    });

    const fileName = `${slug}.json`;
    written.add(fileName);
    await fs.writeFile(path.join(SHOPS_DIR, fileName), JSON.stringify(detail, null, 2) + '\n');
  }

  // Remove stale old shop files so disabled stores disappear from search.
  for (const file of currentFiles) {
    if (file.endsWith('.json') && !written.has(file)) {
      await fs.rm(path.join(SHOPS_DIR, file), { force: true });
    }
  }

  index.shops.sort((a, b) => Number(b.completedOrders || 0) - Number(a.completedOrders || 0));
  await fs.writeFile(path.join(DATA_DIR, 'shops-index.json'), JSON.stringify(index, null, 2) + '\n');
  return index.shops.length;
}

async function gitPublishIfEnabled(count) {
  if (!SHOULD_GIT_PUSH) return;
  await execFileAsync('git', ['add', 'data/shops-index.json', 'data/shops'], { cwd: SITE_ROOT });
  const message = `Update Store Bot shop data (${count} shops)`;
  try {
    await execFileAsync('git', ['commit', '-m', message], { cwd: SITE_ROOT });
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}`;
    if (output.includes('nothing to commit')) return;
    throw error;
  }
  await execFileAsync('git', ['push'], { cwd: SITE_ROOT });
}

async function main() {
  const stores = await getPublicStoresFromYourBotData();
  const count = await exportShopReputationData(stores);
  await gitPublishIfEnabled(count);
  console.log(`Exported ${count} public Store Bot shop page(s).`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  exportShopReputationData
};

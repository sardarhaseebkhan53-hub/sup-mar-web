import { listingDiscovery, personalizedHome } from '../services/discoveryService.js';
import { getPublicListing } from '../services/listingService.js';
import { latestPriceDrop, listPriceHistory } from '../services/priceHistoryService.js';

export async function home(req, res) {
  res.json({ success: true, data: await personalizedHome(req.auth?.userId, String(req.query.city || '')) });
}
export async function listing(req, res) {
  const item = await getPublicListing(req.params.id);
  res.json({ success: true, data: await listingDiscovery(item) });
}
export async function priceHistory(req, res) {
  const item = await getPublicListing(req.params.id);
  res.json({ success: true, data: { history: await listPriceHistory(item.publicId, 20), priceDrop: await latestPriceDrop(item.publicId) } });
}

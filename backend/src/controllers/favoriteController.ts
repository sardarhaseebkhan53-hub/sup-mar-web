import { addFavorite, bulkRemoveFavorites, favoriteStatus, listFavorites, mergeGuestFavorites, removeFavorite, setFavoritePriceAlert } from '../services/favoriteService.js';

export async function status(req, res) { res.json({ success: true, data: await favoriteStatus(req.auth.userId, req.params.id || req.params.listingId) }); }
export async function add(req, res) { res.status(201).json({ success: true, data: await addFavorite(req.auth.userId, req.params.id || req.params.listingId, { priceAlertEnabled: req.body?.priceAlertEnabled }), message: 'Listing saved' }); }
export async function remove(req, res) { res.json({ success: true, data: await removeFavorite(req.auth.userId, req.params.id || req.params.listingId), message: 'Listing removed from favorites' }); }
export async function index(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
  const data = await listFavorites(req.auth.userId, page, limit);
  res.json({ success: true, data });
}
export async function priceAlert(req, res) { res.json({ success: true, data: await setFavoritePriceAlert(req.auth.userId, req.params.id || req.params.listingId, Boolean(req.body?.enabled ?? req.body?.priceAlertEnabled)) }); }
export async function bulkRemove(req, res) { res.json({ success: true, data: await bulkRemoveFavorites(req.auth.userId, req.body?.listingIds || []) }); }
export async function merge(req, res) { res.json({ success: true, data: await mergeGuestFavorites(req.auth.userId, req.body?.listingIds || []) }); }

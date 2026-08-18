import { listRecentlyViewed, rememberListing, removeRecentlyViewed } from '../services/recentlyViewedService.js';

export async function index(req, res) { res.json({ success: true, data: await listRecentlyViewed(req.auth.userId, Number(req.query.limit) || 20) }); }
export async function add(req, res) { await rememberListing(req.auth.userId, req.params.listingId); res.status(201).json({ success: true, data: { recorded: true } }); }
export async function clear(req, res) { res.json({ success: true, data: await removeRecentlyViewed(req.auth.userId, req.params.listingId) }); }

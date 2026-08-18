import { getOwnedListing, listSellerListings } from '../services/listingService.js';
export async function index(req, res) { res.json({ success: true, data: await listSellerListings(req.auth.userId, req.query) }); }
export async function show(req, res) { res.json({ success: true, data: await getOwnedListing(req.auth.userId, req.params.id) }); }

import { getPublicSeller, getPublicSellerListings } from '../services/publicSellerService.js';
export async function show(req,res) { res.json({ success: true, data: await getPublicSeller(req.params.username) }); }
export async function listings(req,res) { res.json({ success: true, data: await getPublicSellerListings(req.params.username, req.query.sort || 'newest') }); }

import { createListingUploadIntent } from '../services/imageService.js';
import { trackListingView } from '../services/listingAnalyticsService.js';
import { createListing, getPublicListing, presentPublicListing, relatedListings, transitionListing, updateListing } from '../services/listingService.js';
import { getPublicSellerByUserId } from '../services/publicSellerService.js';
import { rememberListing } from '../services/recentlyViewedService.js';

export async function create(req, res) { res.status(201).json({ success: true, data: await createListing(req.auth.userId, req.body), message: 'Draft created' }); }
export async function show(req, res) { const listing: any = await getPublicListing(req.params.id); const seller = listing.sellerId ? await getPublicSellerByUserId(String(listing.sellerId)) : null; res.json({ success: true, data: { ...presentPublicListing(listing), seller, isOwner: Boolean(req.auth?.userId && String(listing.sellerId) === req.auth.userId) } }); }
export async function related(req, res) { const listing = await getPublicListing(req.params.id); res.json({ success: true, data: await relatedListings(listing, 8) }); }
export async function patch(req, res) { res.json({ success: true, data: await updateListing(req.auth.userId, req.params.id, req.body), message: 'Listing saved' }); }
export async function remove(req, res) { res.json({ success: true, data: await transitionListing(req.auth.userId, req.params.id, 'remove'), message: 'Listing deleted' }); }
export async function transition(req, res) { const action = req.params.action; res.json({ success: true, data: await transitionListing(req.auth.userId, req.params.id, action), message: action === 'publish' ? 'Listing published' : `Listing marked ${action}` }); }
export async function view(req, res) { const source = `${req.auth?.userId || 'guest'}:${req.ip}:${req.get('user-agent') || ''}`; const tracked = await trackListingView(req.params.id, source); if (req.auth?.userId) await rememberListing(req.auth.userId, req.params.id); res.json({ success: true, data: tracked }); }
export async function uploadIntent(req, res) { res.json({ success: true, data: createListingUploadIntent(req.auth.userId, req.body) }); }

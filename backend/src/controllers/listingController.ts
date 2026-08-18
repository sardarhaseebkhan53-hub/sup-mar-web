import { createListingUploadIntent } from '../services/imageService.js';
import { trackListingView } from '../services/listingAnalyticsService.js';
import { createListing, getPublicListing, transitionListing, updateListing } from '../services/listingService.js';

export async function create(req, res) { res.status(201).json({ success: true, data: await createListing(req.auth.userId, req.body), message: 'Draft created' }); }
export async function show(req, res) { res.json({ success: true, data: await getPublicListing(req.params.id) }); }
export async function patch(req, res) { res.json({ success: true, data: await updateListing(req.auth.userId, req.params.id, req.body), message: 'Listing saved' }); }
export async function remove(req, res) { res.json({ success: true, data: await transitionListing(req.auth.userId, req.params.id, 'remove'), message: 'Listing deleted' }); }
export async function transition(req, res) { const action = req.params.action; res.json({ success: true, data: await transitionListing(req.auth.userId, req.params.id, action), message: action === 'publish' ? 'Listing published' : `Listing marked ${action}` }); }
export async function view(req, res) { const source = `${req.auth?.userId || 'guest'}:${req.ip}:${req.get('user-agent') || ''}`; res.json({ success: true, data: await trackListingView(req.params.id, source) }); }
export async function uploadIntent(req, res) { res.json({ success: true, data: createListingUploadIntent(req.auth.userId, req.body) }); }

import { listRecentlyViewed } from '../services/recentlyViewedService.js';
export async function index(req,res) { res.json({ success: true, data: await listRecentlyViewed(req.auth.userId, 12) }); }

import { clearRecentSearches, listRecentSearches, recordRecentSearch, removeRecentSearch } from '../services/recentSearchService.js';

export async function index(req, res) { res.json({ success: true, data: await listRecentSearches(req.auth.userId) }); }
export async function create(req, res) { res.status(201).json({ success: true, data: await recordRecentSearch(req.auth.userId, req.body) }); }
export async function remove(req, res) { res.json({ success: true, data: await removeRecentSearch(req.auth.userId, req.params.id) }); }
export async function clear(req, res) { res.json({ success: true, data: await clearRecentSearches(req.auth.userId) }); }

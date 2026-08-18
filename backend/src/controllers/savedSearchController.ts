import { createSavedSearch, deleteSavedSearch, listSavedSearches, testSavedSearch, updateSavedSearch } from '../services/savedSearchService.js';

export async function index(req, res) { res.json({ success: true, data: await listSavedSearches(req.auth.userId) }); }
export async function create(req, res) { res.status(201).json({ success: true, data: await createSavedSearch(req.auth.userId, req.body), message: 'Search saved' }); }
export async function patch(req, res) { res.json({ success: true, data: await updateSavedSearch(req.auth.userId, req.params.id, req.body) }); }
export async function remove(req, res) { res.json({ success: true, data: await deleteSavedSearch(req.auth.userId, req.params.id) }); }
export async function test(req, res) { res.json({ success: true, data: await testSavedSearch(req.auth.userId, req.params.id) }); }

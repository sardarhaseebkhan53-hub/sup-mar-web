import { addFavorite, favoriteStatus, listFavorites, removeFavorite } from '../services/favoriteService.js';
export async function status(req,res) { res.json({ success: true, data: await favoriteStatus(req.auth.userId, req.params.id) }); }
export async function add(req,res) { res.status(201).json({ success: true, data: await addFavorite(req.auth.userId, req.params.id), message: 'Listing saved' }); }
export async function remove(req,res) { res.json({ success: true, data: await removeFavorite(req.auth.userId, req.params.id), message: 'Listing removed from favorites' }); }
export async function index(req,res) { const listings = await listFavorites(req.auth.userId); res.json({ success: true, data: { listings, total: listings.length } }); }

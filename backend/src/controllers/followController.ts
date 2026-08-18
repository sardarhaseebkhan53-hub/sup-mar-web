import { followSeller, followStatus, listFollowing, unfollowSeller } from '../services/followService.js';

export async function status(req, res) { res.json({ success: true, data: await followStatus(req.auth.userId, req.params.sellerId) }); }
export async function follow(req, res) { res.status(201).json({ success: true, data: await followSeller(req.auth.userId, req.params.sellerId), message: 'Following seller' }); }
export async function unfollow(req, res) { res.json({ success: true, data: await unfollowSeller(req.auth.userId, req.params.sellerId), message: 'Unfollowed seller' }); }
export async function index(req, res) { res.json({ success: true, data: await listFollowing(req.auth.userId) }); }

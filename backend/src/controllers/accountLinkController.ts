import { confirmAccountLink, initiateAccountLink } from '../services/accountLinkService.js';

export async function initiate(req, res) { res.status(201).json({ success: true, data: await initiateAccountLink(req.auth.userId, req.body, req) }); }
export async function confirm(req, res) { res.json({ success: true, data: await confirmAccountLink(req.auth.userId, req.body, req) }); }

import { reportListing } from '../services/reportService.js';
export async function create(req,res) { res.status(201).json({ success: true, data: await reportListing(req.auth.userId, req.params.id, req.body), message: 'Report submitted for review' }); }

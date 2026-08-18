import { blockUser, listBlocks, unblockUser } from '../services/blockService.js';
import { reportUser, listMyReports } from '../services/userReportService.js';

export async function block(req, res) {
  res.json({ success: true, data: await blockUser(req.auth.userId, req.params.id) });
}

export async function unblock(req, res) {
  res.json({ success: true, data: await unblockUser(req.auth.userId, req.params.id) });
}

export async function blocks(req, res) {
  res.json({ success: true, data: await listBlocks(req.auth.userId) });
}

export async function report(req, res) {
  res.status(201).json({ success: true, data: await reportUser(req.auth.userId, req.params.id, req.body), message: 'Thanks. QAVLIO will review this report.' });
}

export async function myReports(req, res) {
  res.json({ success: true, data: await listMyReports(req.auth.userId) });
}

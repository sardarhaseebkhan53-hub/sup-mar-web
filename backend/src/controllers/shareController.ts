// @ts-nocheck
import { trackShare, getSharesForListing, getSharesForSeller } from '../services/shareService.js';
import { AppError } from '../utils/AppError.js';

export async function shareListing(req, res) {
  const { id } = req.params;
  const { method, referralCode } = req.body || {};
  const userId = req.auth?.userId || null;
  const result = await trackShare({ listingId: id, userId, method: method || 'copy', referralCode }, req);
  res.json({ success: true, data: result });
}

export async function listingShares(req, res) {
  const { id } = req.params;
  const data = await getSharesForListing(id);
  res.json({ success: true, data });
}

export async function sellerShares(req, res) {
  const sellerId = req.query.sellerId ? String(req.query.sellerId) : req.auth.userId;
  // If admin requesting other seller, allow
  if (sellerId !== req.auth.userId) {
    const isAdmin = req.auth.roles?.some((r:string)=>['admin','super_admin'].includes(r));
    if (!isAdmin) throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }
  const data = await getSharesForSeller(sellerId);
  res.json({ success: true, data });
}

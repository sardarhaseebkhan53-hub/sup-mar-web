// @ts-nocheck
import { createCoupon, updateCoupon, listCoupons, listRedemptionsForCoupon } from '../services/couponService.js';

export async function adminList(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter: any = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.scope) filter.scope = String(req.query.scope);
  if (req.query.sellerId) filter.sellerId = String(req.query.sellerId);
  if (req.query.q) filter.q = String(req.query.q);
  const data = await listCoupons(filter, page, limit);
  res.json({ success: true, data });
}

export async function adminCreate(req, res) {
  const input = req.body;
  const payload = { ...input, scope: input.scope || (input.sellerId ? 'seller' : 'platform') };
  const coupon = await createCoupon(payload, req.auth.userId);
  const { logAdminActivity } = await import('../services/adminActivityService.js');
  await logAdminActivity(req.auth.userId, 'ADMIN_COUPON_CREATED', 'coupon', String(coupon._id || coupon.id), { code: coupon.code, scope: coupon.scope }, req, 'success').catch(()=>{});
  res.status(201).json({ success: true, data: coupon });
}

export async function adminUpdate(req, res) {
  const { id } = req.params;
  const coupon = await updateCoupon(id, req.body, { userId: req.auth.userId, roles: req.auth.roles });
  const { logAdminActivity } = await import('../services/adminActivityService.js');
  await logAdminActivity(req.auth.userId, 'ADMIN_COUPON_UPDATED', 'coupon', id, { updates: Object.keys(req.body) }, req, 'success').catch(()=>{});
  res.json({ success: true, data: coupon });
}

export async function adminRedemptions(req, res) {
  const { id } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const data = await listRedemptionsForCoupon(id, page, limit);
  res.json({ success: true, data });
}

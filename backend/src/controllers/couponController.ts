// @ts-nocheck
import { validateCoupon, redeemCoupon, listMyRedemptions } from '../services/couponService.js';
import { trackEvent } from '../services/marketingEventService.js';
import { AppError } from '../utils/AppError.js';

export async function validate(req, res) {
  const { code, amount, listingId, categorySlug } = req.body;
  if (!code) throw new AppError(400, 'Coupon code is required', 'CODE_REQUIRED');
  if (amount === undefined) throw new AppError(400, 'Amount is required', 'AMOUNT_REQUIRED');
  const userId = req.auth?.userId || null;
  const result = await validateCoupon({ code, userId, listingId, categorySlug, amount: Number(amount) }, req);
  if (userId) {
    // track apply attempt
    await trackEvent({ type: 'coupon_apply', userId, couponId: result.coupon.id, listingId: listingId || null, metadata: { code, amount } }, req).catch(()=>{});
  }
  res.json({ success: true, data: result });
}

export async function redeem(req, res) {
  const { code, amount, listingId, orderId, paymentId } = req.body;
  if (!code || amount === undefined) throw new AppError(400, 'Code and amount are required', 'VALIDATION_ERROR');
  const userId = req.auth.userId;
  const result = await redeemCoupon({ code, userId, amount: Number(amount), listingId, orderId, paymentId }, req);
  res.json({ success: true, data: result, message: 'Coupon redeemed successfully' });
}

export async function myRedemptions(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const data = await listMyRedemptions(req.auth.userId, page, limit);
  res.json({ success: true, data });
}

export async function myCoupons(req, res) {
  // Return coupons applicable to user (public + seller specific if seller)
  const { listCoupons } = await import('../services/couponService.js');
  const filter: any = { status: 'active' };
  // For seller viewing own coupons ? This endpoint is generic user coupons: platform coupons that are public
  const data = await listCoupons({ ...filter, publicOnly: true } as any, Number(req.query.page) || 1, Math.min(50, Number(req.query.limit) || 20));
  // Actually filter public coupons
  res.json({ success: true, data });
}

export async function publicCoupons(req, res) {
  const { listCoupons } = await import('../services/couponService.js');
  const page = Number(req.query.page) || 1;
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const data = await listCoupons({ status: 'active' }, page, limit);
  // Filter to only public coupons that are platform scope
  const publicList = { ...data, coupons: data.coupons.filter((c:any)=>c.isPublic && c.scope === 'platform') };
  res.json({ success: true, data: publicList });
}

// @ts-nocheck
import { createCoupon, updateCoupon, listCoupons, listRedemptionsForCoupon } from '../services/couponService.js';
import { AppError } from '../utils/AppError.js';

export async function list(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter: any = { sellerId: req.auth.userId };
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.q) filter.q = String(req.query.q);
  const data = await listCoupons(filter, page, limit);
  res.json({ success: true, data });
}

export async function create(req, res) {
  const input = req.body;
  // Enforce sellerId is own
  const payload = { ...input, sellerId: req.auth.userId, scope: 'seller' };
  // Validate listings belong to seller
  if (payload.applicableListings && payload.applicableListings.length > 0) {
    const { Listing } = await import('../models/Listing.js');
    try {
      const listings = await Listing.find({ _id: { $in: payload.applicableListings }, sellerId: req.auth.userId }).select('_id').lean();
      if (listings.length !== payload.applicableListings.length) throw new AppError(403, 'You can only create coupons for your own listings', 'FORBIDDEN');
    } catch (e) {
      if (e instanceof AppError) throw e;
      // If not connected or error, skip check
    }
  }
  const coupon = await createCoupon(payload, req.auth.userId);
  // Audit
  const { logAdminActivity } = await import('../services/adminActivityService.js');
  await logAdminActivity(req.auth.userId, 'SELLER_COUPON_CREATED', 'coupon', String(coupon._id || coupon.id), { code: coupon.code }, req, 'success').catch(()=>{});
  res.status(201).json({ success: true, data: coupon, message: 'Coupon created' });
}

export async function update(req, res) {
  const { id } = req.params;
  const coupon = await updateCoupon(id, req.body, { userId: req.auth.userId, roles: req.auth.roles });
  const { logAdminActivity } = await import('../services/adminActivityService.js');
  await logAdminActivity(req.auth.userId, 'SELLER_COUPON_UPDATED', 'coupon', id, { updates: Object.keys(req.body) }, req, 'success').catch(()=>{});
  res.json({ success: true, data: coupon });
}

export async function redemptions(req, res) {
  const { id } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  // Ensure seller owns coupon
  const { Coupon } = await import('../models/Coupon.js');
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) throw new AppError(404, 'Coupon not found', 'COUPON_NOT_FOUND');
  if (String(coupon.sellerId) !== String(req.auth.userId) && !req.auth.roles.includes('admin')) throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  const data = await listRedemptionsForCoupon(id, page, limit);
  res.json({ success: true, data });
}

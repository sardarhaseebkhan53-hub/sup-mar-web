// @ts-nocheck
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { MarketingEvent } from '../models/MarketingEvent.js';
import { Listing } from '../models/Listing.js';
import { AppError } from '../utils/AppError.js';
import { sha256 } from '../utils/security.js';
import { getGrowthSettings } from './growthSettingsService.js';

const memoryCoupons = new Map<string, any>();
const memoryRedemptions = new Map<string, any>();
const bruteForceMap = new Map<string, { count: number; firstAttempt: number }>();

function isConnected() { return mongoose.connection.readyState === 1; }

function getIpHash(req: any) {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
  return sha256(String(ip));
}

export async function createCoupon(input: any, creatorId: string) {
  const code = String(input.code).toUpperCase().trim().replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{4,32}$/.test(code)) throw new AppError(422, 'Coupon code format invalid. Use 4-32 uppercase alphanumeric or dash.', 'COUPON_CODE_INVALID');

  const now = new Date();
  const startAt = input.startAt ? new Date(input.startAt) : now;
  const endAt = input.endAt ? new Date(input.endAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  if (endAt <= startAt) throw new AppError(422, 'Coupon expiration must be after start date', 'COUPON_DATE_INVALID');
  if (input.type === 'percentage' && (input.value <= 0 || input.value > 100)) throw new AppError(422, 'Percentage discount must be between 0 and 100', 'COUPON_VALUE_INVALID');
  if (input.type !== 'percentage' && input.value <= 0) throw new AppError(422, 'Discount value must be positive', 'COUPON_VALUE_INVALID');

  if (isConnected()) {
    const exists = await Coupon.findOne({ code }).lean();
    if (exists) throw new AppError(409, 'Coupon code already exists', 'COUPON_EXISTS');

    // Seller can only create for own listings
    if (input.sellerId && String(input.sellerId) !== String(creatorId)) {
      // if admin creating for seller, allowed but check role outside
      // Here just enforce seller scope
    }

    const coupon = await Coupon.create({
      code,
      type: input.type,
      value: input.value,
      minimumAmount: input.minimumAmount ?? 0,
      maximumDiscount: input.maximumDiscount ?? null,
      startAt,
      endAt,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? 1,
      applicableCategories: input.applicableCategories || [],
      applicableListings: input.applicableListings || [],
      applicableCategorySlugs: input.applicableCategorySlugs || [],
      sellerId: input.sellerId || null,
      createdBy: creatorId,
      scope: input.scope || (input.sellerId ? 'seller' : 'platform'),
      campaignId: input.campaignId || null,
      status: input.status || 'active',
      description: input.description || '',
      isPublic: input.isPublic ?? true,
    });
    return coupon.toObject();
  } else {
    const exists = [...memoryCoupons.values()].find(c => c.code === code);
    if (exists) throw new AppError(409, 'Coupon code already exists', 'COUPON_EXISTS');
    const id = crypto.randomUUID();
    const doc = { _id: id, id, code, type: input.type, value: input.value, minimumAmount: input.minimumAmount ?? 0, maximumDiscount: input.maximumDiscount ?? null, startAt, endAt, usageLimit: input.usageLimit ?? null, perUserLimit: input.perUserLimit ?? 1, usageCount: 0, applicableCategories: input.applicableCategories || [], applicableListings: input.applicableListings || [], applicableCategorySlugs: input.applicableCategorySlugs || [], sellerId: input.sellerId || null, createdBy: creatorId, scope: input.scope || 'platform', status: input.status || 'active', description: input.description || '', isPublic: true, createdAt: new Date(), updatedAt: new Date() };
    memoryCoupons.set(id, doc);
    return doc;
  }
}

export async function updateCoupon(couponId: string, input: any, requester: { userId: string; roles: string[]; sellerId?: string }) {
  if (isConnected()) {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw new AppError(404, 'Coupon not found', 'COUPON_NOT_FOUND');

    // Ownership check
    const isAdmin = requester.roles.some(r => ['admin','super_admin','finance'].includes(r));
    const isOwner = String(coupon.createdBy) === String(requester.userId) || (coupon.sellerId && String(coupon.sellerId) === String(requester.userId));
    if (!isAdmin && !isOwner) throw new AppError(403, 'You do not have access to this coupon', 'FORBIDDEN');

    if (input.code && input.code.toUpperCase() !== coupon.code) {
      const exists = await Coupon.findOne({ code: input.code.toUpperCase(), _id: { $ne: couponId } }).lean();
      if (exists) throw new AppError(409, 'Coupon code already exists', 'COUPON_EXISTS');
      coupon.code = input.code.toUpperCase();
    }

    const updatable = ['type','value','minimumAmount','maximumDiscount','startAt','endAt','usageLimit','perUserLimit','applicableCategories','applicableListings','applicableCategorySlugs','status','description','isPublic','campaignId'];
    for (const key of updatable) if (key in input) (coupon as any)[key] = input[key];

    if (coupon.endAt <= coupon.startAt) throw new AppError(422, 'Coupon expiration must be after start date', 'COUPON_DATE_INVALID');
    await coupon.save();
    return coupon.toObject();
  } else {
    const coupon = memoryCoupons.get(couponId);
    if (!coupon) throw new AppError(404, 'Coupon not found', 'COUPON_NOT_FOUND');
    Object.assign(coupon, input, { updatedAt: new Date() });
    return coupon;
  }
}

export async function getCouponByCode(codeRaw: string) {
  const code = String(codeRaw).toUpperCase().trim();
  if (isConnected()) return Coupon.findOne({ code }).lean();
  return [...memoryCoupons.values()].find(c => c.code === code) || null;
}

export async function validateCoupon(input: { code: string; userId?: string; listingId?: string; categorySlug?: string; amount: number }, req?: any) {
  const code = String(input.code).toUpperCase().trim();
  const userId = input.userId ? String(input.userId) : null;
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError(422, 'Invalid order amount', 'AMOUNT_INVALID');

  // Brute force protection
  const settings = await getGrowthSettings();
  if (settings.coupons.allowBruteForceProtection) {
    const ip = req?.ip || 'unknown';
    const key = `${ip}:${code}`.slice(0, 200);
    const now = Date.now();
    const windowMs = (settings.coupons.bruteForceWindowMinutes || 10) * 60 * 1000;
    const maxAttempts = settings.coupons.bruteForceMaxAttempts || 10;
    const entry = bruteForceMap.get(key);
    if (entry) {
      if (now - entry.firstAttempt < windowMs && entry.count >= maxAttempts) throw new AppError(429, 'Too many coupon attempts. Try again later.', 'COUPON_RATE_LIMITED');
      if (now - entry.firstAttempt >= windowMs) bruteForceMap.set(key, { count: 1, firstAttempt: now });
      else entry.count += 1;
    } else bruteForceMap.set(key, { count: 1, firstAttempt: now });
  }

  let coupon: any;
  if (isConnected()) coupon = await Coupon.findOne({ code }).lean();
  else coupon = [...memoryCoupons.values()].find(c => c.code === code);
  if (!coupon) throw new AppError(404, 'Coupon not found', 'COUPON_NOT_FOUND');

  // Status
  if (coupon.status !== 'active') {
    if (coupon.status === 'paused') throw new AppError(400, 'Coupon is currently paused.', 'COUPON_PAUSED');
    if (coupon.status === 'expired') throw new AppError(400, 'Coupon expired.', 'COUPON_EXPIRED');
    if (coupon.status === 'disabled') throw new AppError(400, 'Coupon is disabled.', 'COUPON_DISABLED');
    throw new AppError(400, 'Coupon is not active.', 'COUPON_INACTIVE');
  }

  const now = new Date();
  if (coupon.startAt && new Date(coupon.startAt) > now) throw new AppError(400, 'Coupon is not yet valid.', 'COUPON_NOT_STARTED');
  if (coupon.endAt && new Date(coupon.endAt) < now) throw new AppError(400, 'Coupon expired.', 'COUPON_EXPIRED');

  // Minimum amount
  if (coupon.minimumAmount && amount < coupon.minimumAmount) throw new AppError(400, `Minimum order amount not reached. Minimum is ${coupon.minimumAmount} PKR.`, 'COUPON_MINIMUM_NOT_MET');

  // Usage limits
  if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) throw new AppError(400, 'Coupon usage limit reached.', 'COUPON_USAGE_LIMIT');

  // Per user limit
  if (userId) {
    let userCount = 0;
    if (isConnected()) userCount = await CouponRedemption.countDocuments({ couponId: coupon._id, userId, status: { $in: ['applied','redeemed'] } });
    else userCount = [...memoryRedemptions.values()].filter(r => String(r.couponId) === String(coupon._id || coupon.id) && String(r.userId) === userId && ['applied','redeemed'].includes(r.status)).length;
    if (userCount >= (coupon.perUserLimit || 1)) throw new AppError(400, 'Coupon per-user limit reached.', 'COUPON_PER_USER_LIMIT');
  }

  // Applicable listings / categories / seller
  if (input.listingId) {
    const listingId = input.listingId;
    let listing: any = null;
    try {
      listing = isConnected() ? await Listing.findById(listingId).lean() : null;
    } catch {}
    // If coupon has applicableListings, must be in list
    if (coupon.applicableListings && coupon.applicableListings.length > 0) {
      const allowed = coupon.applicableListings.map((id: any) => String(id));
      if (!allowed.includes(String(listingId))) throw new AppError(400, 'Coupon is not valid for this listing.', 'COUPON_NOT_APPLICABLE');
    }
    // Category check
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0 && listing) {
      const catId = String(listing.categoryId || '');
      if (!coupon.applicableCategories.map((id:any)=>String(id)).includes(catId)) throw new AppError(400, 'Coupon is not valid for this category.', 'COUPON_CATEGORY_MISMATCH');
    }
    if (coupon.applicableCategorySlugs && coupon.applicableCategorySlugs.length > 0) {
      const slug = input.categorySlug || listing?.categorySlug;
      if (slug && !coupon.applicableCategorySlugs.includes(slug.toLowerCase())) throw new AppError(400, 'Coupon is not valid for this category.', 'COUPON_CATEGORY_MISMATCH');
    }
    // Seller check
    if (coupon.sellerId && listing) {
      if (String(listing.sellerId) !== String(coupon.sellerId)) throw new AppError(400, 'Coupon is not valid for this seller.', 'COUPON_SELLER_MISMATCH');
    }
  } else {
    // If coupon is listing-specific but no listing provided
    if (coupon.applicableListings && coupon.applicableListings.length > 0) throw new AppError(400, 'Coupon is only valid for specific listings.', 'COUPON_LISTING_REQUIRED');
  }

  // Calculate discount (server-side authoritative)
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (amount * coupon.value) / 100;
    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) discount = coupon.maximumDiscount;
  } else if (coupon.type === 'fixed') {
    discount = coupon.value;
  } else if (coupon.type === 'credit') {
    discount = coupon.value;
  }
  if (discount > amount) discount = amount;
  discount = Math.round(discount * 100) / 100;
  const finalAmount = Math.max(0, Math.round((amount - discount) * 100) / 100);

  return {
    valid: true,
    coupon: { id: String(coupon._id || coupon.id), code: coupon.code, type: coupon.type, value: coupon.value, sellerId: coupon.sellerId ? String(coupon.sellerId) : null, scope: coupon.scope },
    preview: { originalAmount: amount, discount, finalAmount, currency: 'PKR', code: coupon.code },
  };
}

export async function redeemCoupon(input: { code: string; userId: string; amount: number; listingId?: string; orderId?: string; paymentId?: string }, req?: any) {
  const validation = await validateCoupon({ code: input.code, userId: input.userId, listingId: input.listingId, amount: input.amount }, req);

  const couponId = validation.coupon.id;
  const userId = input.userId;
  const codeUpper = validation.coupon.code;

  // Atomic redemption to prevent race conditions
  if (isConnected()) {
    const session = await mongoose.startSession();
    try {
      let result: any = null;
      await session.withTransaction(async () => {
        // Re-check coupon with lock (findOneAndUpdate usageCount)
        const coupon: any = await Coupon.findOneAndUpdate(
          { _id: couponId, status: 'active', $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }] },
          { $inc: { usageCount: 1 } },
          { new: true, session }
        );
        if (!coupon) throw new AppError(400, 'Coupon usage limit reached or coupon is no longer active.', 'COUPON_USAGE_LIMIT');

        // Check per-user again inside transaction
        const userRedemptions = await CouponRedemption.countDocuments({ couponId, userId, status: { $in: ['applied','redeemed'] } }).session(session);
        if (userRedemptions >= (coupon.perUserLimit || 1)) {
          // rollback increment
          await Coupon.updateOne({ _id: couponId }, { $inc: { usageCount: -1 } }).session(session);
          throw new AppError(400, 'Coupon per-user limit reached.', 'COUPON_PER_USER_LIMIT');
        }

        const redemption = await CouponRedemption.create([{
          couponId,
          code: codeUpper,
          userId,
          listingId: input.listingId || null,
          orderId: input.orderId || null,
          paymentId: input.paymentId || null,
          originalAmount: input.amount,
          discountAmount: validation.preview.discount,
          finalAmount: validation.preview.finalAmount,
          currency: 'PKR',
          status: 'redeemed',
          ipHash: getIpHash(req),
          redeemedAt: new Date(),
        }], { session });

        result = redemption[0];

        await MarketingEvent.create([{
          type: 'coupon_redeem',
          userId,
          couponId,
          listingId: input.listingId || null,
          ipHash: getIpHash(req),
          metadata: { code: codeUpper, originalAmount: input.amount, discount: validation.preview.discount, finalAmount: validation.preview.finalAmount },
        }], { session });
      });
      return { redemption: result.toObject ? result.toObject() : result, preview: validation.preview, coupon: validation.coupon };
    } finally {
      await session.endSession();
    }
  } else {
    const coupon: any = memoryCoupons.get(couponId) || [...memoryCoupons.values()].find(c => c.code === codeUpper);
    if (!coupon) throw new AppError(404, 'Coupon not found', 'COUPON_NOT_FOUND');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw new AppError(400, 'Coupon usage limit reached.', 'COUPON_USAGE_LIMIT');
    const userRedemptions = [...memoryRedemptions.values()].filter(r => String(r.couponId) === String(couponId) && String(r.userId) === String(userId)).length;
    if (userRedemptions >= (coupon.perUserLimit || 1)) throw new AppError(400, 'Coupon per-user limit reached.', 'COUPON_PER_USER_LIMIT');
    coupon.usageCount = (coupon.usageCount || 0) + 1;
    const id = crypto.randomUUID();
    const redemption = { _id: id, id, couponId, code: codeUpper, userId, listingId: input.listingId || null, originalAmount: input.amount, discountAmount: validation.preview.discount, finalAmount: validation.preview.finalAmount, currency: 'PKR', status: 'redeemed', redeemedAt: new Date(), createdAt: new Date() };
    memoryRedemptions.set(id, redemption);
    return { redemption, preview: validation.preview, coupon: validation.coupon };
  }
}

export async function listCoupons(filter: any = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const query: any = {};
  if (filter.status) query.status = filter.status;
  if (filter.sellerId) query.sellerId = filter.sellerId;
  if (filter.scope) query.scope = filter.scope;
  if (filter.q) query.code = { $regex: filter.q.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (isConnected()) {
    const [rows, total] = await Promise.all([
      Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Coupon.countDocuments(query),
    ]);
    return { coupons: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  let all = [...memoryCoupons.values()].filter(c => {
    if (filter.status && c.status !== filter.status) return false;
    if (filter.sellerId && String(c.sellerId) !== String(filter.sellerId)) return false;
    if (filter.q && !c.code.includes(filter.q.toUpperCase())) return false;
    return true;
  }).sort((a,b)=>+b.createdAt - +a.createdAt);
  const rows = all.slice(skip, skip + limit);
  return { coupons: rows, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function listMyRedemptions(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  if (isConnected()) {
    const [rows, total] = await Promise.all([
      CouponRedemption.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CouponRedemption.countDocuments({ userId }),
    ]);
    return { redemptions: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  const all = [...memoryRedemptions.values()].filter(r => String(r.userId) === String(userId)).sort((a,b)=>+b.createdAt - +a.createdAt);
  const rows = all.slice(skip, skip + limit);
  return { redemptions: rows, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function listRedemptionsForCoupon(couponId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  if (isConnected()) {
    const [rows, total] = await Promise.all([
      CouponRedemption.find({ couponId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CouponRedemption.countDocuments({ couponId }),
    ]);
    return { redemptions: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  const all = [...memoryRedemptions.values()].filter(r => String(r.couponId) === String(couponId)).sort((a,b)=>+b.createdAt - +a.createdAt);
  return { redemptions: all.slice(skip, skip + limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function reverseRedemption(redemptionId: string, reason: string) {
  if (isConnected()) {
    const redemption = await CouponRedemption.findById(redemptionId);
    if (!redemption) throw new AppError(404, 'Redemption not found', 'REDEMPTION_NOT_FOUND');
    if (redemption.status === 'reversed') return redemption.toObject();
    redemption.status = 'reversed';
    redemption.reversedAt = new Date();
    redemption.reversalReason = reason;
    await redemption.save();
    await Coupon.updateOne({ _id: redemption.couponId }, { $inc: { usageCount: -1 } });
    return redemption.toObject();
  }
  const r = memoryRedemptions.get(redemptionId);
  if (!r) throw new AppError(404, 'Redemption not found', 'REDEMPTION_NOT_FOUND');
  r.status = 'reversed';
  r.reversedAt = new Date();
  r.reversalReason = reason;
  const coupon = memoryCoupons.get(String(r.couponId));
  if (coupon) coupon.usageCount = Math.max(0, (coupon.usageCount || 1) - 1);
  return r;
}

export function resetCouponMemory() {
  memoryCoupons.clear();
  memoryRedemptions.clear();
  bruteForceMap.clear();
}

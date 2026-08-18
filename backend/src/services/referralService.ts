// @ts-nocheck
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Referral } from '../models/Referral.js';
import { ReferralCode } from '../models/ReferralCode.js';
import { User } from '../models/User.js';
import { RewardLedger } from '../models/RewardLedger.js';
import { MarketingEvent } from '../models/MarketingEvent.js';
import { AppError } from '../utils/AppError.js';
import { getGrowthSettings } from './growthSettingsService.js';
import { grantCredits } from './creditService.js';
import { sha256 } from '../utils/security.js';

const CODE_PREFIX = 'QAVLIO';
const memoryReferralCodes = new Map<string, any>();
const memoryReferrals = new Map<string, any>();

function isConnected() { return mongoose.connection.readyState === 1; }

function randomSuffix(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) res += chars[bytes[i] % chars.length];
  return res;
}

function generateCode(name?: string, customPart?: string) {
  // Format QAVLIO-<NAME>-7X style, but prefer random unless custom chosen
  if (customPart) {
    const clean = customPart.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (clean.length >= 3) return `${CODE_PREFIX}-${clean}-${randomSuffix(2)}`;
  }
  if (name) {
    const base = name.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10) || 'USER';
    return `${CODE_PREFIX}-${base}-${randomSuffix(3)}`;
  }
  return `${CODE_PREFIX}-${randomSuffix(4)}-${randomSuffix(2)}`;
}

async function ensureUniqueCode(candidate: string, attempts = 5): Promise<string> {
  let code = candidate;
  for (let i = 0; i < attempts; i++) {
    if (isConnected()) {
      const exists = await ReferralCode.findOne({ code }).lean();
      if (!exists) return code;
    } else {
      if (![...memoryReferralCodes.values()].some(r => r.code === code)) return code;
    }
    code = `${CODE_PREFIX}-${randomSuffix(4)}-${randomSuffix(2)}`;
  }
  return `${CODE_PREFIX}-${randomSuffix(6)}-${randomSuffix(3)}`;
}

export async function getOrCreateReferralCode(userId: string, customCode?: string) {
  const settings = await getGrowthSettings();
  if (!settings.referral.enabled) throw new AppError(400, 'Referral program is currently disabled', 'REFERRAL_DISABLED');
  const user = await (isConnected() ? User.findById(userId).lean() : { _id: userId, name: 'User' } as any);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

  if (isConnected()) {
    let existing = await ReferralCode.findOne({ ownerId: userId }).lean();
    if (existing) {
      // allow custom code update if explicitly requested and allowed
      if (customCode && customCode !== existing.code) {
        const candidate = customCode.toUpperCase().trim();
        if (!/^[A-Z0-9-]{4,24}$/.test(candidate)) throw new AppError(422, 'Custom referral code format invalid', 'REFERRAL_CODE_INVALID');
        // If custom code contains personal info risk? we allow but validate uppercase alphanumeric and dash
        const already = await ReferralCode.findOne({ code: candidate }).lean();
        if (already && String(already.ownerId) !== String(userId)) throw new AppError(409, 'Referral code already taken', 'CODE_TAKEN');
        existing = await ReferralCode.findOneAndUpdate({ ownerId: userId }, { $set: { code: candidate, custom: true } }, { new: true }).lean();
      }
      return existing;
    }
    const base = generateCode((user as any).name, customCode);
    const code = await ensureUniqueCode(base);
    const created = await ReferralCode.create({ ownerId: userId, code, custom: Boolean(customCode) });
    return created.toObject();
  } else {
    let existing = [...memoryReferralCodes.values()].find(r => String(r.ownerId) === String(userId));
    if (existing) return existing;
    const base = generateCode('USER', customCode);
    const code = await ensureUniqueCode(base);
    const doc = { _id: crypto.randomUUID(), ownerId: userId, code, isActive: true, usageCount: 0, successfulCount: 0, totalRewards: 0, custom: Boolean(customCode), createdAt: new Date(), updatedAt: new Date() };
    memoryReferralCodes.set(doc._id, doc);
    return doc;
  }
}

export async function getMyReferralStats(userId: string) {
  const codeDoc = isConnected() ? await ReferralCode.findOne({ ownerId: userId }).lean() : [...memoryReferralCodes.values()].find(r => String(r.ownerId) === String(userId));
  if (!codeDoc) {
    return { code: null, link: null, stats: { total: 0, pending: 0, eligible: 0, rewarded: 0, rejected: 0, expired: 0, totalRewards: 0 }, referrals: [] };
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/register?ref=${codeDoc.code}`;

  let referrals: any[] = [];
  if (isConnected()) {
    referrals = await Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).limit(100).lean();
  } else {
    referrals = [...memoryReferrals.values()].filter(r => String(r.referrerId) === String(userId)).sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 100);
  }
  const stats = {
    total: referrals.length,
    pending: referrals.filter((r: any) => r.status === 'pending').length,
    eligible: referrals.filter((r: any) => r.status === 'eligible').length,
    rewarded: referrals.filter((r: any) => r.status === 'rewarded').length,
    rejected: referrals.filter((r: any) => r.status === 'rejected').length,
    expired: referrals.filter((r: any) => r.status === 'expired').length,
    totalRewards: codeDoc.totalRewards || 0,
    usageCount: codeDoc.usageCount || 0,
    successfulCount: codeDoc.successfulCount || 0,
  };
  return { code: codeDoc, link, stats, referrals: referrals.map((r: any) => ({
    id: String(r._id || r.id),
    code: r.code,
    status: r.status,
    referredId: String(r.referredId),
    createdAt: r.createdAt,
    eligibleAt: r.eligibleAt,
    rewardedAt: r.rewardedAt,
    reward: r.reward,
    eligibility: r.eligibility,
    fraud: r.fraud,
  })) };
}

function getRequestFingerprint(req: any) {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
  const ua = req?.get?.('user-agent') || '';
  return { ipHash: sha256(String(ip)), userAgent: ua.slice(0, 300), device: sha256(ua + String(ip)).slice(0, 32) };
}

export async function attributeReferral(referralCodeRaw: string, referredId: string, req: any, method: 'link' | 'code' = 'code') {
  const code = referralCodeRaw?.toUpperCase()?.trim();
  if (!code) return null;
  const settings = await getGrowthSettings();
  if (!settings.referral.enabled) return null;

  let codeDoc: any;
  if (isConnected()) {
    codeDoc = await ReferralCode.findOne({ code, isActive: true }).lean();
  } else {
    codeDoc = [...memoryReferralCodes.values()].find(r => r.code === code && r.isActive);
  }
  if (!codeDoc) throw new AppError(404, 'Referral code not found or inactive', 'REFERRAL_CODE_NOT_FOUND');

  const referrerId = String(codeDoc.ownerId);
  if (referrerId === String(referredId)) throw new AppError(400, 'You cannot refer yourself', 'SELF_REFERRAL');

  // Prevent repeated referral attempts
  if (isConnected()) {
    const exists = await Referral.findOne({ code, referredId }).lean();
    if (exists) throw new AppError(409, 'This referral has already been recorded', 'REFERRAL_EXISTS');
    const existingForUser = await Referral.findOne({ referredId }).lean();
    if (existingForUser) throw new AppError(409, 'This user already has a referrer', 'REFERRAL_ALREADY_ATTRIBUTED');
  } else {
    const exists = [...memoryReferrals.values()].find(r => r.code === code && String(r.referredId) === String(referredId));
    if (exists) throw new AppError(409, 'This referral has already been recorded', 'REFERRAL_EXISTS');
  }

  // Abuse checks
  const { ipHash, userAgent, device } = getRequestFingerprint(req);

  // Volume check: max per day per referrer
  let recentCount = 0;
  if (isConnected()) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    recentCount = await Referral.countDocuments({ referrerId, createdAt: { $gte: since } });
  } else {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    recentCount = [...memoryReferrals.values()].filter(r => String(r.referrerId) === referrerId && +new Date(r.createdAt) >= since).length;
  }
  if (recentCount >= (settings.referral.fraud.maxPerDay || 20)) throw new AppError(429, 'Referral limit reached for today. Try again later.', 'REFERRAL_RATE_LIMITED');

  // Check self-referral by IP? We do NOT auto punish, but flag suspicious if same IP appears repeatedly
  let suspicious = false;
  const suspiciousReasons: string[] = [];
  if (isConnected()) {
    const sameIpCount = await Referral.countDocuments({ referrerId, ipHash, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    if (sameIpCount >= 5) { suspicious = true; suspiciousReasons.push('repeated_ip_pattern'); }
    if (recentCount >= (settings.referral.fraud.flagVolume || 50)) { suspicious = true; suspiciousReasons.push('high_volume'); }
  }

  const expirationDays = settings.referral.expirationDays || 30;
  const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

  const payload: any = {
    code,
    referralCodeId: codeDoc._id || codeDoc.id,
    referrerId,
    referredId,
    status: 'pending',
    attributionMethod: method,
    ipHash,
    deviceFingerprint: device,
    userAgent,
    eligibility: {
      verifiedEmail: false,
      minimumActivity: false,
      firstListing: false,
      firstTransaction: false,
      newAccountOnly: true,
      checkedAt: null,
    },
    reward: {
      type: settings.referral.rewardType,
      amount: settings.referral.rewardAmount,
      currency: settings.referral.rewardCurrency,
    },
    fraud: {
      isSuspicious: suspicious,
      reasons: suspiciousReasons,
      riskScore: suspicious ? 60 : 0,
      flaggedAt: suspicious ? new Date() : null,
    },
    expiresAt,
  };

  let referralDoc: any;
  if (isConnected()) {
    referralDoc = await Referral.create(payload);
    await ReferralCode.updateOne({ _id: codeDoc._id }, { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } });
    await MarketingEvent.create({
      type: 'referral_signup',
      userId: referredId,
      referralCodeId: codeDoc._id,
      referralId: referralDoc._id,
      ipHash,
      userAgent,
      metadata: { code, method, suspicious },
    });
  } else {
    const id = crypto.randomUUID();
    referralDoc = { _id: id, id, ...payload, createdAt: new Date(), updatedAt: new Date() };
    memoryReferrals.set(id, referralDoc);
    const owner = memoryReferralCodes.get(String(codeDoc._id || codeDoc.id));
    if (owner) { owner.usageCount = (owner.usageCount || 0) + 1; owner.lastUsedAt = new Date(); }
  }

  // Track link view also via MarketingEvent if needed elsewhere
  return referralDoc;
}

export async function evaluateReferralEligibility(referredId: string) {
  const settings = await getGrowthSettings();
  let referral: any;
  if (isConnected()) {
    referral = await Referral.findOne({ referredId, status: { $in: ['pending', 'eligible'] } }).sort({ createdAt: -1 });
  } else {
    referral = [...memoryReferrals.values()].filter(r => String(r.referredId) === String(referredId) && ['pending','eligible'].includes(r.status)).sort((a,b)=>+b.createdAt - +a.createdAt)[0];
  }
  if (!referral) return null;

  const user: any = isConnected() ? await User.findById(referredId).lean() : { verification: { email: { status: 'verified' } } };
  if (!user) return null;

  const eligibility: any = { ...referral.eligibility };
  let ok = true;

  // newAccountOnly already enforced by single referral
  // verified email
  if (settings.referral.eligibility.requireVerifiedEmail) {
    const verified = user.verification?.email?.status === 'verified' || user.verification?.email?.status === 'VERIFIED';
    eligibility.verifiedEmail = Boolean(verified);
    if (!verified) ok = false;
  } else {
    eligibility.verifiedEmail = true;
  }

  // first listing - we can check Listing model count
  if (settings.referral.eligibility.requireFirstListing) {
    try {
      const { Listing } = await import('../models/Listing.js');
      const count = isConnected() ? await Listing.countDocuments({ sellerId: referredId }) : 0;
      eligibility.firstListing = count > 0;
      if (count === 0) ok = false;
    } catch { eligibility.firstListing = true; }
  } else {
    eligibility.firstListing = true;
  }

  // For demo, we mark minimumActivity as true after verification, and firstTransaction placeholder
  eligibility.minimumActivity = true;
  eligibility.firstTransaction = true; // could integrate with order logic
  eligibility.checkedAt = new Date();

  if (isConnected()) {
    referral.eligibility = eligibility;
    if (ok && referral.status === 'pending') {
      referral.status = 'eligible';
      referral.eligibleAt = new Date();
    }
    await referral.save();
  } else {
    referral.eligibility = eligibility;
    if (ok) { referral.status = 'eligible'; referral.eligibleAt = new Date(); }
    memoryReferrals.set(String(referral._id || referral.id), referral);
  }

  if (ok) {
    await issueReferralReward(referral);
  }
  return referral;
}

export async function issueReferralReward(referral: any) {
  if (!referral || referral.status === 'rewarded') return referral;
  const settings = await getGrowthSettings();
  const referrerId = referral.referrerId;
  const rewardType = referral.reward?.type || settings.referral.rewardType;
  const amount = referral.reward?.amount || settings.referral.rewardAmount;
  const currency = referral.reward?.currency || 'PKR';

  let ledger: any = null;
  if (isConnected()) {
    const ledgerDoc: any = await RewardLedger.create({
      userId: referrerId,
      type: 'referral',
      amount,
      currency,
      points: rewardType === 'points' ? amount : 0,
      source: 'referral',
      referenceId: referral._id,
      referenceModel: 'Referral',
      status: 'available',
      description: `Referral reward for ${referral.code}`,
      expiresAt: settings.rewards.expirationEnabled ? new Date(Date.now() + (settings.rewards.defaultExpirationDays || 90) * 24 * 60 * 60 * 1000) : null,
    });

    // Grant actual credits if needed
    if (rewardType === 'listing_credit') {
      await grantCredits(String(referrerId), { listingCredits: Math.floor(amount / 100) || 1, reason: `Referral ${referral.code}`, referenceId: String(ledgerDoc._id) });
    } else if (rewardType === 'promotion_credit') {
      await grantCredits(String(referrerId), { promotionCredits: Math.floor(amount / 100) || 1, reason: `Referral ${referral.code}`, referenceId: String(ledgerDoc._id) });
    }

    await Referral.updateOne({ _id: referral._id }, { $set: { status: 'rewarded', rewardedAt: new Date(), 'reward.rewardLedgerId': ledgerDoc._id, 'reward.issuedAt': new Date() } });
    await ReferralCode.updateOne({ _id: referral.referralCodeId }, { $inc: { successfulCount: 1, totalRewards: amount } });
    ledger = ledgerDoc;

    await MarketingEvent.create({ type: 'reward_earn', userId: referrerId, referralId: referral._id, referralCodeId: referral.referralCodeId, metadata: { amount, type: rewardType, referralCode: referral.code } });
  } else {
    const id = crypto.randomUUID();
    ledger = { _id: id, id, userId: referrerId, type: 'referral', amount, currency, source: 'referral', referenceId: referral._id, status: 'available', createdAt: new Date() };
    referral.status = 'rewarded';
    referral.rewardedAt = new Date();
    memoryReferrals.set(String(referral._id || referral.id), referral);
    const codeOwner = memoryReferralCodes.get(String(referral.referralCodeId));
    if (codeOwner) { codeOwner.successfulCount = (codeOwner.successfulCount || 0) + 1; codeOwner.totalRewards = (codeOwner.totalRewards || 0) + amount; }
  }

  return { referral, ledger };
}

export async function listReferralsForUser(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  if (isConnected()) {
    const [rows, total] = await Promise.all([
      Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Referral.countDocuments({ referrerId: userId }),
    ]);
    return { referrals: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  const all = [...memoryReferrals.values()].filter(r => String(r.referrerId) === String(userId)).sort((a,b)=>+b.createdAt - +a.createdAt);
  const rows = all.slice(skip, skip + limit);
  return { referrals: rows, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function listAllReferrals(filter: any = {}, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const query: any = {};
  if (filter.status) query.status = filter.status;
  if (filter.suspicious) query['fraud.isSuspicious'] = true;
  if (filter.referrerId) query.referrerId = filter.referrerId;
  if (isConnected()) {
    const [rows, total] = await Promise.all([
      Referral.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Referral.countDocuments(query),
    ]);
    return { referrals: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  const all = [...memoryReferrals.values()].filter(r => {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.suspicious && !r.fraud?.isSuspicious) return false;
    return true;
  }).sort((a,b)=>+b.createdAt - +a.createdAt);
  const rows = all.slice(skip, skip + limit);
  return { referrals: rows, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function expireOldReferrals() {
  if (!isConnected()) return 0;
  const now = new Date();
  const result = await Referral.updateMany({ status: { $in: ['pending','eligible'] }, expiresAt: { $lt: now } }, { $set: { status: 'expired' } });
  return result.modifiedCount || 0;
}

export async function flagSuspiciousReferral(referralId: string, reason: string, reviewerId?: string) {
  if (isConnected()) {
    return Referral.findByIdAndUpdate(referralId, { $set: { 'fraud.isSuspicious': true, 'fraud.flaggedAt': new Date() }, $push: { 'fraud.reasons': reason }, ...(reviewerId ? { 'fraud.reviewedBy': reviewerId } : {}) }, { new: true }).lean();
  }
  const r = memoryReferrals.get(referralId);
  if (r) { r.fraud.isSuspicious = true; r.fraud.reasons.push(reason); r.fraud.flaggedAt = new Date(); }
  return r;
}

export function resetReferralMemory() {
  memoryReferralCodes.clear();
  memoryReferrals.clear();
}

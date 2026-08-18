// @ts-nocheck
import { getMyReferralStats, getOrCreateReferralCode, listReferralsForUser, listAllReferrals, evaluateReferralEligibility, attributeReferral } from '../services/referralService.js';
import { AppError } from '../utils/AppError.js';

export async function myReferral(req, res) {
  const data = await getMyReferralStats(req.auth.userId);
  res.json({ success: true, data });
}

export async function createCode(req, res) {
  const { customCode } = req.body || {};
  const code = await getOrCreateReferralCode(req.auth.userId, customCode);
  const stats = await getMyReferralStats(req.auth.userId);
  res.status(201).json({ success: true, data: { code, stats: stats.stats, link: stats.link }, message: 'Referral code created' });
}

export async function history(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const data = await listReferralsForUser(req.auth.userId, page, limit);
  res.json({ success: true, data });
}

export async function attribute(req, res) {
  // Called during signup or via dedicated endpoint? We expose for linking.
  const { code, method } = req.body;
  if (!code) throw new AppError(400, 'Referral code required', 'REFERRAL_CODE_REQUIRED');
  const referral = await attributeReferral(code, req.auth.userId, req, method || 'code');
  res.status(201).json({ success: true, data: referral, message: 'Referral attributed' });
}

export async function evaluate(req, res) {
  const referral = await evaluateReferralEligibility(req.auth.userId);
  res.json({ success: true, data: referral });
}

export async function adminList(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter: any = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.suspicious) filter.suspicious = req.query.suspicious === 'true';
  if (req.query.referrerId) filter.referrerId = String(req.query.referrerId);
  const data = await listAllReferrals(filter, page, limit);
  res.json({ success: true, data });
}

export async function trackReferralLinkView(req, res) {
  const { code } = req.params;
  // Just record impression via marketingEvent
  const { trackEvent } = await import('../services/marketingEventService.js');
  const { ReferralCode } = await import('../models/ReferralCode.js');
  let codeDoc: any = null;
  try {
    codeDoc = await ReferralCode.findOne({ code: String(code).toUpperCase() }).lean();
  } catch { /* best-effort code lookup */ }
  await trackEvent({ type: 'referral_link_view', referralCodeId: codeDoc?._id || null, source: 'referral_link', metadata: { code } }, req);
  res.json({ success: true, data: { code, valid: Boolean(codeDoc) } });
}

import { getCreditWallet, listCreditTransactions } from '../services/creditService.js';
import { getSellerQuota } from '../services/quotaService.js';
import { createPackagePayment, publishWithListingCredit, requestRefund, listSellerRefunds } from '../services/paymentService.js';
import { listSellerPackages } from '../services/packageService.js';
import { sellerAnalytics, sellerPromotionAnalytics } from '../services/promotionAnalyticsService.js';

export async function overview(req, res) {
  const [quota, wallet] = await Promise.all([getSellerQuota(req.auth.userId), getCreditWallet(req.auth.userId)]);
  res.json({ success: true, data: { quota, wallet } });
}
export async function wallet(req, res) { res.json({ success: true, data: await getCreditWallet(req.auth.userId) }); }
export async function creditHistory(req, res) { res.json({ success: true, data: await listCreditTransactions(req.auth.userId, Number(req.query.page), Number(req.query.limit)) }); }
export async function packages(_req, res) { res.json({ success: true, data: await listSellerPackages() }); }
export async function purchasePackage(req, res) { res.status(201).json({ success: true, data: await createPackagePayment(req.auth.userId, req.params.id, req.body.idempotencyKey) }); }
export async function useListingCredit(req, res) { res.json({ success: true, data: await publishWithListingCredit(req.auth.userId, req.params.id) }); }
export async function analytics(req, res) { res.json({ success: true, data: await sellerAnalytics(req.auth.userId) }); }
export async function promotionAnalytics(req, res) { res.json({ success: true, data: await sellerPromotionAnalytics(req.auth.userId) }); }
export async function refunds(req, res) { res.json({ success: true, data: await listSellerRefunds(req.auth.userId) }); }
export async function refundCreate(req, res) { res.status(201).json({ success: true, data: await requestRefund(req.auth.userId, req.params.paymentId, req.body.reason) }); }

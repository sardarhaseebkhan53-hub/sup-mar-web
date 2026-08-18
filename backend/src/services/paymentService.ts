import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Invoice } from '../models/Invoice.js';
import { MarketplaceOrder } from '../models/MarketplaceOrder.js';
import { Payment } from '../models/Payment.js';
import { ProcessedWebhook } from '../models/ProcessedWebhook.js';
import { RefundRequest } from '../models/RefundRequest.js';
import { Transaction } from '../models/Transaction.js';
import { getPaymentProvider } from '../payment/providerFactory.js';
import { AppError } from '../utils/AppError.js';
import { consumeCredit, getCreditWallet, grantCredits, releasePackageRefundReservation, reservePackageEntitlementsForRefund } from './creditService.js';
import { logAdminActivity } from './adminActivityService.js';
import { assertPublishable, getOwnedListing, setListingMonetization, transitionListing } from './listingService.js';
import { getMarketplaceSettings } from './marketplaceSettingsService.js';
import { createSystemNotification } from './messagingService.js';
import { getSellerPackage } from './packageService.js';
import { attachPromotionPayment, activatePromotion, adminListPromotions, cancelPromotion, createPendingPromotion, expirePromotionForTest, expirePromotions, failPendingPromotion, listListingPromotions, listSellerPromotions, presentPromotion } from './promotionService.js';
import { getSellerQuota, consumeFreeAllowance, recordPaidListing } from './quotaService.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';

const payments = new Map<string, any>();
const transactions = new Map<string, any>();
const orders = new Map<string, any>();
const invoices = new Map<string, any>();
const refunds = new Map<string, any>();
const webhookEvents = new Set<string>();
const connected = () => mongoose.connection.readyState === 1;
const money = (value: any) => Number(value?.toString?.() ?? value ?? 0);
const paymentReference = () => `QV-PAY-${crypto.randomUUID().replaceAll('-', '').slice(0, 14).toUpperCase()}`;
const orderReference = () => `QV-ORD-${crypto.randomUUID().replaceAll('-', '').slice(0, 14).toUpperCase()}`;
const invoiceReference = () => `QV-INV-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
const metadataOf = (item: any) => item?.metadata instanceof Map ? Object.fromEntries(item.metadata) : item?.metadata || {};
const safePayment = (item: any) => ({
  id: String(item._id || item.id), orderId: item.orderId ? String(item.orderId) : null, listingPublicId: item.listingPublicId,
  type: item.type, amount: money(item.amount), baseAmount: money(item.baseAmount), tax: money(item.tax), discount: money(item.discount),
  platformFee: money(item.platformFee), processingFee: money(item.processingFee), currency: item.currency, status: item.status,
  provider: item.provider, reference: item.reference, checkoutUrl: item.checkoutUrl || null, createdAt: item.createdAt, updatedAt: item.updatedAt,
  metadata: metadataOf(item),
});
const safeTransaction = (item: any) => ({ id: String(item._id || item.id), paymentId: String(item.paymentId), amount: money(item.amount), currency: item.currency, type: item.type, status: item.status, reference: item.reference, createdAt: item.createdAt });
const safeOrder = (item: any) => ({ id: String(item._id || item.id), reference: item.reference, type: item.type, items: (item.items || []).map((row: any) => ({ productId: row.productId, name: row.name, quantity: row.quantity, unitAmount: money(row.unitAmount), metadata: metadataOf(row) })), subtotal: money(item.subtotal), discount: money(item.discount), tax: money(item.tax), platformFee: money(item.platformFee), processingFee: money(item.processingFee), total: money(item.total), currency: item.currency, paymentId: String(item.paymentId || ''), status: item.status, createdAt: item.createdAt });
const safeInvoice = (item: any) => item ? ({ id: String(item._id || item.id), invoiceNumber: item.invoiceNumber, orderId: String(item.orderId), paymentId: String(item.paymentId), buyer: item.buyerName, description: item.description, amount: money(item.amount), currency: item.currency, paymentStatus: item.paymentStatus, issuedAt: item.issuedAt }) : null;

async function findPayment(id: string) {
  if (connected()) { const query: any = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { reference: id }] } : { reference: id }; return Payment.findOne(query).lean(); }
  return payments.get(id) || [...payments.values()].find((item) => item.reference === id) || null;
}
async function findIdempotent(userId: string, key: string) { return connected() ? Payment.findOne({ userId, idempotencyKey: key }).lean() : [...payments.values()].find((item) => item.userId === userId && item.idempotencyKey === key) || null; }
async function savePayment(record: any) { if (connected()) return (await Payment.create(record)).toObject(); payments.set(record.id, record); return record; }
async function updatePayment(id: string, patch: any) { if (connected()) return Payment.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean(); const item = payments.get(id); if (!item) return null; Object.assign(item, patch, { updatedAt: new Date() }); payments.set(id, item); return item; }
async function saveOrder(record: any) { if (connected()) return (await MarketplaceOrder.create(record)).toObject(); orders.set(record.id, record); return record; }
async function updateOrder(id: string, patch: any) { if (connected()) return MarketplaceOrder.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean(); const item = orders.get(id); if (item) Object.assign(item, patch, { updatedAt: new Date() }); return item; }
async function findOrderByPayment(payment: any) { if (connected()) return MarketplaceOrder.findOne({ paymentId: payment._id }).lean(); return [...orders.values()].find((item) => String(item.paymentId) === String(payment.id)); }

function totals(baseAmount: number, settings: any) {
  const tax = Math.round(baseAmount * (settings.taxRate || 0)) / 100;
  const platformFee = settings.platformFee || 0;
  const processingFee = settings.paymentProcessingFee || 0;
  const discount = Math.min(settings.discountAmount || 0, baseAmount + tax + platformFee + processingFee);
  return { baseAmount, tax, platformFee, processingFee, discount, total: baseAmount + tax + platformFee + processingFee - discount };
}

async function quote(userId: string, input: { type: 'listing_fee' | 'promotion' | 'package'; listingId?: string; promotionProductKey?: string; packageId?: string }) {
  const settings = await getMarketplaceSettings();
  if (input.type === 'package') {
    const product = await getSellerPackage(input.packageId || '');
    if (product.currency !== settings.currency) throw new AppError(422, 'Package currency is not available', 'PACKAGE_CURRENCY_INVALID');
    return { settings, product, ...totals(product.price, settings) };
  }
  const listing: any = await getOwnedListing(userId, input.listingId || '');
  if (input.type === 'listing_fee') {
    assertPublishable(listing);
    if (listing.monetization?.publicationEntitlement && listing.monetization.publicationEntitlement !== 'none') return { free: true, entitled: true, listing, settings, ...totals(0, settings) };
    const quota = await getSellerQuota(userId);
    if (quota.freeListingsRemaining > 0) return { free: true, listing, settings, ...totals(0, settings) };
    return { free: false, listing, settings, ...totals(settings.additionalListingFee, settings) };
  }
  if (listing.status !== 'published' || listing.availability === 'unavailable') throw new AppError(409, 'Only eligible published listings can be promoted', 'LISTING_NOT_ELIGIBLE');
  if (!settings.promotionEnabled) throw new AppError(409, 'Promotions are currently unavailable', 'PROMOTIONS_DISABLED');
  const product = settings.promotionProducts.find((item: any) => item.key === input.promotionProductKey);
  if (!product || product.durationHours < settings.minPromotionDurationHours || product.durationHours > settings.maxPromotionDurationHours) throw new AppError(422, 'Choose an active promotion option', 'PROMOTION_PRODUCT_INVALID');
  return { free: false, listing, settings, product, ...totals(product.price, settings) };
}

export async function requestListingPublication(userId: string, listingId: string) {
  const result: any = await quote(userId, { type: 'listing_fee', listingId });
  if (result.free) {
    if (!result.entitled) { await consumeFreeAllowance(userId); await setListingMonetization(userId, result.listing.publicId, 'free'); }
    const listing = result.listing.status === 'published' ? result.listing : await transitionListing(userId, listingId, 'publish');
    await logAdminActivity(userId, 'LISTING_FREE_ALLOWANCE_USED', 'listing', listing.publicId, { amount: 0 });
    await createSystemNotification(userId, { type: 'listing', title: 'Listing published', body: `${listing.title} is now live on QAVLIO.`, relatedId: listing.publicId, relatedType: 'listing' });
    return { paymentRequired: false, listing, quote: { baseAmount: 0, tax: 0, discount: 0, total: 0, currency: result.settings.currency } };
  }
  const payment = await createPayment(userId, { type: 'listing_fee', listingId, idempotencyKey: `listing-publish:${result.listing.publicId}` });
  return { paymentRequired: true, payment: payment.payment, quote: payment.quote, checkoutUrl: payment.checkoutUrl };
}

export async function publishWithListingCredit(userId: string, listingId: string) {
  const listing: any = await getOwnedListing(userId, listingId); assertPublishable(listing);
  if (listing.monetization?.publicationEntitlement && listing.monetization.publicationEntitlement !== 'none') {
    const published = listing.status === 'published' ? listing : await transitionListing(userId, listingId, 'publish');
    return { paymentRequired: false, listing: published, wallet: await getCreditWallet(userId) };
  }
  const referenceId = `listing:${listing.publicId}`;
  const wallet = await consumeCredit(userId, 'listing', 1, `Listing credit used for ${listing.title}`, referenceId);
  await setListingMonetization(userId, listing.publicId, 'credit', referenceId); await recordPaidListing(userId);
  const published = await transitionListing(userId, listingId, 'publish');
  await logAdminActivity(userId, 'LISTING_CREDIT_USED', 'listing', listing.publicId, { credits: 1 });
  return { paymentRequired: false, listing: published, wallet };
}

export async function createPayment(userId: string, input: { type: 'listing_fee' | 'promotion' | 'package'; listingId?: string; promotionProductKey?: string; packageId?: string; idempotencyKey: string }) {
  const existing: any = await findIdempotent(userId, input.idempotencyKey);
  if (existing) return { payment: safePayment(existing), quote: { baseAmount: money(existing.baseAmount), tax: money(existing.tax), discount: money(existing.discount), platformFee: money(existing.platformFee), processingFee: money(existing.processingFee), total: money(existing.amount), currency: existing.currency }, checkoutUrl: existing.checkoutUrl || null };
  const result: any = await quote(userId, input);
  if (input.type === 'listing_fee' && result.free) return requestListingPublication(userId, input.listingId || '');
  const provider = getPaymentProvider(); const reference = paymentReference();
  const productName = input.type === 'listing_fee' ? `Listing fee for ${result.listing.title}` : input.type === 'promotion' ? `${result.product.name} for ${result.listing.title}` : `${result.product.name} seller package`;
  const created = await provider.createCheckout({ reference, amount: result.total, currency: result.settings.currency, description: productName, metadata: { userId, type: input.type, ...(result.listing && { listingPublicId: result.listing.publicId }), ...(input.packageId && { packageId: input.packageId }) } });
  const now = new Date(); const id = crypto.randomUUID(); let promotion: any = null;
  if (input.type === 'promotion') promotion = await createPendingPromotion(userId, result.listing.publicId, result.product, result.settings.currency);
  const packageSnapshot = input.type === 'package' ? { id: result.product.id, name: result.product.name, listingCredits: result.product.listingCredits, promotionCredits: result.product.promotionCredits, promotionDays: result.product.promotionDays, validityDays: result.product.validityDays } : null;
  const record: any = {
    id, userId, listingId: result.listing?._id || null, listingPublicId: result.listing?.publicId || null, type: input.type,
    amount: result.total, baseAmount: result.baseAmount, tax: result.tax, discount: result.discount, platformFee: result.platformFee, processingFee: result.processingFee,
    currency: result.settings.currency, status: created.status, provider: provider.name, providerPaymentId: created.providerPaymentId,
    reference, idempotencyKey: input.idempotencyKey, checkoutUrl: created.checkoutUrl || null,
    metadata: { promotionId: promotion ? String(promotion._id || promotion.id) : null, productKey: input.promotionProductKey || null, listingTitle: result.listing?.title || null, packageId: input.packageId || null, packageSnapshot },
    createdAt: now, updatedAt: now, expiresAt: new Date(Date.now() + 30 * 60_000),
  };
  const saved: any = await savePayment(record);
  const order: any = await saveOrder({ id: crypto.randomUUID(), reference: orderReference(), userId, type: input.type === 'listing_fee' ? 'LISTING_FEE' : input.type === 'promotion' ? 'PROMOTION' : 'PACKAGE', items: [{ productId: input.packageId || input.promotionProductKey || result.listing?.publicId, name: productName, quantity: 1, unitAmount: result.baseAmount, metadata: packageSnapshot || {} }], subtotal: result.baseAmount, discount: result.discount, tax: result.tax, platformFee: result.platformFee, processingFee: result.processingFee, total: result.total, currency: result.settings.currency, paymentId: saved._id || saved.id, status: 'Pending', createdAt: now, updatedAt: now });
  await updatePayment(String(saved._id || saved.id), { orderId: order._id || order.id });
  if (promotion) await attachPromotionPayment(String(promotion._id || promotion.id), saved._id || saved.id);
  const final = await findPayment(String(saved._id || saved.id));
  return { payment: safePayment(final), order: safeOrder(order), quote: { baseAmount: result.baseAmount, tax: result.tax, discount: result.discount, platformFee: result.platformFee, processingFee: result.processingFee, total: result.total, currency: result.settings.currency }, checkoutUrl: created.checkoutUrl || null };
}

export async function createPackagePayment(userId: string, packageId: string, idempotencyKey: string) { return createPayment(userId, { type: 'package', packageId, idempotencyKey }); }

async function issueInvoice(payment: any, order: any) {
  const existing: any = connected() ? await Invoice.findOne({ orderId: order._id }).lean() : [...invoices.values()].find((item) => String(item.orderId) === String(order.id));
  if (existing) return existing;
  const user: any = await getIdentityRepository().findUserById(String(payment.userId));
  const item: any = { id: crypto.randomUUID(), invoiceNumber: invoiceReference(), orderId: order._id || order.id, paymentId: payment._id || payment.id, userId: payment.userId, buyerName: user?.name || 'QAVLIO seller', description: order.items?.[0]?.name || 'QAVLIO marketplace service', amount: money(payment.amount), currency: payment.currency, paymentStatus: 'Paid', issuedAt: new Date() };
  if (connected()) return (await Invoice.create(item)).toObject(); invoices.set(item.id, item); return item;
}

async function fulfill(payment: any) {
  const meta = metadataOf(payment);
  if (payment.type === 'listing_fee') {
    const listing: any = await getOwnedListing(String(payment.userId), payment.listingPublicId);
    if (!listing.monetization?.publicationEntitlement || listing.monetization.publicationEntitlement === 'none') { await setListingMonetization(String(payment.userId), payment.listingPublicId, 'paid', String(payment._id || payment.id)); await recordPaidListing(String(payment.userId)); }
    const current: any = await getOwnedListing(String(payment.userId), payment.listingPublicId);
    const published = current.status === 'published' ? current : await transitionListing(String(payment.userId), payment.listingPublicId, 'publish');
    await logAdminActivity(String(payment.userId), 'LISTING_FEE_CHARGED', 'listing', payment.listingPublicId, { paymentId: String(payment._id || payment.id), amount: money(payment.amount) });
    await createSystemNotification(String(payment.userId), { type: 'listing', title: 'Payment successful', body: `${published.title} has been published.`, relatedId: published.publicId, relatedType: 'listing' });
  } else if (payment.type === 'promotion' && meta.promotionId) {
    await activatePromotion(meta.promotionId); await logAdminActivity(String(payment.userId), 'PROMOTION_ACTIVATED', 'promotion', meta.promotionId, { paymentId: String(payment._id || payment.id) });
  } else if (payment.type === 'package' && meta.packageSnapshot) {
    await grantCredits(String(payment.userId), { listingCredits: Number(meta.packageSnapshot.listingCredits || 0), promotionCredits: Number(meta.packageSnapshot.promotionCredits || 0), featuredDays: Number(meta.packageSnapshot.promotionDays || 0), reason: `Purchased ${meta.packageSnapshot.name}`, referenceId: `payment:${payment.reference}` });
    await logAdminActivity(String(payment.userId), 'SELLER_PACKAGE_PURCHASED', 'package', String(meta.packageSnapshot.id), { paymentId: String(payment._id || payment.id), listingCredits: meta.packageSnapshot.listingCredits, promotionCredits: meta.packageSnapshot.promotionCredits });
  }
}

async function finalizePaid(payment: any, confirmed = false) {
  if (payment.status === 'paid') {
    const existingOrder: any = await findOrderByPayment(payment);
    if (existingOrder && existingOrder.status !== 'Paid') {
      await issueInvoice(payment, existingOrder);
      await fulfill(payment);
      await updateOrder(String(existingOrder._id || existingOrder.id), { status: 'Paid' });
    }
    return payment;
  }
  if (!confirmed) { const providerStatus = await getPaymentProvider().getPaymentStatus(payment.providerPaymentId); if (providerStatus.status !== 'paid') return updatePayment(String(payment._id || payment.id), { status: providerStatus.status }); }
  let updated: any;
  if (connected()) updated = await Payment.findOneAndUpdate({ _id: payment._id, status: { $nin: ['paid', 'refunded'] } }, { $set: { status: 'paid', paidAt: new Date() } }, { new: true }).lean();
  else { const current = payments.get(payment.id); if (!current || ['paid', 'refunded'].includes(current.status)) return current || payment; current.status = 'paid'; current.paidAt = new Date(); current.updatedAt = new Date(); payments.set(current.id, current); updated = current; }
  if (!updated) return findPayment(String(payment._id || payment.id));
  const transaction = { id: crypto.randomUUID(), userId: String(payment.userId), paymentId: payment._id || payment.id, amount: money(payment.amount), currency: payment.currency, type: 'charge', status: 'completed', reference: `QV-TXN-${crypto.randomUUID().replaceAll('-', '').slice(0, 14).toUpperCase()}`, createdAt: new Date() };
  if (connected()) { try { await Transaction.create(transaction); } catch (error: any) { if (error?.code !== 11000) throw error; } } else transactions.set(transaction.id, transaction);
  const order: any = await findOrderByPayment(payment);
  if (order) await issueInvoice(updated, order);
  await fulfill(updated);
  if (order) await updateOrder(String(order._id || order.id), { status: 'Paid' });
  return updated;
}

export async function verifyPayment(userId: string, id: string) {
  const payment: any = await findPayment(id); if (!payment || String(payment.userId) !== userId) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  if (['paid', 'refunded'].includes(payment.status)) return safePayment(payment);
  await getPaymentProvider().verifyPayment(payment.providerPaymentId);
  return safePayment(await finalizePaid(payment));
}
export async function getPayment(userId: string, id: string) { const item: any = await findPayment(id); if (!item || String(item.userId) !== userId) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND'); return safePayment(item); }

export async function processWebhook(rawBody: string, signature: string) {
  const provider = getPaymentProvider(); let event: any;
  try { event = provider.verifyWebhook(rawBody, signature); } catch { throw new AppError(401, 'Invalid webhook signature', 'WEBHOOK_SIGNATURE_INVALID'); }
  const seen = connected() ? await ProcessedWebhook.exists({ eventId: event.eventId }) : webhookEvents.has(event.eventId); if (seen) return { duplicate: true };
  const payment: any = connected() ? await Payment.findOne({ providerPaymentId: event.providerPaymentId, reference: event.reference }).lean() : [...payments.values()].find((item) => item.providerPaymentId === event.providerPaymentId && item.reference === event.reference);
  if (!payment || money(payment.amount) !== Number(event.amount) || payment.currency !== event.currency) throw new AppError(422, 'Webhook payment details do not match', 'WEBHOOK_MISMATCH');
  if (event.status === 'paid') await finalizePaid(payment, true);
  else {
    await updatePayment(String(payment._id || payment.id), { status: event.status }); const order: any = await findOrderByPayment(payment); if (order) await updateOrder(String(order._id || order.id), { status: event.status === 'processing' ? 'Processing' : event.status === 'failed' ? 'Failed' : event.status === 'cancelled' || event.status === 'expired' ? 'Cancelled' : 'Pending' });
    const meta = metadataOf(payment); if (payment.type === 'promotion' && meta.promotionId && ['failed', 'cancelled', 'expired'].includes(event.status)) await failPendingPromotion(meta.promotionId);
    if (['failed', 'cancelled', 'expired'].includes(event.status)) await createSystemNotification(String(payment.userId), { type: 'system', title: `Payment ${event.status}`, body: 'Your purchase was not fulfilled. You can safely try again.', relatedId: payment.listingPublicId, relatedType: payment.listingPublicId ? 'listing' : 'system' });
  }
  if (connected()) { try { await ProcessedWebhook.create({ eventId: event.eventId, provider: provider.name, paymentReference: event.reference }); } catch (error: any) { if (error?.code !== 11000) throw error; } } else webhookEvents.add(event.eventId);
  return { processed: true };
}

export async function listSellerPayments(userId: string, input: any = {}) {
  const page = Number(input.page) || 1, limit = Number(input.limit) || 20;
  let rows: any[] = connected() ? await Payment.find({ userId, ...(input.type && { type: input.type }), ...(input.status && { status: input.status }) }).sort({ createdAt: input.sort === 'oldest' ? 1 : -1 }).lean() : [...payments.values()].filter((item) => item.userId === userId && (!input.type || item.type === input.type) && (!input.status || item.status === input.status));
  if (input.date) { const days = input.date === '30days' ? 30 : input.date === '90days' ? 90 : 365; rows = rows.filter((item) => +new Date(item.createdAt) >= Date.now() - days * 86400000); }
  if (input.sort === 'amount') rows.sort((a, b) => money(b.amount) - money(a.amount)); else if (input.sort !== 'oldest') rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const all: any[] = connected() ? await Payment.find({ userId, status: 'paid' }).lean() : [...payments.values()].filter((item) => item.userId === userId && item.status === 'paid');
  const totalSpent = all.reduce((sum, item) => sum + money(item.amount), 0), listingFees = all.filter((item) => item.type === 'listing_fee').reduce((sum, item) => sum + money(item.amount), 0), promotionSpend = all.filter((item) => item.type === 'promotion').reduce((sum, item) => sum + money(item.amount), 0), packageSpend = all.filter((item) => item.type === 'package').reduce((sum, item) => sum + money(item.amount), 0);
  const start = (page - 1) * limit;
  return { payments: rows.slice(start, start + limit).map(safePayment), summary: { totalSpent, listingFees, promotionSpend, packageSpend, transactions: all.length }, pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
}

export async function getSellerPaymentDetail(userId: string, id: string) {
  const payment: any = await findPayment(id); if (!payment || String(payment.userId) !== userId) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  const transaction: any = connected() ? await Transaction.findOne({ paymentId: payment._id, type: 'charge' }).lean() : [...transactions.values()].find((item) => String(item.paymentId) === String(payment.id) && item.type === 'charge');
  const order: any = await findOrderByPayment(payment);
  const invoice: any = order ? (connected() ? await Invoice.findOne({ orderId: order._id }).lean() : [...invoices.values()].find((item) => String(item.orderId) === String(order.id))) : null;
  return { payment: safePayment(payment), transaction: transaction ? safeTransaction(transaction) : null, order: order ? safeOrder(order) : null, invoice: safeInvoice(invoice), receipt: invoice ? { brand: 'QAVLIO', invoiceId: invoice.invoiceNumber, buyer: invoice.buyerName, listingTitle: invoice.description, amount: money(invoice.amount), currency: invoice.currency, paymentStatus: invoice.paymentStatus, transactionId: transaction?.reference || null, date: invoice.issuedAt } : null };
}

export async function createPromotionRequest(userId: string, listingId: string, productKey: string, idempotencyKey: string, paymentMethod: 'pay' | 'credits' | 'featured_days' = 'pay') {
  if (paymentMethod === 'pay') return createPayment(userId, { type: 'promotion', listingId, promotionProductKey: productKey, idempotencyKey });
  const result: any = await quote(userId, { type: 'promotion', listingId, promotionProductKey: productKey });
  const referenceId = `promotion:${listingId}:${productKey}:${idempotencyKey}`;
  if (paymentMethod === 'featured_days' && result.product.type !== 'FEATURED') throw new AppError(422, 'Featured days can only be used for featured promotions', 'FEATURED_DAYS_INVALID');
  const creditCost = paymentMethod === 'featured_days' ? Math.ceil(result.product.durationHours / 24) : result.product.creditCost || 1;
  const creditKind = paymentMethod === 'featured_days' ? 'featured' : 'promotion';
  const promotion: any = await createPendingPromotion(userId, listingId, result.product, result.settings.currency, null, 'credits');
  let consumed = false;
  try {
    const wallet = await consumeCredit(userId, creditKind, creditCost, `${result.product.name} promotion`, referenceId); consumed = true;
    const active = await activatePromotion(String(promotion._id || promotion.id));
    await logAdminActivity(userId, 'PROMOTION_CREDITS_USED', 'promotion', active.id, { credits: creditCost });
    return { paymentRequired: false, payment: null, promotion: active, wallet, quote: { total: 0, currency: result.settings.currency, creditCost } };
  } catch (error) {
    await failPendingPromotion(String(promotion._id || promotion.id));
    if (consumed) await grantCredits(userId, { ...(creditKind === 'featured' ? { featuredDays: creditCost } : { promotionCredits: creditCost }), reason: `Reversed failed ${result.product.name} activation`, referenceId: `rollback:${referenceId}` });
    throw error;
  }
}

export { listListingPromotions, listSellerPromotions, cancelPromotion, adminListPromotions, expirePromotions, expirePromotionForTest, presentPromotion };

export async function adminListPayments(input: any) {
  const page = Number(input.page) || 1, limit = Number(input.limit) || 25;
  let rows: any[] = connected() ? await Payment.find({ ...(input.userId && { userId: input.userId }), ...(input.status && { status: input.status }), ...(input.type && { type: input.type }), ...(input.search && { $or: [{ reference: { $regex: input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { listingPublicId: { $regex: input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] }) }).sort({ createdAt: input.sort === 'oldest' ? 1 : -1 }).limit(5000).lean() : [...payments.values()].filter((item) => (!input.userId || String(item.userId) === String(input.userId)) && (!input.status || item.status === input.status) && (!input.type || item.type === input.type) && (!input.search || `${item.reference} ${item.listingPublicId}`.toLowerCase().includes(input.search.toLowerCase())));
  if (input.sort === 'amount') rows.sort((a, b) => money(b.amount) - money(a.amount)); const start = (page - 1) * limit;
  return { payments: rows.slice(start, start + limit).map((item) => ({ ...safePayment(item), userId: String(item.userId) })), pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
}
export async function adminPaymentDetail(id: string) { const payment: any = await findPayment(id); if (!payment) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND'); const detail = await getSellerPaymentDetail(String(payment.userId), String(payment._id || payment.id)); return { ...detail, payment: { ...detail.payment, userId: String(payment.userId) } }; }

async function completeRefund(payment: any, actorId: string, reason: string) {
  if (payment.status !== 'paid') throw new AppError(409, 'Only paid payments can be refunded', 'PAYMENT_NOT_REFUNDABLE');
  const meta = metadataOf(payment);
  const entitlementReservation = payment.type === 'package' && meta.packageSnapshot ? { listingCredits: Number(meta.packageSnapshot.listingCredits || 0), promotionCredits: Number(meta.packageSnapshot.promotionCredits || 0), featuredDays: Number(meta.packageSnapshot.promotionDays || 0), reason: `Refunded ${meta.packageSnapshot.name}`, referenceId: `refund:${payment.reference}` } : null;
  if (entitlementReservation) await reservePackageEntitlementsForRefund(String(payment.userId), entitlementReservation);
  let result: any;
  try { result = await getPaymentProvider().refundPayment(payment.providerPaymentId, money(payment.amount)); }
  catch (error) { if (entitlementReservation) await releasePackageRefundReservation(String(payment.userId), entitlementReservation); throw error; }
  if (result.status !== 'refunded') { if (entitlementReservation) await releasePackageRefundReservation(String(payment.userId), entitlementReservation); throw new AppError(502, 'Payment provider did not confirm the refund', 'REFUND_NOT_CONFIRMED'); }
  const updated: any = await updatePayment(String(payment._id || payment.id), { status: 'refunded' }); const order: any = await findOrderByPayment(payment); if (order) await updateOrder(String(order._id || order.id), { status: 'Refunded' });
  if (connected()) await Invoice.updateOne({ paymentId: payment._id }, { $set: { paymentStatus: 'Refunded' } }); else for (const item of invoices.values()) if (String(item.paymentId) === String(payment.id)) item.paymentStatus = 'Refunded';
  const record = { id: crypto.randomUUID(), userId: String(payment.userId), paymentId: payment._id || payment.id, amount: money(payment.amount), currency: payment.currency, type: 'refund', status: 'refunded', reference: `QV-REF-${crypto.randomUUID().replaceAll('-', '').slice(0, 14).toUpperCase()}`, createdAt: new Date() };
  if (connected()) { try { await Transaction.create(record); } catch (error: any) { if (error?.code !== 11000) throw error; } } else transactions.set(record.id, record);
  if (payment.type === 'promotion' && meta.promotionId) await cancelPromotion(actorId, meta.promotionId, true, true).catch(() => undefined);
  await logAdminActivity(actorId, 'REFUND_COMPLETED', 'payment', String(payment._id || payment.id), { reason, amount: money(payment.amount) });
  return safePayment(updated);
}

export async function requestRefund(userId: string, paymentId: string, reason: string) {
  const payment: any = await findPayment(paymentId); if (!payment || String(payment.userId) !== userId) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND'); if (payment.status !== 'paid') throw new AppError(409, 'Only paid payments can be reviewed for refund', 'PAYMENT_NOT_REFUNDABLE');
  const duplicate: any = connected() ? await RefundRequest.findOne({ paymentId: payment._id, status: { $in: ['Requested', 'Processing'] } }).lean() : [...refunds.values()].find((item) => String(item.paymentId) === String(payment.id) && ['Requested', 'Processing'].includes(item.status));
  if (duplicate) return { id: String(duplicate._id || duplicate.id), status: duplicate.status };
  const item: any = { id: crypto.randomUUID(), userId, paymentId: payment._id || payment.id, reason, status: 'Requested', audit: [{ actorId: userId, action: 'Requested', note: reason, at: new Date() }], createdAt: new Date(), updatedAt: new Date() };
  const saved: any = connected() ? (await RefundRequest.create(item)).toObject() : (refunds.set(item.id, item), item);
  await logAdminActivity(userId, 'REFUND_CREATED', 'payment', String(payment._id || payment.id), { reason });
  return { id: String(saved._id || saved.id), paymentId: String(saved.paymentId), reason: saved.reason, status: saved.status, createdAt: saved.createdAt };
}
export async function listSellerRefunds(userId: string) { const rows: any[] = connected() ? await RefundRequest.find({ userId }).sort({ createdAt: -1 }).lean() : [...refunds.values()].filter((item) => item.userId === userId); return rows.map((item) => ({ id: String(item._id || item.id), paymentId: String(item.paymentId), reason: item.reason, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt })); }
export async function adminListRefunds(input: any = {}) { const rows: any[] = connected() ? await RefundRequest.find({ ...(input.status && { status: input.status }) }).sort({ createdAt: -1 }).lean() : [...refunds.values()].filter((item) => !input.status || item.status === input.status); return rows.map((item) => ({ id: String(item._id || item.id), userId: String(item.userId), paymentId: String(item.paymentId), reason: item.reason, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt })); }
export async function adminUpdateRefund(adminId: string, id: string, status: 'Processing' | 'Completed' | 'Rejected', note = '') {
  const item: any = connected() && mongoose.isValidObjectId(id) ? await RefundRequest.findById(id).lean() : refunds.get(id); if (!item) throw new AppError(404, 'Refund request not found', 'REFUND_NOT_FOUND');
  if (item.status === 'Completed' || item.status === 'Rejected') throw new AppError(409, 'Refund request is already closed', 'REFUND_STATUS_INVALID');
  let paymentResult: any = null; if (status === 'Completed') { const payment = await findPayment(String(item.paymentId)); paymentResult = await completeRefund(payment, adminId, note || item.reason); }
  const audit = [...(item.audit || []), { actorId: adminId, action: status, note, at: new Date() }];
  if (connected()) await RefundRequest.updateOne({ _id: item._id }, { $set: { status, reviewedBy: adminId, audit } }); else { Object.assign(item, { status, reviewedBy: adminId, audit, updatedAt: new Date() }); refunds.set(item.id, item); }
  await logAdminActivity(adminId, `REFUND_${status.toUpperCase()}`, 'refund', id, { note });
  return { id, status, payment: paymentResult };
}
export async function adminRefundPayment(id: string, adminId?: string, reason = 'Administrative refund') {
  const payment: any = await findPayment(id); if (!payment) throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  const actorId = adminId || String(payment.userId);
  const request: any = { id: crypto.randomUUID(), userId: String(payment.userId), paymentId: payment._id || payment.id, reason, status: 'Processing', reviewedBy: actorId, audit: [{ actorId, action: 'Processing', note: reason, at: new Date() }], createdAt: new Date(), updatedAt: new Date() };
  const saved: any = connected() ? (await RefundRequest.create(request)).toObject() : (refunds.set(request.id, request), request);
  const result = await completeRefund(payment, actorId, reason);
  const audit = [...(saved.audit || []), { actorId, action: 'Completed', note: reason, at: new Date() }];
  if (connected()) await RefundRequest.updateOne({ _id: saved._id }, { $set: { status: 'Completed', audit } }); else { saved.status = 'Completed'; saved.audit = audit; saved.updatedAt = new Date(); refunds.set(saved.id, saved); }
  return result;
}

export async function adminRevenue(input: any) {
  const range = input.range || '30d'; const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '90d' ? 90 : range === 'custom' ? 3660 : 30;
  const from = input.from ? new Date(input.from) : new Date(Date.now() - days * 86400000); const to = input.to ? new Date(input.to) : new Date();
  const rows: any[] = connected() ? await Payment.find({ createdAt: { $gte: from, $lte: to } }).lean() : [...payments.values()].filter((item) => +new Date(item.createdAt) >= +from && +new Date(item.createdAt) <= +to);
  const paid = rows.filter((item) => item.status === 'paid' || item.status === 'refunded'); const sum = (type: string) => paid.filter((item) => item.type === type).reduce((total, item) => total + money(item.amount), 0); const refundTotal = paid.filter((item) => item.status === 'refunded').reduce((total, item) => total + money(item.amount), 0);
  const series = new Map<string, any>(); for (const item of paid) { const date = new Date(item.paidAt || item.createdAt).toISOString().slice(0, 10); const row = series.get(date) || { date, listing: 0, promotion: 0, package: 0, refunds: 0, total: 0 }; if (item.status === 'refunded') row.refunds += money(item.amount); else { row[item.type === 'listing_fee' ? 'listing' : item.type] += money(item.amount); row.total += money(item.amount); } series.set(date, row); }
  return { period: { from, to }, summary: { listingRevenue: sum('listing_fee'), promotionRevenue: sum('promotion'), packageRevenue: sum('package'), totalRevenue: paid.filter((item) => item.status === 'paid').reduce((total, item) => total + money(item.amount), 0), refunds: refundTotal, failedPayments: rows.filter((item) => item.status === 'failed').length }, series: [...series.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

export async function sandboxWebhookForTest(paymentId: string, status: 'paid' | 'failed' | 'cancelled') { if (env.nodeEnv !== 'test') throw new Error('Test helper unavailable'); const payment: any = await findPayment(paymentId); const raw = JSON.stringify({ eventId: crypto.randomUUID(), providerPaymentId: payment.providerPaymentId, reference: payment.reference, status, amount: money(payment.amount), currency: payment.currency }); const signature = crypto.createHmac('sha256', env.commerce.paymentWebhookSecret).update(raw).digest('hex'); return { raw, signature }; }

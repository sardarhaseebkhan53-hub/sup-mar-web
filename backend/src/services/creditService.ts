import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { CreditTransaction } from '../models/CreditTransaction.js';
import { SellerCreditWallet } from '../models/SellerCreditWallet.js';
import { AppError } from '../utils/AppError.js';

const wallets = new Map<string, any>();
const transactions = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;
const initial = (userId: string) => ({ userId, listingCredits: 0, promotionCredits: 0, featuredDays: 0, updatedAt: new Date() });
const present = (row: any) => ({ userId: String(row.userId), listingCredits: row.listingCredits || 0, promotionCredits: row.promotionCredits || 0, featuredDays: row.featuredDays || 0, updatedAt: row.updatedAt });

export async function getCreditWallet(userId: string) {
  if (connected()) return present(await SellerCreditWallet.findOneAndUpdate({ userId }, { $setOnInsert: initial(userId) }, { upsert: true, new: true }).lean());
  const row = wallets.get(userId) || initial(userId); wallets.set(userId, row); return present(row);
}

async function existingTransaction(userId: string, type: string, referenceId: string) {
  if (connected()) return CreditTransaction.findOne({ userId, type, referenceId }).lean();
  return [...transactions.values()].find((item) => item.userId === userId && item.type === type && item.referenceId === referenceId);
}

export async function grantCredits(userId: string, input: { listingCredits?: number; promotionCredits?: number; featuredDays?: number; reason: string; referenceId: string }) {
  const listingCredits = Math.max(0, Math.floor(input.listingCredits || 0));
  const promotionCredits = Math.max(0, Math.floor(input.promotionCredits || 0));
  const featuredDays = Math.max(0, Math.floor(input.featuredDays || 0));
  if (!listingCredits && !promotionCredits && !featuredDays) return getCreditWallet(userId);
  if (await existingTransaction(userId, 'listing_credit', input.referenceId) || await existingTransaction(userId, 'promotion_credit', input.referenceId) || await existingTransaction(userId, 'featured_day', input.referenceId)) return getCreditWallet(userId);
  if (connected()) {
    const rows: any[] = [];
    if (listingCredits) rows.push({ userId, type: 'listing_credit', amount: listingCredits, reason: input.reason, referenceId: input.referenceId });
    if (promotionCredits) rows.push({ userId, type: 'promotion_credit', amount: promotionCredits, reason: input.reason, referenceId: input.referenceId });
    if (featuredDays) rows.push({ userId, type: 'featured_day', amount: featuredDays, reason: input.reason, referenceId: input.referenceId });
    try { await CreditTransaction.insertMany(rows, { ordered: true }); } catch (error: any) { if (error?.code === 11000) return getCreditWallet(userId); throw error; }
    await SellerCreditWallet.findOneAndUpdate({ userId }, { $inc: { listingCredits, promotionCredits, featuredDays }, $setOnInsert: { userId } }, { upsert: true });
    return getCreditWallet(userId);
  }
  const wallet = wallets.get(userId) || initial(userId);
  wallet.listingCredits += listingCredits; wallet.promotionCredits += promotionCredits; wallet.featuredDays += featuredDays; wallet.updatedAt = new Date(); wallets.set(userId, wallet);
  if (listingCredits) transactions.set(crypto.randomUUID(), { userId, type: 'listing_credit', amount: listingCredits, reason: input.reason, referenceId: input.referenceId, createdAt: new Date() });
  if (promotionCredits) transactions.set(crypto.randomUUID(), { userId, type: 'promotion_credit', amount: promotionCredits, reason: input.reason, referenceId: input.referenceId, createdAt: new Date() });
  if (featuredDays) transactions.set(crypto.randomUUID(), { userId, type: 'featured_day', amount: featuredDays, reason: input.reason, referenceId: input.referenceId, createdAt: new Date() });
  return present(wallet);
}

export async function consumeCredit(userId: string, kind: 'listing' | 'promotion' | 'featured', amount: number, reason: string, referenceId: string) {
  const type = kind === 'featured' ? 'featured_day' : `${kind}_credit`;
  if (!Number.isInteger(amount) || amount < 1) throw new AppError(422, 'Credit amount is invalid', 'CREDIT_AMOUNT_INVALID');
  if (await existingTransaction(userId, type, referenceId)) return getCreditWallet(userId);
  const field = kind === 'listing' ? 'listingCredits' : kind === 'promotion' ? 'promotionCredits' : 'featuredDays';
  if (connected()) {
    const wallet: any = await SellerCreditWallet.findOneAndUpdate({ userId, [field]: { $gte: amount } }, { $inc: { [field]: -amount } }, { new: true }).lean();
    if (!wallet) throw new AppError(409, `Not enough ${kind} credits`, 'INSUFFICIENT_CREDITS');
    try { await CreditTransaction.create({ userId, type, amount: -amount, reason, referenceId }); }
    catch (error: any) { await SellerCreditWallet.updateOne({ userId }, { $inc: { [field]: amount } }); if (error?.code === 11000) return getCreditWallet(userId); throw error; }
    return present(wallet);
  }
  const wallet = wallets.get(userId) || initial(userId);
  if (wallet[field] < amount) throw new AppError(409, `Not enough ${kind} credits`, 'INSUFFICIENT_CREDITS');
  wallet[field] -= amount; wallet.updatedAt = new Date(); wallets.set(userId, wallet);
  transactions.set(crypto.randomUUID(), { userId, type, amount: -amount, reason, referenceId, createdAt: new Date() });
  return present(wallet);
}

export async function reservePackageEntitlementsForRefund(userId: string, input: { listingCredits: number; promotionCredits: number; featuredDays: number; reason: string; referenceId: string }) {
  const amounts = { listingCredits: Math.max(0, input.listingCredits), promotionCredits: Math.max(0, input.promotionCredits), featuredDays: Math.max(0, input.featuredDays) };
  if (await existingTransaction(userId, 'listing_credit', input.referenceId) || await existingTransaction(userId, 'promotion_credit', input.referenceId) || await existingTransaction(userId, 'featured_day', input.referenceId)) return getCreditWallet(userId);
  if (connected()) {
    const wallet: any = await SellerCreditWallet.findOneAndUpdate({ userId, listingCredits: { $gte: amounts.listingCredits }, promotionCredits: { $gte: amounts.promotionCredits }, featuredDays: { $gte: amounts.featuredDays } }, { $inc: { listingCredits: -amounts.listingCredits, promotionCredits: -amounts.promotionCredits, featuredDays: -amounts.featuredDays } }, { new: true }).lean();
    if (!wallet) throw new AppError(409, 'This package cannot be refunded after its entitlements have been used', 'REFUND_CREDITS_USED');
    const rows: any[] = [];
    if (amounts.listingCredits) rows.push({ userId, type: 'listing_credit', amount: -amounts.listingCredits, reason: input.reason, referenceId: input.referenceId });
    if (amounts.promotionCredits) rows.push({ userId, type: 'promotion_credit', amount: -amounts.promotionCredits, reason: input.reason, referenceId: input.referenceId });
    if (amounts.featuredDays) rows.push({ userId, type: 'featured_day', amount: -amounts.featuredDays, reason: input.reason, referenceId: input.referenceId });
    try { if (rows.length) await CreditTransaction.insertMany(rows, { ordered: true }); }
    catch (error) { await SellerCreditWallet.updateOne({ userId }, { $inc: amounts }); throw error; }
    return present(wallet);
  }
  const wallet = wallets.get(userId) || initial(userId);
  if (wallet.listingCredits < amounts.listingCredits || wallet.promotionCredits < amounts.promotionCredits || wallet.featuredDays < amounts.featuredDays) throw new AppError(409, 'This package cannot be refunded after its entitlements have been used', 'REFUND_CREDITS_USED');
  wallet.listingCredits -= amounts.listingCredits; wallet.promotionCredits -= amounts.promotionCredits; wallet.featuredDays -= amounts.featuredDays; wallet.updatedAt = new Date(); wallets.set(userId, wallet);
  if (amounts.listingCredits) transactions.set(crypto.randomUUID(), { userId, type: 'listing_credit', amount: -amounts.listingCredits, reason: input.reason, referenceId: input.referenceId, createdAt: new Date() });
  if (amounts.promotionCredits) transactions.set(crypto.randomUUID(), { userId, type: 'promotion_credit', amount: -amounts.promotionCredits, reason: input.reason, referenceId: input.referenceId, createdAt: new Date() });
  if (amounts.featuredDays) transactions.set(crypto.randomUUID(), { userId, type: 'featured_day', amount: -amounts.featuredDays, reason: input.reason, referenceId: input.referenceId, createdAt: new Date() });
  return present(wallet);
}

export async function releasePackageRefundReservation(userId: string, input: { listingCredits: number; promotionCredits: number; featuredDays: number; referenceId: string }) {
  if (connected()) {
    const result = await CreditTransaction.deleteMany({ userId, referenceId: input.referenceId, amount: { $lt: 0 } });
    if (result.deletedCount) await SellerCreditWallet.updateOne({ userId }, { $inc: { listingCredits: input.listingCredits, promotionCredits: input.promotionCredits, featuredDays: input.featuredDays } });
    return getCreditWallet(userId);
  }
  let found = false;
  for (const [id, item] of transactions) if (item.userId === userId && item.referenceId === input.referenceId && item.amount < 0) { transactions.delete(id); found = true; }
  if (found) { const wallet = wallets.get(userId) || initial(userId); wallet.listingCredits += input.listingCredits; wallet.promotionCredits += input.promotionCredits; wallet.featuredDays += input.featuredDays; wallet.updatedAt = new Date(); wallets.set(userId, wallet); }
  return getCreditWallet(userId);
}

export async function listCreditTransactions(userId: string, page = 1, limit = 20) {
  const rows: any[] = connected() ? await CreditTransaction.find({ userId }).sort({ createdAt: -1 }).lean() : [...transactions.values()].filter((item) => item.userId === userId).sort((a, b) => +b.createdAt - +a.createdAt);
  const start = (page - 1) * limit;
  return { transactions: rows.slice(start, start + limit).map((item) => ({ id: String(item._id || item.id || item.referenceId), type: item.type, amount: item.amount, reason: item.reason, referenceId: item.referenceId, createdAt: item.createdAt })), pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
}

export function resetCreditMemory() { wallets.clear(); transactions.clear(); }

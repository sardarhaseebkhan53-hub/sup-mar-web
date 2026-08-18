// @ts-nocheck
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { RewardLedger } from '../models/RewardLedger.js';
import { AppError } from '../utils/AppError.js';
import { getGrowthSettings } from './growthSettingsService.js';
import { grantCredits } from './creditService.js';

const memoryLedger = new Map<string, any>();
function isConnected() { return mongoose.connection.readyState === 1; }

export async function earnReward(input: {
  userId: string;
  type?: string;
  amount: number;
  currency?: string;
  points?: number;
  source: string;
  referenceId?: string;
  referenceModel?: string;
  description?: string;
  metadata?: any;
  expiresAt?: Date | null;
}) {
  const settings = await getGrowthSettings();
  if (!settings.rewards.enabled) throw new AppError(400, 'Rewards are currently disabled', 'REWARDS_DISABLED');
  if (input.amount <= 0 && (input.points || 0) <= 0) throw new AppError(422, 'Reward amount must be positive', 'REWARD_AMOUNT_INVALID');

  let expiresAt = input.expiresAt ?? null;
  if (!expiresAt && settings.rewards.expirationEnabled) {
    expiresAt = new Date(Date.now() + (settings.rewards.defaultExpirationDays || 90) * 24 * 60 * 60 * 1000);
  }

  if (isConnected()) {
    const doc = await RewardLedger.create({
      userId: input.userId,
      type: (input.type as any) || 'earn',
      amount: input.amount,
      currency: input.currency || 'PKR',
      points: input.points || 0,
      source: input.source,
      referenceId: input.referenceId || null,
      referenceModel: input.referenceModel || null,
      status: 'available',
      description: input.description || '',
      metadata: input.metadata || {},
      expiresAt,
    });
    return doc.toObject();
  } else {
    const id = crypto.randomUUID();
    const doc = { _id: id, id, userId: input.userId, type: input.type || 'earn', amount: input.amount, currency: input.currency || 'PKR', points: input.points || 0, source: input.source, referenceId: input.referenceId || null, referenceModel: input.referenceModel || null, status: 'available', description: input.description || '', metadata: input.metadata || {}, expiresAt, createdAt: new Date(), updatedAt: new Date() };
    memoryLedger.set(id, doc);
    return doc;
  }
}

export async function getRewardBalance(userId: string) {
  if (isConnected()) {
    const [available, pending, used, expired, reversed] = await Promise.all([
      RewardLedger.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: 'available' } }, { $group: { _id: null, total: { $sum: '$amount' }, points: { $sum: '$points' }, count: { $sum: 1 } } }]),
      RewardLedger.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' }, points: { $sum: '$points' }, count: { $sum: 1 } } }]),
      RewardLedger.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: 'used' } }, { $group: { _id: null, total: { $sum: '$amount' }, points: { $sum: '$points' }, count: { $sum: 1 } } }]),
      RewardLedger.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: 'expired' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      RewardLedger.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: 'reversed' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    const get = (arr: any) => arr[0] || { total: 0, points: 0, count: 0 };
    return {
      available: get(available),
      pending: get(pending),
      used: get(used),
      expired: get(expired),
      reversed: get(reversed),
      balance: (get(available).total || 0),
    };
  } else {
    const all = [...memoryLedger.values()].filter(r => String(r.userId) === String(userId));
    const sum = (status: string) => {
      const filtered = all.filter(r => r.status === status);
      return { total: filtered.reduce((s, x) => s + (x.amount || 0), 0), points: filtered.reduce((s, x) => s + (x.points || 0), 0), count: filtered.length };
    };
    return { available: sum('available'), pending: sum('pending'), used: sum('used'), expired: sum('expired'), reversed: sum('reversed'), balance: sum('available').total };
  }
}

export async function listRewardTransactions(userId: string, filter: { status?: string; type?: string; source?: string; page?: number; limit?: number } = {}) {
  const page = filter.page || 1;
  const limit = Math.min(100, filter.limit || 20);
  const skip = (page - 1) * limit;
  const query: any = { userId };
  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = filter.type;
  if (filter.source) query.source = filter.source;

  if (isConnected()) {
    const [rows, total] = await Promise.all([
      RewardLedger.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RewardLedger.countDocuments(query),
    ]);
    return { transactions: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  let all = [...memoryLedger.values()].filter(r => String(r.userId) === String(userId));
  if (filter.status) all = all.filter(r => r.status === filter.status);
  if (filter.type) all = all.filter(r => r.type === filter.type);
  if (filter.source) all = all.filter(r => r.source === filter.source);
  all.sort((a,b)=>+b.createdAt - +a.createdAt);
  return { transactions: all.slice(skip, skip + limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function redeemReward(userId: string, amount: number, description = 'Reward redemption') {
  if (amount <= 0) throw new AppError(422, 'Redemption amount must be positive', 'REWARD_AMOUNT_INVALID');
  if (isConnected()) {
    const session = await mongoose.startSession();
    try {
      let result: any = null;
      await session.withTransaction(async () => {
        // Find available ledgers ordered by earliest expiration
        const availableLedgers = await RewardLedger.find({ userId, status: 'available' }).sort({ expiresAt: 1, createdAt: 1 }).session(session);
        const totalAvailable = availableLedgers.reduce((s, l) => s + l.amount, 0);
        if (totalAvailable < amount) throw new AppError(400, 'Insufficient reward balance', 'INSUFFICIENT_REWARDS');

        let remaining = amount;
        for (const ledger of availableLedgers) {
          if (remaining <= 0) break;
          if (ledger.amount <= remaining) {
            ledger.status = 'used';
            remaining -= ledger.amount;
            await ledger.save({ session });
          } else {
            // Split ledger: partially use
            const usedAmount = remaining;
            const leftover = ledger.amount - usedAmount;
            ledger.amount = leftover;
            await ledger.save({ session });
            const usedLedger = await RewardLedger.create([{
              userId,
              type: 'redeem',
              amount: usedAmount,
              currency: ledger.currency,
              source: ledger.source,
              referenceId: ledger._id,
              referenceModel: 'RewardLedger',
              status: 'used',
              description,
              originalLedgerId: ledger._id,
            }], { session });
            remaining = 0;
          }
        }

        // Create redemption ledger entry
        const redemption = await RewardLedger.create([{
          userId,
          type: 'redeem',
          amount,
          currency: 'PKR',
          source: 'system',
          status: 'used',
          description,
        }], { session });
        result = redemption[0];
      });
      return result?.toObject ? result.toObject() : result;
    } finally {
      await session.endSession();
    }
  } else {
    const available = [...memoryLedger.values()].filter(r => String(r.userId) === String(userId) && r.status === 'available').sort((a,b)=>+a.createdAt - +b.createdAt);
    const total = available.reduce((s, r) => s + r.amount, 0);
    if (total < amount) throw new AppError(400, 'Insufficient reward balance', 'INSUFFICIENT_REWARDS');
    let remaining = amount;
    for (const l of available) {
      if (remaining <= 0) break;
      if (l.amount <= remaining) { l.status = 'used'; remaining -= l.amount; }
      else { l.amount -= remaining; remaining = 0; }
    }
    const id = crypto.randomUUID();
    const doc = { _id: id, id, userId, type: 'redeem', amount, currency: 'PKR', source: 'system', status: 'used', description, createdAt: new Date() };
    memoryLedger.set(id, doc);
    return doc;
  }
}

export async function reverseReward(ledgerId: string, reason: string) {
  if (isConnected()) {
    const ledger = await RewardLedger.findById(ledgerId);
    if (!ledger) throw new AppError(404, 'Reward not found', 'REWARD_NOT_FOUND');
    if (ledger.status === 'reversed') return ledger.toObject();

    const reversal = await RewardLedger.create({
      userId: ledger.userId,
      type: 'reverse',
      amount: -Math.abs(ledger.amount),
      currency: ledger.currency,
      source: ledger.source,
      referenceId: ledger._id,
      referenceModel: 'RewardLedger',
      status: 'reversed',
      description: reason,
      originalLedgerId: ledger._id,
    });
    ledger.status = 'reversed';
    ledger.reversedAt = new Date();
    ledger.reversalReason = reason;
    await ledger.save();

    // If credits were granted, try to revoke? For simplicity, we grant ledger reversal but not credit auto-revoke
    return reversal.toObject();
  } else {
    const ledger = memoryLedger.get(ledgerId);
    if (!ledger) throw new AppError(404, 'Reward not found', 'REWARD_NOT_FOUND');
    ledger.status = 'reversed';
    ledger.reversedAt = new Date();
    ledger.reversalReason = reason;
    const id = crypto.randomUUID();
    const rev = { _id: id, id, userId: ledger.userId, type: 'reverse', amount: -Math.abs(ledger.amount), currency: ledger.currency, source: ledger.source, status: 'reversed', description: reason, createdAt: new Date() };
    memoryLedger.set(id, rev);
    return rev;
  }
}

export async function expireRewards() {
  if (!isConnected()) return 0;
  const now = new Date();
  const result = await RewardLedger.updateMany({ status: 'available', expiresAt: { $lte: now } }, { $set: { status: 'expired' } });
  return result.modifiedCount || 0;
}

export async function handleTransactionReversal(userId: string, referenceId: string, reason: string) {
  // When eligible transaction is reversed/refunded, reverse associated rewards
  if (isConnected()) {
    const related = await RewardLedger.find({ userId, referenceId, status: 'available' }).lean();
    for (const r of related) await reverseReward(String(r._id), reason);
    return related.length;
  }
  return 0;
}

export function resetRewardMemory() {
  memoryLedger.clear();
}

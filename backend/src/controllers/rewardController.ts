// @ts-nocheck
import { getRewardBalance, listRewardTransactions } from '../services/rewardService.js';

export async function myRewards(req, res) {
  const balance = await getRewardBalance(req.auth.userId);
  const transactions = await listRewardTransactions(req.auth.userId, { page: Number(req.query.page) || 1, limit: Math.min(100, Number(req.query.limit) || 20), status: req.query.status ? String(req.query.status) : undefined, type: req.query.type ? String(req.query.type) : undefined, source: req.query.source ? String(req.query.source) : undefined });
  res.json({ success: true, data: { balance, transactions: transactions.transactions, pagination: transactions.pagination } });
}

export async function rewardsBalance(req, res) {
  const balance = await getRewardBalance(req.auth.userId);
  res.json({ success: true, data: balance });
}

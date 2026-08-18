import mongoose from 'mongoose';
import { UserBlock } from '../models/UserBlock.js';
import { AppError } from '../utils/AppError.js';

const memory = new Map<string, { id: string; blockerId: string; blockedId: string; createdAt: Date }>();
const keyOf = (blockerId: string, blockedId: string) => `${blockerId}:${blockedId}`;
const connected = () => mongoose.connection.readyState === 1;

export async function areUsersBlocked(a: string, b: string) {
  if (connected()) return Boolean(await UserBlock.exists({ $or: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] }));
  return memory.has(keyOf(a, b)) || memory.has(keyOf(b, a));
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new AppError(409, 'You cannot block yourself', 'SELF_BLOCK');
  if (connected()) {
    try { await UserBlock.create({ blockerId, blockedId }); }
    catch (error: any) { if (error?.code !== 11000) throw error; }
  } else if (!memory.has(keyOf(blockerId, blockedId))) {
    memory.set(keyOf(blockerId, blockedId), { id: keyOf(blockerId, blockedId), blockerId, blockedId, createdAt: new Date() });
  }
  const { blockConversationsBetween } = await import('./messagingService.js');
  await blockConversationsBetween(blockerId, blockedId, true);
  return { blocked: true, blockedId };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  if (connected()) await UserBlock.deleteOne({ blockerId, blockedId });
  else memory.delete(keyOf(blockerId, blockedId));
  const { blockConversationsBetween } = await import('./messagingService.js');
  await blockConversationsBetween(blockerId, blockedId, false);
  return { blocked: false, blockedId };
}

export async function listBlocks(blockerId: string) {
  if (connected()) return (await UserBlock.find({ blockerId }).sort({ createdAt: -1 }).lean()).map((item: any) => ({ blockedId: String(item.blockedId), createdAt: item.createdAt }));
  return [...memory.values()].filter((item) => item.blockerId === blockerId).map((item) => ({ blockedId: item.blockedId, createdAt: item.createdAt }));
}

export function __resetBlockMemory() { memory.clear(); }

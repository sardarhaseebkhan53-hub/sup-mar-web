import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SupportTicket } from '../models/SupportTicket.js';
import { AppError } from '../utils/AppError.js';

const memory = new Map<string, any>();

export function presentTicket(record: any) {
  return {
    id: String(record._id || record.id),
    userId: String(record.userId),
    conversationId: record.conversationId || null,
    category: record.category,
    description: record.description,
    priority: record.priority,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function createSupportTicket(userId: string, input: { conversationId?: string; category: string; description: string; priority?: string }) {
  if (!SUPPORT_CATEGORIES.includes(input.category as any)) throw new AppError(422, 'Choose a valid support category', 'SUPPORT_CATEGORY_INVALID');
  const description = String(input.description || '').trim();
  if (description.length < 8) throw new AppError(422, 'Describe the issue in a bit more detail', 'SUPPORT_DESCRIPTION_INVALID');
  const priority = SUPPORT_PRIORITIES.includes(input.priority as any) ? input.priority : 'medium';
  const record = { id: crypto.randomUUID(), userId, conversationId: input.conversationId || null, category: input.category, description: description.slice(0, 4000), priority, status: 'Open', createdAt: new Date(), updatedAt: new Date() };
  if (mongoose.connection.readyState === 1) return presentTicket(await SupportTicket.create(record));
  memory.set(record.id, record);
  return presentTicket(record);
}

export async function listSupportTickets(userId: string) {
  const rows = mongoose.connection.readyState === 1
    ? await SupportTicket.find({ userId }).sort({ createdAt: -1 }).limit(50).lean()
    : [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return rows.map(presentTicket);
}

export function __resetSupportMemory() { memory.clear(); }

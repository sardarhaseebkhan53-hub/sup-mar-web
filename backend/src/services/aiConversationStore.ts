import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AIConversation } from '../models/AIConversation.js';
import { AIMessage } from '../models/AIMessage.js';
import type { SearchIntent } from '../ai/types.js';

const conversations = new Map<string, any>();
const messages = new Map<string, any[]>();

export function presentConversation(record: any, items: any[] = []) {
  return {
    id: String(record._id || record.id),
    title: record.title,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
    messages: items.map((item) => ({
      id: String(item._id || item.id),
      role: item.role,
      message: item.message,
      tools: item.tools || [],
      createdAt: item.createdAt,
    })),
  };
}

export async function getOrCreateConversation(input: { conversationId?: string; userId?: string | null; guestKey?: string | null; listingId?: string }) {
  const id = input.conversationId;
  if (id) {
    const existing = await findConversation(id, input.userId, input.guestKey);
    if (existing) return existing;
  }
  const record = {
    id: crypto.randomUUID(),
    userId: input.userId || null,
    guestKey: input.userId ? null : input.guestKey || crypto.randomUUID(),
    title: 'QAVLIO Assistant',
    lastIntent: null,
    listingId: input.listingId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (mongoose.connection.readyState === 1) {
    const created = await AIConversation.create(record);
    return created.toObject();
  }
  conversations.set(record.id, record);
  messages.set(record.id, []);
  return record;
}

async function findConversation(id: string, userId?: string | null, guestKey?: string | null) {
  if (mongoose.connection.readyState === 1) {
    const query: any = { _id: mongoose.isValidObjectId(id) ? id : undefined };
    if (!query._id) return null;
    const record: any = await AIConversation.findOne(query).lean();
    if (!record) return null;
    if (userId && record.userId && String(record.userId) !== userId) return null;
    if (!userId && record.userId) return null;
    if (!userId && record.guestKey && guestKey && record.guestKey !== guestKey) return null;
    return record;
  }
  const record = conversations.get(id);
  if (!record) return null;
  if (userId && record.userId && record.userId !== userId) return null;
  if (!userId && record.userId) return null;
  return record;
}

export async function appendMessage(conversation: any, role: 'user' | 'assistant', message: string, extra: { tools?: any[]; meta?: any; intent?: SearchIntent | null } = {}) {
  const conversationId = conversation._id || conversation.id;
  const item = { id: crypto.randomUUID(), conversationId, role, message: message.slice(0, 8000), tools: extra.tools || [], meta: extra.meta || {}, createdAt: new Date() };
  if (mongoose.connection.readyState === 1) {
    await AIMessage.create({ ...item, conversationId: conversation._id || conversationId });
    await AIConversation.updateOne({ _id: conversation._id }, { $set: { updatedAt: new Date(), ...(extra.intent ? { lastIntent: extra.intent } : {}) } });
  } else {
    const list = messages.get(String(conversationId)) || [];
    list.push(item);
    messages.set(String(conversationId), list.slice(-40));
    conversation.updatedAt = new Date();
    if (extra.intent) conversation.lastIntent = extra.intent;
    conversations.set(String(conversationId), conversation);
  }
  return item;
}

export async function listMessages(conversation: any, limit = 20) {
  const conversationId = conversation._id || conversation.id;
  if (mongoose.connection.readyState === 1) {
    return AIMessage.find({ conversationId: conversation._id || conversationId }).sort({ createdAt: 1 }).limit(limit).lean();
  }
  return (messages.get(String(conversationId)) || []).slice(-limit);
}

export async function listConversations(userId: string) {
  if (mongoose.connection.readyState === 1) {
    return (await AIConversation.find({ userId }).sort({ updatedAt: -1 }).limit(30).lean()).map((item) => presentConversation(item));
  }
  return [...conversations.values()].filter((item) => item.userId === userId).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).map((item) => presentConversation(item));
}

export async function getConversationForUser(id: string, userId?: string | null, guestKey?: string | null) {
  const record = await findConversation(id, userId, guestKey);
  if (!record) return null;
  return presentConversation(record, await listMessages(record, 50));
}

export function __resetConversationMemory() { conversations.clear(); messages.clear(); }

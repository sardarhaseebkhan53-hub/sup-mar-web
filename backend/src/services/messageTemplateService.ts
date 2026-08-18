import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MessageTemplate } from '../models/MessageTemplate.js';
import { AppError } from '../utils/AppError.js';

/**
 * Message templates (Phase 17 §25–26) — manual quick replies only.
 * Validation blocks spam-style content; nothing is ever sent automatically.
 */

const MAX_TEMPLATES = 20;
const SPAM_PATTERNS = [/(https?:\/\/\S+){4,}/i, /(whatsapp|wa\.me|click link|free money|earn \$|crypto|loan offer)/i, /(.)\1{12,}/];

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

function assertSafe(body: string) {
  if (SPAM_PATTERNS.some((pattern) => pattern.test(body))) {
    throw new AppError(422, 'Templates cannot contain spam or promotional links. Write a helpful reply instead.', 'TEMPLATE_REJECTED');
  }
}

function present(row: any) {
  return { id: String(row._id || row.id), name: row.name, body: row.body, usageCount: row.usageCount || 0, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

async function countFor(sellerId: string) {
  if (connected()) return MessageTemplate.countDocuments({ sellerId });
  return [...memory.values()].filter((item: any) => String(item.sellerId) === String(sellerId)).length;
}

export async function listTemplates(sellerId: string) {
  const rows: any[] = connected()
    ? await MessageTemplate.find({ sellerId }).sort({ updatedAt: -1 }).lean()
    : [...memory.values()].filter((item: any) => String(item.sellerId) === String(sellerId)).sort((a, b) => +b.updatedAt - +a.updatedAt);
  return { templates: rows.map(present), limits: { max: MAX_TEMPLATES, used: rows.length } };
}

export async function createTemplate(sellerId: string, input: { name: string; body: string }) {
  assertSafe(input.body);
  if (await countFor(sellerId) >= MAX_TEMPLATES) throw new AppError(422, `You can keep up to ${MAX_TEMPLATES} quick replies. Delete one first.`, 'TEMPLATE_LIMIT');
  const base = { sellerId, name: input.name.trim().slice(0, 80), body: input.body.trim().slice(0, 500), usageCount: 0 };
  let row: any;
  if (connected()) row = (await MessageTemplate.create(base)).toObject();
  else {
    const now = new Date();
    row = { _id: crypto.randomUUID(), ...base, createdAt: now, updatedAt: now };
    memory.set(row._id, row);
  }
  return present(row);
}

async function findRow(sellerId: string, id: string) {
  let row: any;
  if (connected() && mongoose.isValidObjectId(id)) row = await MessageTemplate.findById(id).lean();
  else if (!connected()) row = memory.get(id);
  if (!row || String(row.sellerId) !== String(sellerId)) throw new AppError(404, 'Template not found', 'TEMPLATE_NOT_FOUND');
  return row;
}

export async function updateTemplate(sellerId: string, id: string, patch: { name?: string; body?: string }) {
  const row = await findRow(sellerId, id);
  const updates: any = {};
  if (patch.name !== undefined) updates.name = patch.name.trim().slice(0, 80);
  if (patch.body !== undefined) {
    assertSafe(patch.body);
    updates.body = patch.body.trim().slice(0, 500);
  }
  let saved: any;
  if (connected()) saved = await MessageTemplate.findByIdAndUpdate(row._id, { $set: updates }, { new: true }).lean();
  else {
    Object.assign(row, updates, { updatedAt: new Date() });
    memory.set(row._id, row);
    saved = row;
  }
  return present(saved);
}

export async function deleteTemplate(sellerId: string, id: string) {
  const row = await findRow(sellerId, id);
  if (connected()) await MessageTemplate.deleteOne({ _id: row._id });
  else memory.delete(String(row._id));
  return { deleted: true };
}

/** Records manual usage so sellers can see their most-used quick replies. */
export async function recordTemplateUse(sellerId: string, id: string) {
  const row = await findRow(sellerId, id);
  if (connected()) await MessageTemplate.updateOne({ _id: row._id }, { $inc: { usageCount: 1 } });
  else {
    row.usageCount = (row.usageCount || 0) + 1;
    memory.set(row._id, row);
  }
  return { used: true };
}

export function __resetTemplateMemory() {
  memory.clear();
}

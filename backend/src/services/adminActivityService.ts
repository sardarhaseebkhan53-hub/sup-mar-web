import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AdminActivity } from '../models/AdminActivity.js';
import { ModerationNote } from '../models/ModerationNote.js';

const activities = new Map<string, any>();
const notes = new Map<string, any>();
const present = (item: any) => ({
  id: String(item._id || item.id), adminId: String(item.adminId), action: item.action,
  targetType: item.targetType, targetId: item.targetId, result: item.result || 'success',
  metadata: item.metadata instanceof Map ? Object.fromEntries(item.metadata) : item.metadata || {},
  request: { device: item.request?.device || '', ipApproximation: item.request?.ipApproximation || '' }, createdAt: item.createdAt,
});

export async function logAdminActivity(adminId: string, action: string, targetType: string, targetId: string, metadata: any = {}, req?: any, result: 'success' | 'denied' | 'failed' = 'success') {
  const record = { id: crypto.randomUUID(), adminId, action, targetType, targetId, result, metadata, request: { ipApproximation: req?.ip || '', device: (req?.get?.('user-agent') || '').slice(0, 120) }, createdAt: new Date() };
  if (mongoose.connection.readyState === 1) await AdminActivity.create(record); else activities.set(record.id, record);
  return present(record);
}

export async function listAdminActivity(input: any = {}) {
  const page = Number(input.page) || 1, limit = Math.min(100, Number(input.limit) || 25);
  const targetCondition = input.targetType ? input.targetType : input.allowedTargetTypes?.length ? { $in: input.allowedTargetTypes } : undefined;
  let rows: any[] = mongoose.connection.readyState === 1
    ? await AdminActivity.find({ ...(input.admin && { adminId: input.admin }), ...(input.action && { action: { $regex: String(input.action).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }), ...(targetCondition && { targetType: targetCondition }), ...(input.result && { result: input.result }), ...(input.date && { createdAt: { $gte: new Date(input.date) } }) }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
    : [...activities.values()].filter((item) => (!input.admin || item.adminId === input.admin) && (!input.action || item.action.toLowerCase().includes(String(input.action).toLowerCase())) && (!input.targetType || item.targetType === input.targetType) && (!input.allowedTargetTypes?.length || input.allowedTargetTypes.includes(item.targetType)) && (!input.result || (item.result || 'success') === input.result) && (!input.date || item.createdAt >= new Date(input.date))).sort((a, b) => +b.createdAt - +a.createdAt);
  const total = mongoose.connection.readyState === 1
    ? await AdminActivity.countDocuments({ ...(input.admin && { adminId: input.admin }), ...(targetCondition && { targetType: targetCondition }), ...(input.action && { action: { $regex: String(input.action).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }), ...(input.result && { result: input.result }), ...(input.date && { createdAt: { $gte: new Date(input.date) } }) })
    : rows.length;
  if (mongoose.connection.readyState !== 1) rows = rows.slice((page - 1) * limit, page * limit);
  return { activities: rows.map(present), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function activityTimeline(targetType: string, targetId: string, limit = 30) {
  const rows: any[] = mongoose.connection.readyState === 1
    ? await AdminActivity.find({ targetType, targetId }).sort({ createdAt: -1 }).limit(Math.min(100, limit)).lean()
    : [...activities.values()].filter((item) => item.targetType === targetType && item.targetId === targetId).sort((a, b) => +b.createdAt - +a.createdAt).slice(0, limit);
  return rows.map(present);
}

export async function addModerationNote(authorId: string, targetType: string, targetId: string, note: string) {
  const record = { id: crypto.randomUUID(), authorId, targetType, targetId, note, createdAt: new Date() };
  if (mongoose.connection.readyState === 1) await ModerationNote.create(record); else notes.set(record.id, record); return record;
}
export async function getModerationNotes(targetType: string, targetId: string) {
  const rows: any[] = mongoose.connection.readyState === 1 ? await ModerationNote.find({ targetType, targetId }).sort({ createdAt: -1 }).lean() : [...notes.values()].filter((item) => item.targetType === targetType && item.targetId === targetId).sort((a, b) => +b.createdAt - +a.createdAt);
  return rows.map((item) => ({ id: String(item._id || item.id), authorId: String(item.authorId), note: item.note, createdAt: item.createdAt }));
}
export function resetAdminActivityMemory() { activities.clear(); notes.clear(); }

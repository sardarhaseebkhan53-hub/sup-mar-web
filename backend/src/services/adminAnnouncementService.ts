import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AdminAnnouncement } from '../models/AdminAnnouncement.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { logAdminActivity } from './adminActivityService.js';
import { createSystemNotification } from './messagingService.js';

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;
const plain = (value: unknown) => String(value || '').replace(/<[^>]*>/g, '').trim();
const present = (item: any) => ({ id: String(item._id || item.id), title: item.title, message: item.message, type: item.type, audience: item.audience, status: effectiveStatus(item), startAt: item.startAt, endAt: item.endAt, deliveredAt: item.deliveredAt || null, deliveredCount: item.deliveredCount || 0, createdBy: String(item.createdBy), createdAt: item.createdAt, updatedAt: item.updatedAt });
function effectiveStatus(item: any) { if (['Draft', 'Cancelled'].includes(item.status)) return item.status; const now = new Date(); if (new Date(item.endAt) <= now) return 'Expired'; if (new Date(item.startAt) > now) return 'Scheduled'; return 'Active'; }
const byId = async (id: string) => connected() && mongoose.isValidObjectId(id) ? AdminAnnouncement.findById(id).lean() : memory.get(id);

function userMatches(user: any, audience: string) {
  if (audience === 'all') return true;
  if (audience === 'buyers') return user.roles?.includes('customer') && !user.roles?.includes('seller');
  if (audience === 'sellers') return user.roles?.includes('seller');
  return user.roles?.includes('seller') && [user.verification?.trustedSeller?.status, user.verification?.business?.status, user.verification?.identity?.status].includes('verified');
}

async function deliver(item: any) {
  if (item.deliveredAt || effectiveStatus(item) !== 'Active') return item.deliveredCount || 0;
  let count = 0;
  if (connected()) {
    const filter: any = { status: 'active' };
    if (item.audience === 'buyers') filter.roles = { $all: ['customer'], $nin: ['seller'] };
    if (['sellers', 'verified_sellers'].includes(item.audience)) filter.roles = 'seller';
    if (item.audience === 'verified_sellers') filter.$or = [{ 'verification.trustedSeller.status': 'verified' }, { 'verification.business.status': 'verified' }, { 'verification.identity.status': 'verified' }];
    const cursor = User.find(filter).select('_id').cursor(); const batch: any[] = [];
    for await (const user of cursor) { batch.push({ userId: user._id, type: 'system', title: item.title, body: item.message, relatedId: String(item._id), relatedType: 'system', channel: 'in-app' }); count += 1; if (batch.length >= 500) { await Notification.insertMany(batch.splice(0)); } }
    if (batch.length) await Notification.insertMany(batch);
    await AdminAnnouncement.updateOne({ _id: item._id, deliveredAt: null }, { $set: { deliveredAt: new Date(), deliveredCount: count, status: 'Active' } });
  } else {
    const users = await getIdentityRepository().listUsers({ limit: 10000 });
    for (const user of users.filter((candidate: any) => userMatches(candidate, item.audience))) { await createSystemNotification(String(user._id || user.id), { type: 'system', title: item.title, body: item.message, relatedId: item.id, relatedType: 'system' }); count += 1; }
    item.deliveredAt = new Date(); item.deliveredCount = count; item.status = 'Active'; memory.set(item.id, item);
  }
  return count;
}

export async function adminListAnnouncements(input: any = {}) {
  let rows: any[] = connected() ? await AdminAnnouncement.find({ ...(input.status && { status: input.status }), ...(input.audience && { audience: input.audience }) }).sort({ createdAt: -1 }).limit(500).lean() : [...memory.values()].filter((item) => (!input.status || effectiveStatus(item) === input.status) && (!input.audience || item.audience === input.audience)).sort((a, b) => +b.createdAt - +a.createdAt);
  for (const item of rows) if (effectiveStatus(item) === 'Active' && !item.deliveredAt) await deliver(item);
  return rows.map(present);
}

function validateInput(input: any) {
  const title = plain(input.title).slice(0, 140), message = plain(input.message).slice(0, 1200); const startAt = new Date(input.startAt), endAt = new Date(input.endAt);
  if (title.length < 3 || message.length < 5) throw new AppError(422, 'Announcement title and message are required', 'ANNOUNCEMENT_INVALID');
  if (!(endAt > startAt)) throw new AppError(422, 'Announcement end must be after its start', 'ANNOUNCEMENT_DATES_INVALID');
  return { title, message, type: input.type, audience: input.audience, status: input.status || (startAt > new Date() ? 'Scheduled' : 'Active'), startAt, endAt };
}

export async function createAdminAnnouncement(adminId: string, input: any, req: any) {
  const payload = validateInput(input), now = new Date(); const item: any = { id: crypto.randomUUID(), ...payload, createdBy: adminId, deliveredAt: null, deliveredCount: 0, createdAt: now, updatedAt: now };
  const saved: any = connected() ? (await AdminAnnouncement.create(item)).toObject() : (memory.set(item.id, item), item);
  if (effectiveStatus(saved) === 'Active') await deliver(saved);
  await logAdminActivity(adminId, 'ADMIN_CREATED_ANNOUNCEMENT', 'announcement', String(saved._id || saved.id), { audience: saved.audience, type: saved.type }, req); return present(saved);
}

export async function updateAdminAnnouncement(adminId: string, id: string, input: any, req: any) {
  const current: any = await byId(id); if (!current) throw new AppError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND');
  if (current.deliveredAt && !['Cancelled', 'Expired'].includes(input.status)) throw new AppError(409, 'Delivered announcements can only be cancelled', 'ANNOUNCEMENT_ALREADY_DELIVERED');
  const payload = validateInput({ ...current, ...input }); let saved: any;
  if (connected()) saved = await AdminAnnouncement.findByIdAndUpdate(current._id, { $set: payload }, { new: true, runValidators: true }).lean(); else { saved = { ...current, ...payload, updatedAt: new Date() }; memory.set(id, saved); }
  if (effectiveStatus(saved) === 'Active' && !saved.deliveredAt) await deliver(saved);
  await logAdminActivity(adminId, 'ADMIN_UPDATED_ANNOUNCEMENT', 'announcement', id, { status: payload.status }, req); return present(saved);
}

export function resetAnnouncementMemory() { memory.clear(); }

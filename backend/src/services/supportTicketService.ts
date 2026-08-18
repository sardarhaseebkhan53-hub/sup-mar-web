import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES, SupportTicket } from '../models/SupportTicket.js';
import { SupportTicketMessage } from '../models/SupportTicketMessage.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { logAdminActivity } from './adminActivityService.js';

const memory = new Map<string, any>();
const messages = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

export function presentTicket(record: any) {
  return { id: String(record._id || record.id), userId: String(record.userId), conversationId: record.conversationId || null, subject: record.subject || 'Support request', category: record.category, description: record.description, priority: record.priority, status: record.status, assignedTo: record.assignedTo ? String(record.assignedTo) : null, lastReplyAt: record.lastReplyAt || null, resolvedAt: record.resolvedAt || null, createdAt: record.createdAt, updatedAt: record.updatedAt };
}
const ticketById = async (id: string) => connected() && mongoose.isValidObjectId(id) ? SupportTicket.findById(id).lean() : memory.get(id);

export async function createSupportTicket(userId: string, input: { conversationId?: string; subject?: string; category: string; description: string; priority?: string }) {
  if (!SUPPORT_CATEGORIES.includes(input.category as any)) throw new AppError(422, 'Choose a valid support category', 'SUPPORT_CATEGORY_INVALID');
  const description = String(input.description || '').trim(); if (description.length < 8) throw new AppError(422, 'Describe the issue in a bit more detail', 'SUPPORT_DESCRIPTION_INVALID');
  const priority = SUPPORT_PRIORITIES.includes(input.priority as any) ? input.priority : 'medium'; const now = new Date();
  const record = { id: crypto.randomUUID(), userId, conversationId: input.conversationId || null, subject: String(input.subject || `${input.category} support request`).trim().slice(0, 160), category: input.category, description: description.slice(0, 4000), priority, status: 'Open', assignedTo: null, createdAt: now, updatedAt: now };
  if (connected()) return presentTicket(await SupportTicket.create(record)); memory.set(record.id, record); return presentTicket(record);
}

export async function listSupportTickets(userId: string) {
  const rows = connected() ? await SupportTicket.find({ userId }).sort({ createdAt: -1 }).limit(50).lean() : [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return rows.map(presentTicket);
}

export async function adminListSupportTickets(input: any) {
  const page = Number(input.page) || 1, limit = Math.min(100, Number(input.limit) || 25);
  const filter: any = { ...(input.status && { status: input.status }), ...(input.priority && { priority: input.priority }), ...(input.assignedTo && { assignedTo: input.assignedTo }) };
  if (input.search) filter.$or = [{ subject: { $regex: String(input.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { description: { $regex: String(input.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }];
  let rows: any[] = connected() ? await SupportTicket.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean() : [...memory.values()].filter((item) => (!input.status || item.status === input.status) && (!input.priority || item.priority === input.priority) && (!input.assignedTo || String(item.assignedTo) === input.assignedTo) && (!input.search || `${item.subject} ${item.description}`.toLowerCase().includes(String(input.search).toLowerCase()))).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const all = connected() ? null : rows;
  const total = connected() ? await SupportTicket.countDocuments(filter) : rows.length;
  if (!connected()) rows = rows.slice((page - 1) * limit, page * limit);
  const summaryRows: any[] = connected() ? await SupportTicket.find({}).select('status').lean() : all || [...memory.values()];
  return { tickets: rows.map(presentTicket), summary: { open: summaryRows.filter((item) => item.status === 'Open').length, pending: summaryRows.filter((item) => item.status === 'Waiting for User').length, inProgress: summaryRows.filter((item) => item.status === 'In Progress').length, resolved: summaryRows.filter((item) => ['Resolved', 'Closed'].includes(item.status)).length }, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function adminSupportTicket(id: string) {
  const ticket: any = await ticketById(id); if (!ticket) throw new AppError(404, 'Support ticket not found', 'SUPPORT_TICKET_NOT_FOUND');
  const rows: any[] = connected() ? await SupportTicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 }).lean() : [...messages.values()].filter((item) => item.ticketId === id).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const user: any = await getIdentityRepository().findUserById(String(ticket.userId));
  return { ticket: presentTicket(ticket), user: user ? { id: String(user._id || user.id), name: user.name, email: user.email || null, roles: user.roles, status: user.status } : null, messages: rows.map((item) => ({ id: String(item._id || item.id), authorId: String(item.authorId), body: item.body, internal: Boolean(item.internal), createdAt: item.createdAt })) };
}

export async function adminUpdateSupportTicket(adminId: string, id: string, input: any, req: any) {
  const ticket: any = await ticketById(id); if (!ticket) throw new AppError(404, 'Support ticket not found', 'SUPPORT_TICKET_NOT_FOUND');
  if (input.status && !SUPPORT_STATUSES.includes(input.status)) throw new AppError(422, 'Support status is invalid', 'SUPPORT_STATUS_INVALID');
  if (input.assignedTo) { const assignee: any = await getIdentityRepository().findUserById(input.assignedTo); if (!assignee || !assignee.roles?.some((role: string) => ['support', 'admin', 'super_admin'].includes(role))) throw new AppError(422, 'Choose an administrator or support agent', 'SUPPORT_ASSIGNEE_INVALID'); }
  const patch = { ...(input.status && { status: input.status, ...(input.status === 'Resolved' && { resolvedAt: new Date() }) }), ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo || null }), ...(input.priority && { priority: input.priority }), updatedAt: new Date() };
  let updated: any; if (connected()) updated = await SupportTicket.findByIdAndUpdate(ticket._id, { $set: patch }, { new: true, runValidators: true }).lean(); else { updated = { ...ticket, ...patch }; memory.set(id, updated); }
  await logAdminActivity(adminId, 'ADMIN_UPDATED_SUPPORT_TICKET', 'support_ticket', id, patch, req); return presentTicket(updated);
}

export async function adminReplySupportTicket(adminId: string, id: string, body: string, internal: boolean, req: any) {
  const ticket: any = await ticketById(id); if (!ticket) throw new AppError(404, 'Support ticket not found', 'SUPPORT_TICKET_NOT_FOUND');
  const text = String(body || '').trim(); if (text.length < 2) throw new AppError(422, 'Write a support reply', 'SUPPORT_REPLY_INVALID');
  const record: any = { id: crypto.randomUUID(), ticketId: ticket._id || id, authorId: adminId, body: text.slice(0, 4000), internal, createdAt: new Date() };
  if (connected()) await SupportTicketMessage.create(record); else messages.set(record.id, record);
  const patch = { lastReplyAt: record.createdAt, updatedAt: record.createdAt, ...(!internal && ticket.status === 'Open' && { status: 'In Progress' }) };
  if (connected()) await SupportTicket.updateOne({ _id: ticket._id }, { $set: patch }); else { Object.assign(ticket, patch); memory.set(id, ticket); }
  await logAdminActivity(adminId, internal ? 'ADMIN_ADDED_SUPPORT_NOTE' : 'ADMIN_REPLIED_SUPPORT_TICKET', 'support_ticket', id, {}, req);
  return { id: record.id, body: record.body, internal, createdAt: record.createdAt };
}

export async function adminCreateSupportTicket(adminId: string, input: any, req: any) {
  const user: any = await getIdentityRepository().findUserById(input.userId); if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  const ticket = await createSupportTicket(input.userId, input); await logAdminActivity(adminId, 'ADMIN_CREATED_SUPPORT_TICKET', 'support_ticket', ticket.id, { userId: input.userId }, req); return ticket;
}

export function __resetSupportMemory() { memory.clear(); messages.clear(); }

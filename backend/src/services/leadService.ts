import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SellerLead } from '../models/SellerLead.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { createSystemNotification } from './messagingService.js';

/** Lead pipeline (Phase 17 §15–20). Ownership is always the authenticated seller scope. */

export const LEAD_STAGES = ['new', 'contacted', 'interested', 'negotiating', 'won', 'lost'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
export const LEAD_SOURCES = ['message', 'inquiry', 'call_request', 'contact', 'manual'] as const;

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

type LeadInput = {
  buyerId?: string | null;
  buyerName?: string;
  listingPublicId?: string;
  listingTitle?: string;
  source?: (typeof LEAD_SOURCES)[number];
  status?: LeadStage;
  value?: number;
  note?: string;
};

function present(row: any) {
  const notes = (row.notes || []).slice().sort((a: any, b: any) => +b.createdAt - +a.createdAt);
  return {
    id: String(row._id || row.id),
    sellerId: String(row.sellerId),
    buyerId: row.buyerId ? String(row.buyerId) : null,
    buyerName: row.buyerName || '',
    listingPublicId: row.listingPublicId || '',
    listingTitle: row.listingTitle || '',
    source: row.source,
    status: row.status,
    value: row.value !== undefined && row.value !== null ? Number(row.value) : null,
    notes: notes.map((note: any) => ({ id: String(note._id || note.id), body: note.body, createdAt: note.createdAt })),
    lastContactedAt: row.lastContactedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function buyerSnapshot(buyerId?: string | null, fallbackName?: string) {
  if (!buyerId) return { buyerId: null, buyerName: (fallbackName || '').slice(0, 120) };
  const user: any = await getIdentityRepository().findUserById(String(buyerId));
  return { buyerId: String(buyerId), buyerName: (user?.name || fallbackName || 'QAVLIO buyer').slice(0, 120) };
}

export async function createLead(sellerId: string, actorId: string, input: LeadInput) {
  let listingObjectId: string | null = null;
  if (input.listingPublicId) {
    const { findListingByPublicKey } = await import('./listingService.js');
    const listing: any = await findListingByPublicKey(input.listingPublicId);
    if (!listing || String(listing.sellerId) !== String(sellerId)) throw new AppError(404, 'Listing not found in your business', 'LISTING_NOT_FOUND');
    listingObjectId = listing._id ? String(listing._id) : null;
    if (!input.listingTitle) input.listingTitle = String(listing.title || '').slice(0, 140);
  }
  const snapshot = await buyerSnapshot(input.buyerId, input.buyerName);
  const base: any = {
    sellerId,
    ...snapshot,
    listingPublicId: (input.listingPublicId || '').toUpperCase(),
    listingTitle: input.listingTitle || '',
    listingId: listingObjectId,
    source: LEAD_SOURCES.includes(input.source as any) ? input.source : 'manual',
    status: LEAD_STAGES.includes(input.status as any) ? input.status : 'new',
    value: input.value !== undefined && input.value !== null && Number.isFinite(input.value) ? input.value : null,
    notes: input.note ? [{ body: String(input.note).slice(0, 500), authorId: actorId, createdAt: new Date() }] : [],
    lastContactedAt: null,
  };
  let row: any;
  if (connected()) row = (await SellerLead.create(base)).toObject();
  else {
    const now = new Date();
    row = { _id: crypto.randomUUID(), ...base, createdAt: now, updatedAt: now };
    memory.set(row._id, row);
  }
  await createSystemNotification(sellerId, { type: 'seller_update', title: 'New lead captured', body: `${snapshot.buyerName || 'A buyer'} was added to your pipeline.`, relatedId: String(row._id), relatedType: 'seller' }).catch(() => undefined);
  return present(row);
}

export async function listLeads(sellerId: string, input: { q?: string; status?: string; source?: string; from?: string; to?: string; page: number; limit: number }) {
  const filter = (row: any) => {
    if (String(row.sellerId) !== String(sellerId)) return false;
    if (input.status && row.status !== input.status) return false;
    if (input.source && row.source !== input.source) return false;
    if (input.from && +new Date(row.createdAt) < +new Date(input.from)) return false;
    if (input.to && +new Date(row.createdAt) > +new Date(input.to) + 86_400_000) return false;
    if (input.q) {
      const needle = input.q.toLowerCase();
      const hay = `${row.buyerName || ''} ${row.listingTitle || ''} ${row.listingPublicId || ''} ${(row.notes || []).map((note: any) => note.body).join(' ')}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  };
  let rows: any[];
  if (connected()) {
    const query: any = { sellerId };
    if (input.status) query.status = input.status;
    if (input.source) query.source = input.source;
    if (input.from || input.to) query.createdAt = { ...(input.from && { $gte: new Date(input.from) }), ...(input.to && { $lte: new Date(+new Date(input.to) + 86_400_000) }) };
    const all = await SellerLead.find(query).sort({ updatedAt: -1 }).lean();
    rows = input.q ? all.filter((row: any) => `${row.buyerName} ${row.listingTitle} ${row.listingPublicId}`.toLowerCase().includes(input.q!.toLowerCase())) : all;
  } else {
    rows = [...memory.values()].filter(filter).sort((a, b) => +b.updatedAt - +a.updatedAt);
  }
  const total = rows.length;
  const start = (input.page - 1) * input.limit;
  const counts = LEAD_STAGES.reduce((accumulator: Record<string, number>, stage) => ({ ...accumulator, [stage]: rows.filter((row: any) => row.status === stage).length }), {});
  return { leads: rows.slice(start, start + input.limit).map(present), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.max(1, Math.ceil(total / input.limit)) }, counts };
}

export async function getLead(sellerId: string, id: string) {
  const row = await findRow(sellerId, id);
  return present(row);
}

export async function updateLead(sellerId: string, actorId: string, id: string, patch: { status?: LeadStage; note?: string; buyerName?: string; value?: number | null; contacted?: boolean }) {
  const row = await findRow(sellerId, id);
  const updates: any = {};
  if (patch.status) {
    if (!LEAD_STAGES.includes(patch.status)) throw new AppError(422, 'Invalid lead stage', 'LEAD_STAGE_INVALID');
    updates.status = patch.status;
    updates.lastContactedAt = ['contacted', 'interested', 'negotiating', 'won', 'lost'].includes(patch.status) ? new Date() : row.lastContactedAt;
  }
  if (patch.contacted) updates.lastContactedAt = new Date();
  if (patch.buyerName !== undefined) updates.buyerName = patch.buyerName.trim().slice(0, 120);
  if (patch.value !== undefined) updates.value = patch.value === null ? null : (Number.isFinite(patch.value) ? patch.value : null);
  if (patch.note) {
    const notes = [...(row.notes || []), { body: String(patch.note).slice(0, 500), authorId: actorId, createdAt: new Date() }];
    if (notes.length > 40) throw new AppError(422, 'Too many notes on this lead', 'LEAD_NOTES_FULL');
    updates.notes = notes;
  }
  let saved: any;
  if (connected()) saved = await SellerLead.findByIdAndUpdate(row._id, { $set: updates }, { new: true }).lean();
  else {
    Object.assign(row, updates, { updatedAt: new Date() });
    memory.set(row._id, row);
    saved = row;
  }
  if (updates.status && updates.status !== row.status) {
    await createSystemNotification(sellerId, { type: 'seller_update', title: 'Lead moved in your pipeline', body: `${saved.buyerName || 'A buyer'} → ${updates.status.replace(/^\w/, (c) => c.toUpperCase())}.`, relatedId: String(saved._id), relatedType: 'seller' }).catch(() => undefined);
  }
  return present(saved);
}

export async function deleteLead(sellerId: string, id: string) {
  const row = await findRow(sellerId, id);
  if (connected()) await SellerLead.deleteOne({ _id: row._id });
  else memory.delete(String(row._id));
  return { deleted: true };
}

/** Derives a lead from an existing conversation — the buyer must have actually contacted this seller. */
export async function createLeadFromConversation(sellerId: string, actorId: string, conversationId: string, note?: string) {
  const { findConversationById } = await import('./messagingService.js');
  const conversation: any = await findConversationById(conversationId);
  if (!conversation) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  if (String(conversation.sellerId) !== String(sellerId)) throw new AppError(404, 'Conversation not found in your business', 'CONVERSATION_NOT_FOUND');
  let listingPublicId = '';
  let listingTitle = '';
  if (conversation.listingId) {
    const { findListingByPublicKey } = await import('./listingService.js');
    const listing: any = await findListingByPublicKey(String(conversation.listingId));
    listingPublicId = listing?.publicId || String(conversation.listingId).toUpperCase();
    listingTitle = String(listing?.title || '').slice(0, 140);
  }
  const snapshot = await buyerSnapshot(String(conversation.buyerId));
  return createLead(sellerId, actorId, { buyerId: snapshot.buyerId, buyerName: snapshot.buyerName, listingPublicId, listingTitle, source: 'message', note });
}

async function findRow(sellerId: string, id: string) {
  let row: any;
  if (connected() && mongoose.isValidObjectId(id)) row = await SellerLead.findById(id).lean();
  else if (!connected()) row = memory.get(id);
  if (!row || String(row.sellerId) !== String(sellerId)) throw new AppError(404, 'Lead not found', 'LEAD_NOT_FOUND');
  return row;
}

export function __resetLeadMemory() {
  memory.clear();
}

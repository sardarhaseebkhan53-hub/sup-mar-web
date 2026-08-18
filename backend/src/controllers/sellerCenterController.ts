import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { requireScopePermission, type SellerScope } from '../services/sellerScopeService.js';
import {
  listingPerformance, onboardingState, sellerAnalytics, sellerCustomerDetail, sellerCustomers, sellerDashboard,
  sellerOrderDetail, sellerOrders, sellerPerformanceInsights, sellerRevenue, sellerSearch, sellerExport, internalPerformanceMetrics,
} from '../services/sellerCenterService.js';
import { acceptInvitation, inviteMember, listTeam, updateMember } from '../services/sellerTeamService.js';
import { createLead, createLeadFromConversation, deleteLead, getLead, listLeads, updateLead } from '../services/leadService.js';
import { duplicateListing, listInventory, updateInventory } from '../services/sellerInventoryService.js';
import { createTemplate, deleteTemplate, listTemplates, recordTemplateUse, updateTemplate } from '../services/messageTemplateService.js';
import { bulkTransitionListings } from '../services/listingService.js';
import { respondToReview } from '../services/reviewService.js';

/** Seller Business Center controller (Phase 17). Scope always comes from req.sellerScope. */

const scopeOf = (req: any): SellerScope => {
  if (!req.sellerScope) throw new AppError(500, 'Seller scope missing', 'SCOPE_MISSING');
  return req.sellerScope;
};

export const sellerCenterPermission = requireScopePermission;

/* ------------------------------- dashboard (§6–7, §59) ------------------------- */

export async function dashboard(req, res) {
  res.json({ success: true, data: await sellerDashboard(scopeOf(req), String(req.query.window || '30days')) });
}

export async function performance(req, res) {
  res.json({ success: true, data: await listingPerformance(scopeOf(req), String(req.query.window || '30days')) });
}

export async function onboarding(req, res) {
  res.json({ success: true, data: await onboardingState(scopeOf(req).ownerId) });
}

/* ------------------------------- listings (§8–9, §14) --------------------------- */

const bulkSchema = z.object({
  listingIds: z.array(z.string().trim().min(2).max(40)).min(1).max(50),
  action: z.enum(['pause', 'activate', 'archive']),
  confirm: z.boolean().optional().default(false),
}).strict();

export async function bulkListings(req, res) {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Select listings and a bulk action.', 'VALIDATION_ERROR', parsed.error.flatten());
  const scope = scopeOf(req);
  // Team members act on the owner's listings; ownership is still verified per listing.
  const data = await bulkTransitionListings(scope.ownerId, parsed.data.listingIds, parsed.data.action, parsed.data.confirm);
  res.json({ success: true, data, message: `${data.updated} listing(s) ${parsed.data.action}d.` });
}

export async function duplicate(req, res) {
  const scope = scopeOf(req);
  const data = await duplicateListing(scope.ownerId, scope.actorId, String(req.params.id || '').slice(0, 40));
  res.status(201).json({ success: true, data, message: 'Draft copy created' });
}

/* ------------------------------- inventory (§10–13) ---------------------------- */

export async function inventory(req, res) {
  const scope = scopeOf(req);
  res.json({ success: true, data: await listInventory(scope.ownerId, {
    q: typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : undefined,
    stockStatus: typeof req.query.stockStatus === 'string' ? req.query.stockStatus : undefined,
    listingStatus: typeof req.query.status === 'string' ? req.query.status : undefined,
    page: Math.min(1000, Math.max(1, Number(req.query.page) || 1)),
    limit: Math.min(50, Math.max(1, Number(req.query.limit) || 20)),
  }) });
}

const inventoryPatchSchema = z.object({
  sku: z.string().trim().max(40).optional(),
  stock: z.object({
    tracked: z.boolean().optional(),
    quantity: z.number().int().min(0).max(1_000_000).optional(),
    lowStockThreshold: z.number().int().min(0).max(100_000).optional(),
    stayVisibleWhenOutOfStock: z.boolean().optional(),
  }).strict().optional(),
}).strict();

export async function updateInventoryRow(req, res) {
  const parsed = inventoryPatchSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Invalid inventory update.', 'VALIDATION_ERROR', parsed.error.flatten());
  res.json({ success: true, data: await updateInventory(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40), parsed.data) });
}

/* ---------------------------------- leads (§15–20) ------------------------------ */

export async function leads(req, res) {
  res.json({ success: true, data: await listLeads(scopeOf(req).ownerId, {
    q: typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    source: typeof req.query.source === 'string' ? req.query.source : undefined,
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
    page: Math.min(1000, Math.max(1, Number(req.query.page) || 1)),
    limit: Math.min(50, Math.max(1, Number(req.query.limit) || 20)),
  }) });
}

const leadCreateSchema = z.object({
  buyerId: z.string().trim().max(40).optional(),
  buyerName: z.string().trim().max(120).optional(),
  listingPublicId: z.string().trim().max(40).optional(),
  source: z.enum(['message', 'inquiry', 'call_request', 'contact', 'manual']).optional(),
  value: z.number().min(0).max(1_000_000_000_000).optional(),
  note: z.string().trim().max(500).optional(),
  conversationId: z.string().trim().max(40).optional(),
}).strict();

export async function createLeadRow(req, res) {
  const parsed = leadCreateSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide buyer or conversation details for the lead.', 'VALIDATION_ERROR', parsed.error.flatten());
  const scope = scopeOf(req);
  const input = parsed.data;
  const data = input.conversationId
    ? await createLeadFromConversation(scope.ownerId, scope.actorId, input.conversationId, input.note)
    : await createLead(scope.ownerId, scope.actorId, input);
  res.status(201).json({ success: true, data, message: 'Lead added to your pipeline' });
}

export const leadPatchSchema = z.object({
  status: z.enum(['new', 'contacted', 'interested', 'negotiating', 'won', 'lost']).optional(),
  note: z.string().trim().max(500).optional(),
  buyerName: z.string().trim().max(120).optional(),
  value: z.number().min(0).max(1_000_000_000_000).nullable().optional(),
  contacted: z.boolean().optional(),
}).strict();

export async function leadDetail(req, res) {
  res.json({ success: true, data: await getLead(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40)) });
}

export async function updateLeadRow(req, res) {
  const parsed = leadPatchSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Invalid lead update.', 'VALIDATION_ERROR', parsed.error.flatten());
  const scope = scopeOf(req);
  res.json({ success: true, data: await updateLead(scope.ownerId, scope.actorId, String(req.params.id || '').slice(0, 40), parsed.data) });
}

export async function removeLeadRow(req, res) {
  res.json({ success: true, data: await deleteLead(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40)) });
}

/* -------------------------------- customers (§21–23) ---------------------------- */

export async function customers(req, res) {
  res.json({ success: true, data: await sellerCustomers(scopeOf(req), {
    q: typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : undefined,
    page: Math.min(1000, Math.max(1, Number(req.query.page) || 1)),
    limit: Math.min(50, Math.max(1, Number(req.query.limit) || 20)),
  }) });
}

export async function customerDetail(req, res) {
  res.json({ success: true, data: await sellerCustomerDetail(scopeOf(req), String(req.params.id || '').slice(0, 40)) });
}

/* --------------------------- orders / revenue (§27–28, §33–34) ------------------ */

export async function orders(req, res) {
  res.json({ success: true, data: await sellerOrders(scopeOf(req), {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    type: typeof req.query.type === 'string' ? req.query.type : undefined,
    page: Math.min(1000, Math.max(1, Number(req.query.page) || 1)),
    limit: Math.min(50, Math.max(1, Number(req.query.limit) || 20)),
  }) });
}

export async function orderDetail(req, res) {
  res.json({ success: true, data: await sellerOrderDetail(scopeOf(req), String(req.params.id || '').slice(0, 40)) });
}

export async function revenue(req, res) {
  res.json({ success: true, data: await sellerRevenue(scopeOf(req), String(req.query.window || '30days')) });
}

/* ------------------------------- analytics + AI (§35–39, §46–48) ---------------- */

export async function analytics(req, res) {
  res.json({ success: true, data: await sellerAnalytics(scopeOf(req), String(req.query.window || '30days')) });
}

export async function aiInsights(req, res) {
  res.json({ success: true, data: await sellerPerformanceInsights(scopeOf(req)) });
}

export async function performanceMetrics(req, res) {
  res.json({ success: true, data: await internalPerformanceMetrics(scopeOf(req)) });
}

/* ------------------------------ templates (§25–26) ------------------------------- */

export async function templates(req, res) {
  res.json({ success: true, data: await listTemplates(scopeOf(req).ownerId) });
}

const templateSchema = z.object({ name: z.string().trim().min(2).max(80), body: z.string().trim().min(2).max(500) }).strict();
const templatePatchSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), body: z.string().trim().min(2).max(500).optional() }).strict();

export async function createTemplateRow(req, res) {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Templates need a name and a helpful reply.', 'VALIDATION_ERROR', parsed.error.flatten());
  res.status(201).json({ success: true, data: await createTemplate(scopeOf(req).ownerId, parsed.data), message: 'Quick reply saved' });
}

export async function updateTemplateRow(req, res) {
  const parsed = templatePatchSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Invalid template update.', 'VALIDATION_ERROR', parsed.error.flatten());
  res.json({ success: true, data: await updateTemplate(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40), parsed.data) });
}

export async function deleteTemplateRow(req, res) {
  res.json({ success: true, data: await deleteTemplate(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40)) });
}

export async function useTemplateRow(req, res) {
  res.json({ success: true, data: await recordTemplateUse(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40)) });
}

/* --------------------------------- reviews (§44–45) ------------------------------ */

const replySchema = z.object({ text: z.string().trim().min(2).max(1000) }).strict();

export async function replyToReview(req, res) {
  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Write a professional reply.', 'VALIDATION_ERROR', parsed.error.flatten());
  res.json({ success: true, data: await respondToReview(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40), parsed.data.text) });
}

/* ---------------------------------- team (§51–54) -------------------------------- */

export async function team(req, res) {
  res.json({ success: true, data: await listTeam(scopeOf(req).ownerId, scopeOf(req).role) });
}

const inviteSchema = z.object({
  email: z.string().trim().email().max(160),
  role: z.enum(['manager', 'staff']),
  expiresInDays: z.number().int().min(1).max(30).optional(),
  userId: z.string().trim().max(40).optional(),
}).strict();

export async function invite(req, res) {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Invite needs an email and a manager/staff role.', 'VALIDATION_ERROR', parsed.error.flatten());
  const scope = scopeOf(req);
  res.status(201).json({ success: true, data: await inviteMember(scope.ownerId, scope.actorId, parsed.data), message: 'Invitation created' });
}

const memberPatchSchema = z.object({ role: z.enum(['manager', 'staff']).optional(), status: z.enum(['invited', 'active', 'revoked']).optional() }).strict();

export async function updateTeamMemberRow(req, res) {
  const parsed = memberPatchSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Invalid member update.', 'VALIDATION_ERROR', parsed.error.flatten());
  res.json({ success: true, data: await updateMember(scopeOf(req).ownerId, String(req.params.id || '').slice(0, 40), parsed.data) });
}

const joinSchema = z.object({ token: z.string().trim().min(20).max(128) }).strict();

export async function join(req, res) {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide your invitation token.', 'VALIDATION_ERROR', parsed.error.flatten());
  res.json({ success: true, data: await acceptInvitation(req.auth.userId, parsed.data.token), message: 'Welcome to the team — you now have Seller Center access' });
}

/* ---------------------------- search + export (§56–57) -------------------------- */

export async function search(req, res) {
  const q = String(req.query.q || '').trim();
  if (!q || q.length > 80) throw new AppError(422, 'Enter a search term.', 'VALIDATION_ERROR');
  res.json({ success: true, data: await sellerSearch(scopeOf(req), q, Math.min(10, Math.max(1, Number(req.query.page) || 1)), 5) });
}

export async function exportDataset(req, res) {
  const data = await sellerExport(scopeOf(req), String(req.params.dataset || '').slice(0, 20));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
  res.send(data.csv);
}

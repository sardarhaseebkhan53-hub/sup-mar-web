import { changeAccountStatus, changeRoles, getUserForAdmin, listUsers, resetVerification } from '../services/adminUserService.js';
import { logAdminActivity } from '../services/adminActivityService.js';
import { adminListingCountsBySeller } from '../services/listingService.js';

export async function users(req, res) {
  let data: any[] = await listUsers({ ...req.query, limit: 10000 });
  if (req.query.sort === 'oldest') data.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const page = Number(req.query.page) || 1, limit = Number(req.query.limit) || 25, start = (page - 1) * limit, slice = data.slice(start, start + limit);
  const counts: any = await adminListingCountsBySeller(slice.map((item) => item.id));
  const rows = slice.map((item) => ({ ...item, listings: counts[item.id]?.listings || 0, activeListings: counts[item.id]?.activeListings || 0, lastActiveAt: item.lastLoginAt || null }));
  res.json({ success: true, data: rows, meta: { pagination: { page, limit, total: data.length, totalPages: Math.ceil(data.length / limit) } } });
}
export async function userDetails(req, res) { const includeFinance=req.auth.roles.some((role:string)=>['admin','super_admin','finance'].includes(role));res.json({ success: true, data: await getUserForAdmin(req.params.id,includeFinance,req.auth.roles.some((role:string)=>['admin','super_admin','moderator'].includes(role))) }); }
export async function accountStatus(req, res) { const data = await changeAccountStatus(req.auth.userId, req.params.id, req.body, req); await logAdminActivity(req.auth.userId, 'ADMIN_UPDATED_USER_STATUS', 'user', req.params.id, { status: req.body.status, reason: req.body.reason }, req); res.json({ success: true, data, message: 'Account status updated' }); }
export async function roles(req, res) { const data = await changeRoles(req.auth.userId, req.params.id, req.body, req); await logAdminActivity(req.auth.userId, 'ADMIN_UPDATED_USER_ROLES', 'user', req.params.id, { roles: req.body.roles }, req); res.json({ success: true, data, message: 'Account roles updated' }); }
export async function verification(req, res) { const data = await resetVerification(req.auth.userId, req.params.id, req.body, req); await logAdminActivity(req.auth.userId, 'ADMIN_UPDATED_USER_VERIFICATION', 'user', req.params.id, { type: req.body.type, status: req.body.status }, req); res.json({ success: true, data, message: 'Verification updated' }); }

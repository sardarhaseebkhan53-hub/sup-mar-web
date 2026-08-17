import { changeAccountStatus, changeRoles, getUserForAdmin, listUsers, resetVerification } from '../services/adminUserService.js';

export async function users(req, res) { res.json({ success: true, data: await listUsers(req.query) }); }
export async function userDetails(req, res) { res.json({ success: true, data: await getUserForAdmin(req.params.id) }); }
export async function accountStatus(req, res) { res.json({ success: true, data: await changeAccountStatus(req.auth.userId, req.params.id, req.body, req), message: 'Account status updated' }); }
export async function roles(req, res) { res.json({ success: true, data: await changeRoles(req.auth.userId, req.params.id, req.body, req), message: 'Roles updated' }); }
export async function verification(req, res) { res.json({ success: true, data: await resetVerification(req.auth.userId, req.params.id, req.body, req), message: 'Verification status updated' }); }

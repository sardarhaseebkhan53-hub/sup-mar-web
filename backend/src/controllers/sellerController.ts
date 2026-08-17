import { createSellerProfile, getOwnSellerProfile, updateSellerProfile } from '../services/sellerProfileService.js';

export async function sellerProfile(req, res) { res.json({ success: true, data: await getOwnSellerProfile(req.auth.userId) }); }
export async function createProfile(req, res) { res.status(201).json({ success: true, data: await createSellerProfile(req.auth.userId, req.body, req), message: 'Seller profile created' }); }
export async function patchProfile(req, res) { res.json({ success: true, data: await updateSellerProfile(req.auth.userId, req.body, req), message: 'Seller profile updated' }); }

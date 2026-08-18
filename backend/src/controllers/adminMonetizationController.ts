import { logAdminActivity } from '../services/adminActivityService.js';
import { getMarketplaceSettings, updateMonetizationSettings } from '../services/marketplaceSettingsService.js';
import { createSellerPackage, listSellerPackages, updateSellerPackage } from '../services/packageService.js';
import { adminListRefunds, adminRevenue, adminUpdateRefund } from '../services/paymentService.js';

export async function settings(_req, res) { res.json({ success: true, data: await getMarketplaceSettings(true) }); }
export async function settingsUpdate(req, res) { const data = await updateMonetizationSettings(req.body); await logAdminActivity(req.auth.userId, 'ADMIN_MONETIZATION_PRICING_CHANGED', 'setting', 'monetization', req.body, req); res.json({ success: true, data }); }
export async function packages(_req, res) { res.json({ success: true, data: await listSellerPackages(true) }); }
export async function packageCreate(req, res) { const data = await createSellerPackage(req.body); await logAdminActivity(req.auth.userId, 'ADMIN_PACKAGE_CREATED', 'package', data.id, req.body, req); res.status(201).json({ success: true, data }); }
export async function packageUpdate(req, res) { const data = await updateSellerPackage(req.params.id, req.body); await logAdminActivity(req.auth.userId, 'ADMIN_PACKAGE_UPDATED', 'package', data.id, req.body, req); res.json({ success: true, data }); }
export async function revenue(req, res) { res.json({ success: true, data: await adminRevenue(req.query) }); }
export async function refunds(req, res) { res.json({ success: true, data: await adminListRefunds(req.query) }); }
export async function refundUpdate(req, res) { res.json({ success: true, data: await adminUpdateRefund(req.auth.userId, req.params.id, req.body.status, req.body.note) }); }

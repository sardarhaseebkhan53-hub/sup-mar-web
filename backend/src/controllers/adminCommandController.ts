import { adminAnalyticsCenter, adminCommandNotifications, adminSellerFinancials, adminTrustSafety, exportAdminDataset } from '../services/adminCommandService.js';
import { adminListOrders, adminOrderDetail } from '../services/paymentService.js';
import { adminCreateSupportTicket, adminListSupportTickets, adminReplySupportTicket, adminSupportTicket, adminUpdateSupportTicket } from '../services/supportTicketService.js';
import { adminListAnnouncements, createAdminAnnouncement, updateAdminAnnouncement } from '../services/adminAnnouncementService.js';
import { activityTimeline, listAdminActivity, logAdminActivity } from '../services/adminActivityService.js';
import { getAiSettings, updateAiSettings } from '../services/aiSettingsService.js';
import { aiAnalytics } from '../services/aiAnalyticsService.js';
import { createSellerPackage, listSellerPackages, updateSellerPackage } from '../services/packageService.js';
import { AppError } from '../utils/AppError.js';

export async function orders(req, res) { res.json({ success: true, data: await adminListOrders(req.query) }); }
export async function order(req, res) { res.json({ success: true, data: await adminOrderDetail(req.params.id) }); }
export async function analytics(req, res) { const data:any=await adminAnalyticsCenter(Number(req.query.days) || 30);const roles=req.auth.roles;if(roles.includes('finance')&&!roles.some((role:string)=>['admin','super_admin'].includes(role))){delete data.users;delete data.listings;delete data.search;delete data.trustSafety;delete data.ai;delete data.ads}else if(!roles.some((role:string)=>['admin','super_admin','finance'].includes(role))){delete data.revenue;delete data.orders;delete data.payments}res.json({ success: true, data }); }
export async function trustSafety(_req, res) { res.json({ success: true, data: await adminTrustSafety() }); }
export async function commandNotifications(req, res) { const data:any=await adminCommandNotifications();const roles=req.auth.roles;if(roles.includes('finance')&&!roles.some((role:string)=>['admin','super_admin'].includes(role)))data.items=data.items.filter((item:any)=>['refund','payment'].includes(item.type));else if(roles.includes('support')&&!roles.some((role:string)=>['admin','super_admin'].includes(role)))data.items=data.items.filter((item:any)=>['report','support','verification'].includes(item.type));else if(roles.includes('moderator')&&!roles.some((role:string)=>['admin','super_admin'].includes(role)))data.items=data.items.filter((item:any)=>['report','risk','verification'].includes(item.type));data.unread=data.items.reduce((sum:number,item:any)=>sum+item.count,0);res.json({ success: true, data }); }
export async function promotionAnalytics(_req,res){const {adminPromotionAnalytics}=await import('../services/promotionAnalyticsService.js');res.json({success:true,data:await adminPromotionAnalytics()});}
export async function sellerFinancials(req, res) { res.json({ success: true, data: await adminSellerFinancials(req.params.id) }); }
export async function support(req, res) { res.json({ success: true, data: await adminListSupportTickets(req.query) }); }
export async function supportDetail(req, res) { res.json({ success: true, data: await adminSupportTicket(req.params.id) }); }
export async function supportCreate(req, res) { res.status(201).json({ success: true, data: await adminCreateSupportTicket(req.auth.userId, req.body, req) }); }
export async function supportUpdate(req, res) { res.json({ success: true, data: await adminUpdateSupportTicket(req.auth.userId, req.params.id, req.body, req) }); }
export async function supportReply(req, res) { res.status(201).json({ success: true, data: await adminReplySupportTicket(req.auth.userId, req.params.id, req.body.body, req.body.internal, req) }); }
export async function announcements(req, res) { res.json({ success: true, data: await adminListAnnouncements(req.query) }); }
export async function announcementCreate(req, res) { res.status(201).json({ success: true, data: await createAdminAnnouncement(req.auth.userId, req.body, req) }); }
export async function announcementUpdate(req, res) { res.json({ success: true, data: await updateAdminAnnouncement(req.auth.userId, req.params.id, req.body, req) }); }
function auditTargets(roles:string[]){if(roles.some(role=>['admin','super_admin'].includes(role)))return undefined;if(roles.includes('finance'))return['payment','refund','package','order','export'];if(roles.includes('moderator'))return['listing','report','seller','user','review','risk','category'];return['user','seller','report','support_ticket','announcement']}
export async function auditLogs(req, res) { res.json({ success: true, data: await listAdminActivity({ ...req.query, allowedTargetTypes:auditTargets(req.auth.roles) }) }); }
export async function timeline(req, res) { const allowed=auditTargets(req.auth.roles);if(allowed&&!allowed.includes(req.params.type))throw new AppError(403,'You do not have permission to view this activity timeline','ADMIN_PERMISSION_DENIED');res.json({ success: true, data: await activityTimeline(req.params.type, req.params.id, Number(req.query.limit) || 30) }); }
export async function aiOverview(req, res) { const days = Number(req.query.days) || 30; const [settings,analytics,today,month]=await Promise.all([getAiSettings(),aiAnalytics(days),aiAnalytics(1),aiAnalytics(30)]); res.json({ success: true, data: { settings, analytics, today, month } }); }
export async function aiUpdate(req, res) { const data = await updateAiSettings(req.auth.userId, req.body); await logAdminActivity(req.auth.userId, 'ADMIN_UPDATED_AI_SETTINGS', 'setting', 'ai', { fields: Object.keys(req.body) }, req); res.json({ success: true, data }); }
export async function packages(_req, res) { res.json({ success: true, data: await listSellerPackages(true) }); }
export async function packageCreate(req, res) { const data = await createSellerPackage(req.body); await logAdminActivity(req.auth.userId, 'ADMIN_PACKAGE_CREATED', 'package', data.id, req.body, req); res.status(201).json({ success: true, data }); }
export async function packageUpdate(req, res) { const data = await updateSellerPackage(req.params.id, req.body); await logAdminActivity(req.auth.userId, 'ADMIN_PACKAGE_UPDATED', 'package', data.id, req.body, req); res.json({ success: true, data }); }
export async function csvExport(req, res) { const csv = await exportAdminDataset(req.params.dataset); await logAdminActivity(req.auth.userId, 'ADMIN_EXPORTED_DATASET', 'export', req.params.dataset, {}, req); res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="qavlio-${req.params.dataset}-${new Date().toISOString().slice(0,10)}.csv"`); res.send(csv); }

import { getIdentityRepository } from '../repositories/identityRepository.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { adminListReviews } from './reviewService.js';
import { adminReports } from './adminReportService.js';
import { adminListingMetrics, adminListListings } from './listingService.js';
import { adminListOrders, adminListPayments, adminListPromotions, adminOrderDetail, adminRevenue, adminListRefunds } from './paymentService.js';
import { analyticsSeries } from './advertisementService.js';
import { aiAnalytics } from './aiAnalyticsService.js';
import { adminSearchAnalytics } from './searchAnalyticsService.js';
import { listRiskAssessments } from './riskAssessmentService.js';
import { adminListSupportTickets } from './supportTicketService.js';
import { activityTimeline } from './adminActivityService.js';
import { AppError } from '../utils/AppError.js';

const dateKey = (value: any) => new Date(value).toISOString().slice(0, 10);
const inDays = (value: any, days: number) => +new Date(value) >= Date.now() - days * 86400000;
const countBy = (values: string[], limit = 12) => [...values.reduce((map, value) => { const key = value || 'unknown'; map.set(key, (map.get(key) || 0) + 1); return map; }, new Map<string, number>())].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit);

export async function adminAnalyticsCenter(days = 30) {
  const [users, sellers, listing, orders, payments, promotions, ads, ai, searches, reports, reviews, risks, revenue] = await Promise.all([
    getIdentityRepository().listUsers({ limit: 10000 }), getSellerProfileRepository().list({ limit: 10000 }), adminListingMetrics(),
    adminListOrders({ page: 1, limit: 100 }), adminListPayments({ page: 1, limit: 100 }), adminListPromotions({ page: 1, limit: 100 }),
    analyticsSeries(), aiAnalytics(days), adminSearchAnalytics(days), adminReports({ page: 1, limit: 100 }), adminListReviews({ page: 1, limit: 100 }), listRiskAssessments({ page: 1, limit: 100 }), adminRevenue({ range: days <= 1 ? 'today' : days <= 7 ? '7d' : days <= 30 ? '30d' : '90d' }),
  ]);
  const recentUsers = users.filter((item: any) => inDays(item.createdAt, days)); const activeUsers = users.filter((item: any) => item.lastLoginAt && inDays(item.lastLoginAt, days));
  const recentListings = listing.rows.filter((item: any) => inDays(item.createdAt, days));
  const userSeries = new Map<string, any>(); for (const user of recentUsers) { const key = dateKey(user.createdAt), row = userSeries.get(key) || { date: key, users: 0, sellers: 0 }; row.users += 1; if (user.roles?.includes('seller')) row.sellers += 1; userSeries.set(key, row); }
  const categoryRows = new Map<string, any>(); for (const item of listing.rows) { const key = item.categorySlug || 'uncategorized', row = categoryRows.get(key) || { category: key, listings: 0, views: 0, favorites: 0, messages: 0, sold: 0 }; row.listings += 1; row.views += item.viewCount || 0; row.favorites += item.favoriteCount || 0; row.messages += item.messagesCount || 0; if (item.status === 'sold') row.sold += 1; categoryRows.set(key, row); }
  const sellerTypes=new Map<string,string>(sellers.map((seller:any)=>[String(seller.userId),seller.accountType||'individual']));
  const bySellerType=countBy(listing.rows.map((item:any)=>sellerTypes.get(String(item.sellerId))||'unknown'));
  const locations = new Map<string, any>(); for (const item of listing.rows) { const key = item.location?.city || item.location?.province || 'Unknown', row = locations.get(key) || { location: key, listings: 0, views: 0 }; row.listings += 1; row.views += item.viewCount || 0; locations.set(key, row); }
  return {
    periodDays: days,
    users: { total: users.length, newRegistrations: recentUsers.length, activeUsers: activeUsers.length, returningUsers: null, newSellers: recentUsers.filter((item: any) => item.roles?.includes('seller')).length, sellerConversion: users.length ? Number(((sellers.length / users.length) * 100).toFixed(1)) : 0, retention: null, series: [...userSeries.values()].sort((a, b) => a.date.localeCompare(b.date)) },
    listings: { created: recentListings.length, active: listing.active, sold: listing.sold, expired: listing.rows.filter((item: any) => item.status === 'expired').length, rejected: listing.rows.filter((item: any) => item.status === 'rejected').length, removed: listing.rows.filter((item: any) => item.status === 'removed').length, byCategory: [...categoryRows.values()].sort((a, b) => b.listings - a.listings).slice(0, 15), byLocation: [...locations.values()].sort((a, b) => b.listings - a.listings).slice(0, 15), bySellerType },
    search: searches,
    revenue: { ...revenue.summary, netConfiguredRevenue: revenue.summary.totalRevenue - revenue.summary.refunds, series: revenue.series },
    promotions: { total: promotions.pagination.total, active: promotions.promotions.filter((item: any) => item.status === 'active').length, trackedRevenue: revenue.summary.promotionRevenue },
    ads,
    ai,
    trustSafety: { pendingReports: reports.summary.pending, criticalReports: reports.summary.critical, pendingReviews: reviews.pagination.total, highRiskListings: risks.summary.high },
    orders: { total: orders.pagination.total, paid: orders.orders.filter((item: any) => item.status === 'Paid').length },
    payments: { total: payments.pagination.total },
  };
}

export async function adminTrustSafety() {
  const [risks, reports, sellers, reviews] = await Promise.all([listRiskAssessments({ page: 1, limit: 50, riskLevel: 'High' }), adminReports({ page: 1, limit: 100 }), getSellerProfileRepository().list({ limit: 1000 }), adminListReviews({ page: 1, limit: 50, status: 'Pending' })]);
  const repeated = countBy(reports.reports.map((item: any) => `${item.type}:${item.targetId}`), 10).filter((item) => item.count > 1);
  return { highRiskListings: risks.assessments || [], suspiciousActivity: reports.reports.filter((item: any) => ['critical', 'high'].includes(item.priority)).slice(0, 20), verificationQueue: sellers.filter((item: any) => item.verificationStatus === 'pending').slice(0, 30).map((item: any) => ({ id: String(item._id || item.id), userId: String(item.userId), displayName: item.displayName, verificationStatus: item.verificationStatus })), repeatedReports: repeated, restrictedSellers: sellers.filter((item: any) => item.isActive === false || ['restricted', 'suspended'].includes(item.safetyStatus)).slice(0, 30), pendingReviews: reviews.reviews || [] };
}

export async function adminCommandNotifications() {
  const [reports, risks, refunds, support, failedPayments, sellers] = await Promise.all([adminReports({ page: 1, limit: 10 }), listRiskAssessments({ page: 1, limit: 10, riskLevel: 'High' }), adminListRefunds({ status: 'Requested' }), adminListSupportTickets({ page: 1, limit: 10 }), adminListPayments({ page:1,limit:10,status:'failed' }), getSellerProfileRepository().list({ limit:1000 })]);
  const items: any[] = [];
  if (reports.summary.pending) items.push({ type: 'report', title: 'Reports need review', count: reports.summary.pending, to: '/admin/reports', severity: reports.summary.critical ? 'critical' : 'warning' });
  if (risks.summary.high) items.push({ type: 'risk', title: 'High-risk listings', count: risks.summary.high, to: '/admin/trust-safety', severity: 'critical' });
  if (refunds.length) items.push({ type: 'refund', title: 'Refund requests', count: refunds.length, to: '/admin/revenue', severity: 'warning' });
  if (support.summary.open) items.push({ type: 'support', title: 'Open support tickets', count: support.summary.open, to: '/admin/support', severity: 'info' });
  if (failedPayments.pagination.total) items.push({ type:'payment',title:'Failed payments',count:failedPayments.pagination.total,to:'/admin/payments?status=failed',severity:'warning' });
  const verificationCount=sellers.filter((item:any)=>item.verificationStatus==='pending').length;if(verificationCount)items.push({type:'verification',title:'Seller verification requests',count:verificationCount,to:'/admin/sellers?status=pending',severity:'info'});
  return { items, unread: items.reduce((sum, item) => sum + item.count, 0) };
}

export async function adminSellerFinancials(userId: string) {
  const payments = await adminListPayments({ userId, page: 1, limit: 100, sort: 'newest' });
  const paid = payments.payments.filter((item: any) => item.status === 'paid');
  return { userId, totalSpend: paid.reduce((sum: number, item: any) => sum + item.amount, 0), listingFees: paid.filter((item: any) => item.type === 'listing_fee').reduce((sum: number, item: any) => sum + item.amount, 0), promotions: paid.filter((item: any) => item.type === 'promotion').reduce((sum: number, item: any) => sum + item.amount, 0), packages: paid.filter((item: any) => item.type === 'package').reduce((sum: number, item: any) => sum + item.amount, 0), transactions: payments.pagination.total };
}

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export async function exportAdminDataset(dataset: string) {
  let headers: string[] = [], rows: any[][] = [];
  if (dataset === 'users') { const data = await getIdentityRepository().listUsers({ limit: 5000 }); headers = ['ID','Name','Email','Roles','Status','Joined','Last active']; rows = data.map((item: any) => [item._id || item.id, item.name, item.email || '', (item.roles || []).join('|'), item.status, item.createdAt, item.lastLoginAt || '']); }
  else if (dataset === 'listings') { const data = await adminListListings({ page: 1, limit: 5000, sort: 'newest' }); headers = ['Public ID','Title','Seller ID','Category','Status','Price','Currency','Created']; rows = data.listings.map((item: any) => [item.publicId,item.title,item.sellerId,item.categorySlug,item.status,item.price,item.currency,item.createdAt]); }
  else if (dataset === 'orders') { const data = await adminListOrders({ page: 1, limit: 5000 }); headers = ['Order','User ID','Type','Total','Currency','Status','Payment ID','Created']; rows = data.orders.map((item: any) => [item.reference,item.userId,item.type,item.total,item.currency,item.status,item.paymentId,item.createdAt]); }
  else if (dataset === 'payments') { const data = await adminListPayments({ page: 1, limit: 5000 }); headers = ['Reference','User ID','Order ID','Type','Amount','Currency','Status','Provider','Created']; rows = data.payments.map((item: any) => [item.reference,item.userId,item.orderId,item.type,item.amount,item.currency,item.status,item.provider,item.createdAt]); }
  else if (dataset === 'reports') { const data = await adminReports({ page: 1, limit: 5000 }); headers = ['ID','Type','Target','Reason','Priority','Status','Created']; rows = data.reports.map((item: any) => [item.id,item.type,item.targetId,item.reason,item.priority,item.status,item.createdAt]); }
  else throw new AppError(404, 'Export dataset is not supported', 'EXPORT_NOT_FOUND');
  return `${headers.map(csvCell).join(',')}\n${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
}

export { adminOrderDetail, activityTimeline };

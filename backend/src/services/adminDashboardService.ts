import { getIdentityRepository } from '../repositories/identityRepository.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { adminListingMetrics, adminListListings } from './listingService.js';
import { adminListOrders, adminListPayments, adminListPromotions, adminRevenue } from './paymentService.js';
import { analyticsSeries } from './advertisementService.js';
import { adminReports } from './adminReportService.js';
import { adminListReviews } from './reviewService.js';
import { listRiskAssessments } from './riskAssessmentService.js';

export async function adminDashboard(days = 30) {
  const [users, sellers, listing, orders, payments, promotions, ads, reports, todayRevenue, weekRevenue, monthRevenue, yearRevenue] = await Promise.all([
    getIdentityRepository().listUsers({ limit: 10000 }), getSellerProfileRepository().list({ limit: 10000 }), adminListingMetrics(),
    adminListOrders({ page: 1, limit: 100 }), adminListPayments({ page: 1, limit: 100, sort: 'newest' }), adminListPromotions({ page: 1, limit: 100 }),
    analyticsSeries(), adminReports({ page: 1, limit: 100 }), adminRevenue({ range: 'today' }), adminRevenue({ range: '7d' }), adminRevenue({ range: '30d' }), adminRevenue({ range: 'custom', from: new Date(new Date().getFullYear(), 0, 1).toISOString(), to: new Date().toISOString() }),
  ]);
  const paid = payments.payments.filter((item: any) => item.status === 'paid'); const start = Date.now() - days * 86400000;
  const series = new Map<string, any>(); const row = (date: any) => { const key = new Date(date).toISOString().slice(0, 10), value = series.get(key) || { date: key, users: 0, sellers: 0, listings: 0, transactions: 0, revenue: 0, reports: 0, adImpressions: 0 }; series.set(key, value); return value; };
  for (const item of users) if (+new Date(item.createdAt) >= start) { row(item.createdAt).users += 1; if (item.roles?.includes('seller')) row(item.createdAt).sellers += 1; }
  for (const item of listing.rows) if (+new Date(item.createdAt) >= start) row(item.createdAt).listings += 1;
  for (const item of paid) if (+new Date(item.createdAt) >= start) { row(item.createdAt).transactions += 1; row(item.createdAt).revenue += Number(item.amount); }
  for (const item of reports.reports) if (+new Date(item.createdAt) >= start) row(item.createdAt).reports += 1;
  for (const item of ads.series) if (+new Date(item.date) >= start) row(item.date).adImpressions += item.impressions;
  const [reviewQueue, risks] = await Promise.all([adminListReviews({ page: 1, limit: 1, status: 'Pending' }), listRiskAssessments({ page: 1, limit: 100 })]);
  const today = new Date().toISOString().slice(0, 10); const statusCount = (status: string) => listing.rows.filter((item: any) => item.status === status).length;
  return {
    metrics: {
      totalUsers: users.length, activeUsers: users.filter((item: any) => item.status === 'active').length,
      totalSellers: sellers.length, activeSellers: sellers.filter((item: any) => item.isActive !== false).length,
      activeListings: listing.active, todaysListings: listing.rows.filter((item: any) => new Date(item.createdAt).toISOString().slice(0, 10) === today).length,
      pendingListings: listing.pending, soldListings: listing.sold, orders: orders.pagination.total, totalTransactions: payments.pagination.total,
      revenue: monthRevenue.summary.totalRevenue, activePromotions: promotions.promotions.filter((item: any) => item.status === 'active').length,
      activeAdvertisements: ads.summary.active, pendingReports: reports.summary.pending, highRiskListings: risks.summary.high + (risks.summary.critical || 0),
      reportedSellers: reports.summary.sellers, pendingReviews: reviewQueue.pagination.total,
      verifiedSellers: sellers.filter((item: any) => item.verificationStatus === 'verified').length,
    },
    revenue: { today: todayRevenue.summary.totalRevenue, week: weekRevenue.summary.totalRevenue, month: monthRevenue.summary.totalRevenue, year: yearRevenue.summary.totalRevenue, series: monthRevenue.series },
    listingOverview: { active: statusCount('published'), pending: listing.rows.filter((item: any) => ['pending','draft'].includes(item.status)).length, sold: statusCount('sold'), expired: statusCount('expired'), rejected: statusCount('rejected'), removed: statusCount('removed') },
    marketplaceActivity: { newListings: listing.rows.filter((item: any) => +new Date(item.createdAt) >= start).length, messages: listing.rows.reduce((sum: number, item: any) => sum + (item.messagesCount || 0), 0), favorites: listing.rows.reduce((sum: number, item: any) => sum + (item.favoriteCount || 0), 0), reports: reports.pagination.total, purchases: paid.length, promotions: promotions.pagination.total },
    series: [...series.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function adminAnalyticsData(input: any) {
  const { adminAnalyticsCenter } = await import('./adminCommandService.js'); return adminAnalyticsCenter(input.days || 30);
}

export async function globalAdminSearch(query: string) {
  if (!query.trim()) return { users: [], sellers: [], listings: [], orders: [], payments: [], reports: [] };
  const [users, sellers, listings, orders, payments, reports] = await Promise.all([
    getIdentityRepository().listUsers({ search: query, limit: 10 }), getSellerProfileRepository().list({ search: query, limit: 10 }),
    adminListListings({ search: query, page: 1, limit: 10, sort: 'newest' }), adminListOrders({ search: query, page: 1, limit: 10 }),
    adminListPayments({ search: query, page: 1, limit: 10 }), adminReports({ search: query, page: 1, limit: 10 }),
  ]);
  return { users: users.slice(0, 10).map((item: any) => ({ id: String(item._id || item.id), name: item.name, email: item.email, status: item.status })), sellers: sellers.slice(0, 10).map((item: any) => ({ id: String(item._id || item.id), displayName: item.displayName, status: item.isActive === false ? 'suspended' : 'active' })), listings: listings.listings, orders: orders.orders, payments: payments.payments.map((item: any) => ({ id: item.id, reference: item.reference, orderId: item.orderId, type: item.type, amount: item.amount, currency: item.currency, status: item.status, createdAt: item.createdAt })), reports: reports.reports };
}

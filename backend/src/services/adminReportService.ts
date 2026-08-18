import { AppError } from '../utils/AppError.js';
import { adminListingReports, adminUpdateListingReport } from './reportService.js';
import { adminConversationReports, adminUpdateConversationReport } from './messagingService.js';
import { adminReviewReports, adminUpdateReviewReport } from './reviewService.js';
import { adminUserReports, adminUpdateUserReport } from './userReportService.js';
import { addModerationNote, getModerationNotes, logAdminActivity } from './adminActivityService.js';

const rank = (value: string) => ({ critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>)[value] || 0;
const priority = (reason: string) => ['scam', 'prohibited', 'fake-identity'].includes(reason) ? 'critical' : ['harassment', 'suspicious', 'fake'].includes(reason) ? 'high' : ['spam', 'offensive'].includes(reason) ? 'medium' : 'low';
const present = (item: any, type: string) => ({
  id: String(item._id || item.id),
  type,
  targetId: String(item.listingId || item.conversationId || item.reviewId || item.targetId),
  reporterId: String(item.reporterId),
  reason: item.reason,
  description: item.description || '',
  status: item.status,
  priority: item.priority || priority(item.reason),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  resolvedAt: item.resolvedAt || null,
  resolvedBy: item.resolvedBy ? String(item.resolvedBy) : null,
});

export async function adminReports(input: any) {
  const rows = [
    ...(await adminListingReports()).map((x: any) => present(x, 'listing')),
    ...(await adminConversationReports()).map((x: any) => present(x, 'chat')),
    ...(await adminUserReports()).map((x: any) => present(x, x.targetType || 'user')),
    ...(await adminReviewReports()).map((x: any) => present(x, 'review')),
  ].filter((item) => (!input.type || item.type === input.type) && (!input.status || item.status === input.status) && (!input.priority || item.priority === input.priority) && (!input.search || `${item.id} ${item.targetId} ${item.reason}`.toLowerCase().includes(input.search.toLowerCase())))
    .sort((a, b) => (rank(b.priority) - rank(a.priority)) || +new Date(b.createdAt) - +new Date(a.createdAt));
  const total = rows.length;
  const start = (input.page - 1) * input.limit;
  return {
    reports: rows.slice(start, start + input.limit),
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
    summary: {
      pending: rows.filter((x) => x.status === 'pending').length,
      critical: rows.filter((x) => x.priority === 'critical' && ['pending', 'investigating', 'escalated'].includes(x.status)).length,
      sellers: rows.filter((x) => x.type === 'seller' || x.type === 'user').length,
      reviews: rows.filter((x) => x.type === 'review').length,
    },
  };
}

export async function adminReportDetail(id: string) {
  const all = (await adminReports({ page: 1, limit: 10000 })).reports;
  const item = all.find((report) => report.id === id);
  if (!item) throw new AppError(404, 'Report not found', 'REPORT_NOT_FOUND');
  const noteType = item.type === 'chat' ? 'chat_report' : item.type === 'review' ? 'review_report' : item.type === 'listing' ? 'listing_report' : 'user_report';
  return { ...item, notes: await getModerationNotes(noteType, id) };
}

export async function updateAdminReport(adminId: string, id: string, status: string, note: string | undefined, req: any) {
  const detail = await adminReportDetail(id);
  const result = detail.type === 'chat'
    ? await adminUpdateConversationReport(id, status, adminId)
    : detail.type === 'review'
      ? await adminUpdateReviewReport(id, status, adminId)
      : detail.type === 'listing'
        ? await adminUpdateListingReport(id, status, adminId)
        : await adminUpdateUserReport(id, status, adminId);
  const noteType = detail.type === 'chat' ? 'chat_report' : detail.type === 'review' ? 'review_report' : detail.type === 'listing' ? 'listing_report' : 'user_report';
  if (note) await addModerationNote(adminId, noteType, id, note);
  const { recordModerationAction } = await import('./trustSafetyService.js'); await recordModerationAction(adminId,'report',id,status.toUpperCase(),note||`Report ${status}`,req);
  await logAdminActivity(adminId, `ADMIN_${status.toUpperCase()}_REPORT`, 'report', id, { type: detail.type }, req);
  return { ...present(result, detail.type), notes: await getModerationNotes(noteType, id) };
}

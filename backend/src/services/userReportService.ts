import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { UserReport } from '../models/UserReport.js';
import { AppError } from '../utils/AppError.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

export async function reportUser(reporterId: string, targetKey: string, input: { reason: string; description?: string; targetType?: string }) {
  const profile = await getSellerProfileRepository().findByPublicSlug(targetKey) || await getSellerProfileRepository().findByUserId(targetKey);
  const targetId = String(profile?.userId || targetKey);
  if (targetId === reporterId) throw new AppError(409, 'You cannot report yourself.', 'OWN_USER_REPORT');
  const targetType = input.targetType || 'seller';
  if (connected()) {
    const open = await UserReport.exists({ targetId, targetType, reporterId, status: { $in: ['pending', 'investigating', 'reviewed'] } });
    if (open) throw new AppError(409, 'You already reported this account.', 'REPORT_EXISTS');
    const created = await UserReport.create({ targetId, targetType, reporterId, reason: input.reason, description: String(input.description || '').slice(0, 1000) });
    return { id: String(created._id), status: created.status };
  }
  const duplicate = [...memory.values()].find((item) => item.targetId === targetId && item.targetType === targetType && item.reporterId === reporterId && ['pending', 'investigating', 'reviewed'].includes(item.status));
  if (duplicate) throw new AppError(409, 'You already reported this account.', 'REPORT_EXISTS');
  const report = { id: crypto.randomUUID(), targetId, targetType, reporterId, reason: input.reason, description: String(input.description || '').slice(0, 1000), status: 'pending', createdAt: new Date() };
  memory.set(report.id, report);
  return { id: report.id, status: report.status };
}

export async function adminUserReports() {
  if (connected()) return UserReport.find({}).sort({ createdAt: -1 }).lean();
  return [...memory.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function adminUpdateUserReport(id: string, status: string) {
  if (connected() && mongoose.isValidObjectId(id)) {
    const item = await UserReport.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
    if (!item) throw new AppError(404, 'Report not found', 'REPORT_NOT_FOUND');
    return item;
  }
  const item = memory.get(id);
  if (!item) throw new AppError(404, 'Report not found', 'REPORT_NOT_FOUND');
  item.status = status;
  memory.set(id, item);
  return item;
}

export async function listMyReports(userId: string) {
  const rows = connected()
    ? await UserReport.find({ reporterId: userId }).sort({ createdAt: -1 }).lean()
    : [...memory.values()].filter((item) => item.reporterId === userId);
  return rows.map((item: any) => ({ id: String(item._id || item.id), type: item.targetType, targetId: item.targetId, reason: item.reason, status: item.status, createdAt: item.createdAt }));
}

export function __resetUserReportMemory() { memory.clear(); }

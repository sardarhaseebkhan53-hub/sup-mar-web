import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Listing } from '../models/Listing.js';
import { ListingReport } from '../models/ListingReport.js';
import { AppError } from '../utils/AppError.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { findListingByPublicKey } from './listingService.js';
import { createSystemNotification } from './messagingService.js';

const memory = new Map<string, any>();

export async function adminListingReports() {
  if (mongoose.connection.readyState === 1) return ListingReport.find({}).sort({ createdAt: -1 }).lean();
  return [...memory.values()].sort((a, b) => +b.createdAt - +a.createdAt);
}

export async function adminUpdateListingReport(id: string, status: string) {
  if (mongoose.connection.readyState === 1) return ListingReport.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
  const item = memory.get(id);
  if (!item) throw new AppError(404, 'Report not found', 'REPORT_NOT_FOUND');
  item.status = status;
  memory.set(id, item);
  return item;
}

async function notifyAdmins(reportId: string, reason: string) {
  const repository = getIdentityRepository();
  const admins = [...(await repository.listUsers({ role: 'admin', limit: 100 })), ...(await repository.listUsers({ role: 'super_admin', limit: 100 }))];
  for (const admin of admins) {
    await createSystemNotification(String(admin._id || admin.id), {
      type: 'system',
      title: ['scam', 'prohibited'].includes(reason) ? 'High-priority marketplace report' : 'New marketplace report',
      body: `A ${reason} listing report requires review.`,
      relatedId: reportId,
      relatedType: 'system',
    });
  }
}

export async function reportListing(userId: string, listingKey: string, input: { reason: string; description?: string }) {
  const listing: any = await findListingByPublicKey(listingKey);
  if (!listing || listing.status === 'removed') throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  if (String(listing.sellerId) === userId) throw new AppError(409, 'You cannot report your own listing', 'OWN_LISTING_REPORT');
  let report: any;
  if (mongoose.connection.readyState === 1) {
    const duplicate = await ListingReport.exists({ listingId: listing._id, reporterId: userId, status: { $in: ['pending', 'investigating', 'reviewed'] } });
    if (duplicate) throw new AppError(409, 'You already reported this listing', 'REPORT_EXISTS');
    report = (await ListingReport.create({ listingId: listing._id, reporterId: userId, ...input })).toObject();
    await Listing.updateOne({ _id: listing._id }, { $inc: { reportCount: 1 } });
  } else {
    const duplicate = [...memory.values()].find((item) => item.listingId === listing.publicId && item.reporterId === userId && ['pending', 'investigating', 'reviewed'].includes(item.status));
    if (duplicate) throw new AppError(409, 'You already reported this listing', 'REPORT_EXISTS');
    report = { id: crypto.randomUUID(), listingId: listing.publicId, reporterId: userId, ...input, status: 'pending', createdAt: new Date() };
    memory.set(report.id, report);
    listing.reportCount = (listing.reportCount || 0) + 1;
  }
  const id = String(report._id || report.id);
  await notifyAdmins(id, input.reason);
  return { id, status: report.status };
}

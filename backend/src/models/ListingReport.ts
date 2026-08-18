import mongoose from 'mongoose';
const reportSchema = new mongoose.Schema<any>({ listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true }, reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, reason: { type: String, enum: ['scam','incorrect','prohibited','duplicate','offensive','wrong-category','other'], required: true }, description: { type: String, trim: true, maxlength: 1000, default: '' }, status: { type: String, enum: ['pending','investigating','reviewed','resolved','rejected','escalated'], default: 'pending', index: true } }, { timestamps: true });
reportSchema.index({ listingId: 1, reporterId: 1, status: 1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });
export const ListingReport: mongoose.Model<any> = (mongoose.models.ListingReport as mongoose.Model<any>) || mongoose.model<any>('ListingReport', reportSchema);

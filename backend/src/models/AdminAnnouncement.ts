import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  message: { type: String, required: true, trim: true, maxlength: 1200 },
  type: { type: String, enum: ['Info', 'Warning', 'Update', 'Maintenance'], required: true, index: true },
  audience: { type: String, enum: ['all', 'buyers', 'sellers', 'verified_sellers'], required: true, index: true },
  status: { type: String, enum: ['Draft', 'Scheduled', 'Active', 'Expired', 'Cancelled'], default: 'Draft', index: true },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: Date,
  deliveredCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true });
schema.index({ status: 1, startAt: 1, endAt: 1 });
schema.index({ createdAt: -1 });

export const AdminAnnouncement: mongoose.Model<any> = (mongoose.models.AdminAnnouncement as mongoose.Model<any>) || mongoose.model<any>('AdminAnnouncement', schema);

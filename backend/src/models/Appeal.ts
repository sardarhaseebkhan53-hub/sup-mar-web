import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['listing','account','restriction','verification'], required: true, index: true },
  targetId: { type: String, required: true, index: true },
  originalAction: { type: String, required: true, maxlength: 120 },
  reason: { type: String, required: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  evidenceReferences: { type: [String], default: [], select: false },
  status: { type: String, enum: ['Pending','Under Review','Needs Information','Accepted','Rejected'], default: 'Pending', index: true },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolutionNote: { type: String, maxlength: 2000, default: '', select: false },
}, { timestamps: true });
schema.index({ userId: 1, targetType: 1, targetId: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: 1 });

export const Appeal: mongoose.Model<any> = (mongoose.models.Appeal as mongoose.Model<any>) || mongoose.model<any>('Appeal', schema);

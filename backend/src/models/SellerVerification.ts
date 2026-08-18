import mongoose from 'mongoose';

export const SELLER_VERIFICATION_STATUSES = ['Pending','Under Review','Verified','Rejected','Needs More Information','Expired'] as const;
const schema = new mongoose.Schema<any>({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: SELLER_VERIFICATION_STATUSES, default: 'Pending', index: true },
  verificationType: { type: String, enum: ['individual','business'], required: true, index: true },
  profile: {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    contactPhone: { type: String, trim: true, maxlength: 30, default: '' },
    businessName: { type: String, trim: true, maxlength: 160, default: '' },
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, maxlength: 1000, default: '' },
  notes: { type: String, maxlength: 2000, default: '', select: false },
  expiresAt: Date,
}, { timestamps: true });
schema.index({ sellerId: 1, createdAt: -1 });
schema.index({ status: 1, submittedAt: 1 });

export const SellerVerification: mongoose.Model<any> = (mongoose.models.SellerVerification as mongoose.Model<any>) || mongoose.model<any>('SellerVerification', schema);

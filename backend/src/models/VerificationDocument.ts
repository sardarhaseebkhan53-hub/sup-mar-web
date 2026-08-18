import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  verificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerVerification', required: true, index: true },
  type: { type: String, enum: ['identity_front','identity_back','business_registration','address_evidence','other'], required: true },
  secureStorageReference: { type: String, required: true, select: false },
  originalNameHash: { type: String, select: false },
  mimeType: { type: String, select: false },
  size: { type: Number, min: 1, select: false },
  malwareScanStatus: { type: String, enum: ['Pending','Clean','Rejected','Unavailable'], default: 'Pending', select: false },
  status: { type: String, enum: ['Pending','Reviewed','Accepted','Rejected'], default: 'Pending', index: true },
  uploadedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
}, { timestamps: false });
schema.index({ verificationId: 1, uploadedAt: -1 });

export const VerificationDocument: mongoose.Model<any> = (mongoose.models.VerificationDocument as mongoose.Model<any>) || mongoose.model<any>('VerificationDocument', schema);

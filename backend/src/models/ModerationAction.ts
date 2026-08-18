import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['listing','user','seller','report','review','verification','appeal'], required: true, index: true },
  targetId: { type: String, required: true, index: true },
  action: { type: String, required: true, maxlength: 100 },
  reason: { type: String, required: true, maxlength: 2000 },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const ModerationAction: mongoose.Model<any> = (mongoose.models.ModerationAction as mongoose.Model<any>) || mongoose.model<any>('ModerationAction', schema);

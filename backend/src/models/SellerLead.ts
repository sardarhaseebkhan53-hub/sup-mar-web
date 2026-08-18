import mongoose from 'mongoose';

/**
 * SellerLead (Phase 17 §15–20) — a buyer inquiry in the seller's own pipeline.
 * Ownership is always resolved from the authenticated seller; buyerId is stored only
 * when the lead came from a real QAVLIO account interaction.
 */
const NOTE_MAX = 40;

const noteSchema = new mongoose.Schema<any>({
  body: { type: String, trim: true, maxlength: 500, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const schema = new mongoose.Schema<any>(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    buyerName: { type: String, trim: true, maxlength: 120, default: '' },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
    listingPublicId: { type: String, uppercase: true, default: '' },
    listingTitle: { type: String, trim: true, maxlength: 140, default: '' },
    source: { type: String, enum: ['message', 'inquiry', 'call_request', 'contact', 'manual'], default: 'manual', index: true },
    status: { type: String, enum: ['new', 'contacted', 'interested', 'negotiating', 'won', 'lost'], default: 'new', index: true },
    value: { type: mongoose.Schema.Types.Decimal128, default: null },
    notes: { type: [noteSchema], default: [] },
    lastContactedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ sellerId: 1, status: 1, updatedAt: -1 });
schema.index({ sellerId: 1, buyerId: 1 });
schema.index({ sellerId: 1, createdAt: -1 });

schema.path('notes').validate((notes: unknown[]) => notes.length <= NOTE_MAX, 'Too many notes on this lead');

export const SellerLead: mongoose.Model<any> = (mongoose.models.SellerLead as mongoose.Model<any>) || mongoose.model<any>('SellerLead', schema);

import mongoose from 'mongoose';

/**
 * ListingEmbedding (Phase 16 §27) — reference record for a listing's semantic vector.
 * Stores only a pointer to the vector source, the model name, and a content hash.
 * Provider secrets are never stored here.
 */
const schema = new mongoose.Schema<any>(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null, index: true },
    listingPublicId: { type: String, required: true, uppercase: true, index: true },
    embeddingReference: { type: String, required: true, default: '' },
    model: { type: String, required: true, default: 'local-hash-256' },
    dimensions: { type: Number, min: 1, default: 256 },
    contentHash: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

schema.index({ listingPublicId: 1, model: 1 }, { unique: true });

export const ListingEmbedding: mongoose.Model<any> =
  (mongoose.models.ListingEmbedding as mongoose.Model<any>) || mongoose.model<any>('ListingEmbedding', schema);

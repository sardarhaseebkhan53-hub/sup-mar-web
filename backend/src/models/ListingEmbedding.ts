import mongoose from 'mongoose';

/**
 * Phase 16 optional vector-search architecture.
 *
 * Stores a reference to the embedding for a listing's *public* content only
 * (title, description, category, curated attributes). No seller contact data,
 * no private notes, and never any provider secret.
 *
 * `embeddingReference` allows an external vector store to own the vector while
 * QAVLIO keeps the mapping; `vector` is used by the built-in local index.
 */
const schema = new mongoose.Schema<any>({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null, index: true },
  listingPublicId: { type: String, required: true, unique: true, uppercase: true },
  embeddingReference: { type: String, default: '', maxlength: 200 },
  model: { type: String, default: '', maxlength: 80 },
  dimensions: { type: Number, min: 0, default: 0 },
  vector: { type: [Number], default: [] },
  contentHash: { type: String, default: '', maxlength: 64, index: true },
  categorySlug: { type: String, default: '', lowercase: true, index: true },
  status: { type: String, default: 'published', index: true },
  updatedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: { createdAt: true, updatedAt: true } });

schema.index({ categorySlug: 1, updatedAt: -1 });

export const ListingEmbedding: mongoose.Model<any> = (mongoose.models.ListingEmbedding as mongoose.Model<any>) || mongoose.model<any>('ListingEmbedding', schema);

import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, trim: true },
  description: { type: String, required: true, maxlength: 10000 },
  price: { type: mongoose.Schema.Types.Decimal128, default: null },
  currency: { type: String, uppercase: true, default: 'PKR' },
  negotiable: { type: Boolean, default: false },
  condition: { type: String, enum: ['new', 'used', 'open-box', 'not-applicable'], default: 'used' },
  media: [{ url: String, key: String, alt: String, order: Number, type: { type: String, default: 'image' } }],
  location: {
    country: { type: String, default: 'PK' }, province: String, city: String, area: String,
    point: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], default: undefined } },
  },
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['draft', 'pending', 'active', 'rejected', 'sold', 'expired', 'archived'], default: 'draft', index: true },
  moderation: { riskScore: Number, reasons: [String], reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reviewedAt: Date },
  publishedAt: Date,
  expiresAt: { type: Date, index: true },
  viewCount: { type: Number, default: 0 },
}, { timestamps: true });

listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ 'location.point': '2dsphere' });
listingSchema.index({ status: 1, categoryId: 1, publishedAt: -1 });
listingSchema.index({ slug: 1, _id: 1 }, { unique: true });

export const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema);

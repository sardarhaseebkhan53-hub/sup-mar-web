import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema<any>({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'select', 'boolean', 'date'], required: true },
  required: { type: Boolean, default: false },
  filterable: { type: Boolean, default: false },
  options: [String],
  order: { type: Number, default: 0 },
}, { _id: false });

const categorySchema = new mongoose.Schema<any>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  description: { type: String, maxlength: 500 },
  icon: { type: String, default: 'LayoutGrid' },
  image: String,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  path: { type: String, index: true },
  level: { type: Number, default: 0 },
  attributes: { type: [attributeSchema], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  order: { type: Number, default: 0, index: true },
  sortOrder: { type: Number, default: 0 },
  seoTitle: String,
  seoDescription: String,
  seo: { title: String, description: String },
}, { timestamps: true });

categorySchema.index({ parentId: 1, order: 1 });
export const Category: mongoose.Model<any> = (mongoose.models.Category as mongoose.Model<any>) || mongoose.model<any>('Category', categorySchema);

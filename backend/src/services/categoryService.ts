import mongoose from 'mongoose';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
import { SUBCATEGORIES, filtersForCategory, slugify } from '../constants/discovery.js';
import { Category } from '../models/Category.js';

const fallbackRoot = (slug: string) => DEFAULT_CATEGORIES.find((category) => category.slug === slug);

export async function getActiveCategories() {
  if (mongoose.connection.readyState !== 1) return DEFAULT_CATEGORIES.map((category) => ({ ...category, count: 0 }));
  return Category.find({ isActive: true, parentId: null }).sort({ order: 1, name: 1 }).select('name slug description icon image parentId level attributes order seo').lean();
}

export async function getCategoryBySlug(slug: string) {
  if (mongoose.connection.readyState !== 1) {
    const root = fallbackRoot(slug);
    const parentEntry = Object.entries(SUBCATEGORIES).find(([, names]) => names.some((name) => slugify(name) === slug));
    const childName = parentEntry?.[1].find((name) => slugify(name) === slug);
    if (!root && !childName) return null;
    const record = root || { name: childName!, slug, icon: 'LayoutGrid', order: 0, parentId: parentEntry?.[0], isActive: true };
    return { ...record, description: `Discover trusted ${record.name.toLowerCase()} listings across Pakistan. Compare prices, locations and sellers on QAVLIO.`, seoTitle: `QAVLIO ${record.name} — Buy & Sell`, seoDescription: `Browse ${record.name.toLowerCase()} on QAVLIO. Filter by price, condition and location.`, filters: filtersForCategory(slug) };
  }
  const category = await Category.findOne({ slug, isActive: true }).lean();
  return category ? { ...category, filters: filtersForCategory(slug) } : null;
}

export async function getSubcategories(slug: string) {
  if (mongoose.connection.readyState !== 1) return (SUBCATEGORIES[slug] || []).map((name, order) => ({ id: `${slug}-${slugify(name)}`, name, slug: slugify(name), parentSlug: slug, isActive: true, order, count: 0 }));
  const parent = await Category.findOne({ slug, isActive: true }).select('_id').lean() as any;
  if (!parent) return null;
  return Category.find({ parentId: parent._id, isActive: true }).sort({ order: 1, name: 1 }).lean();
}

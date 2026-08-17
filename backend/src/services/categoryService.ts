import mongoose from 'mongoose';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
import { Category } from '../models/Category.js';

export async function getActiveCategories() {
  if (mongoose.connection.readyState !== 1) return DEFAULT_CATEGORIES;
  return Category.find({ isActive: true }).sort({ order: 1, name: 1 }).select('name slug icon image parentId level attributes order').lean();
}

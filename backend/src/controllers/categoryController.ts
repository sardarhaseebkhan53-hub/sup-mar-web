import { AppError } from '../utils/AppError.js';
import { getActiveCategories, getCategoryBySlug, getSubcategories } from '../services/categoryService.js';

export async function listCategories(_req, res) {
  const categories = await getActiveCategories();
  res.json({ success: true, data: categories, meta: { count: categories.length } });
}
export async function showCategory(req, res) {
  const category = await getCategoryBySlug(req.params.slug);
  if (!category) throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  res.json({ success: true, data: category });
}
export async function listSubcategories(req, res) {
  const categories = await getSubcategories(req.params.slug);
  if (categories === null) throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  res.json({ success: true, data: categories, meta: { count: categories.length } });
}

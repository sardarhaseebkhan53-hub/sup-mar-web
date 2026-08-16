import { getActiveCategories } from '../services/categoryService.js';

export async function listCategories(_req, res) {
  const categories = await getActiveCategories();
  res.json({ success: true, data: categories, meta: { count: categories.length } });
}

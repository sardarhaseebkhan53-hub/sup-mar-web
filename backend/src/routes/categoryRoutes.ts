import { Router } from 'express';
import { listCategories, listSubcategories, showCategory } from '../controllers/categoryController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const categoryRouter = Router();
categoryRouter.get('/', asyncHandler(listCategories));
categoryRouter.get('/:slug/subcategories', asyncHandler(listSubcategories));
categoryRouter.get('/:slug', asyncHandler(showCategory));

import { Router } from 'express';
import { listCategories, listSubcategories, showCategory } from '../controllers/categoryController.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const categoryRouter = Router();
categoryRouter.get('/', cacheControl(300), asyncHandler(listCategories));
categoryRouter.get('/:slug/subcategories', cacheControl(300), asyncHandler(listSubcategories));
categoryRouter.get('/:slug', cacheControl(300), asyncHandler(showCategory));

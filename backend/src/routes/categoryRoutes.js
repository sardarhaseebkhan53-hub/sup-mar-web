import { Router } from 'express';
import { listCategories } from '../controllers/categoryController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const categoryRouter = Router();
categoryRouter.get('/', asyncHandler(listCategories));

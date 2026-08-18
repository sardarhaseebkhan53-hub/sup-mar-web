import { Router } from 'express';
import { search } from '../controllers/searchController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const searchRouter = Router();
searchRouter.get('/', asyncHandler(search));

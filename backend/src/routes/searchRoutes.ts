import { Router } from 'express';
import { search } from '../controllers/searchController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { optionalAuthenticate } from '../middleware/optionalAuth.js';

export const searchRouter = Router();
searchRouter.get('/', optionalAuthenticate, asyncHandler(search));

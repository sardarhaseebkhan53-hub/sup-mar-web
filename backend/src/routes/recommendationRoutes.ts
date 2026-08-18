import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/optionalAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sections, similar, trending } from '../controllers/recommendationController.js';

export const recommendationRouter = Router();
recommendationRouter.get('/', asyncHandler(optionalAuthenticate), asyncHandler(sections));
recommendationRouter.get('/trending', asyncHandler(optionalAuthenticate), asyncHandler(trending));
recommendationRouter.get('/similar/:listingId', asyncHandler(optionalAuthenticate), asyncHandler(similar));

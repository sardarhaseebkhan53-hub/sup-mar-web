import { Router } from 'express';
import { home } from '../controllers/discoveryController.js';
import { optionalAuthenticate } from '../middleware/optionalAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const discoveryRouter = Router();
discoveryRouter.get('/home', optionalAuthenticate, asyncHandler(home));

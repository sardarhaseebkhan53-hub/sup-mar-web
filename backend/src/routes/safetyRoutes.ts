import { Router } from 'express';
import { index, show } from '../controllers/safetyController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const safetyRouter = Router();
safetyRouter.get('/', asyncHandler(index));
safetyRouter.get('/:slug', asyncHandler(show));

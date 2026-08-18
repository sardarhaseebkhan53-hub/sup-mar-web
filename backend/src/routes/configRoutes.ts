import { Router } from 'express';
import { readPublicConfig } from '../controllers/configController.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const configRouter = Router();
configRouter.get('/public', cacheControl(300), asyncHandler(readPublicConfig));

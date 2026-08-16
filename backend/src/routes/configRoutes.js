import { Router } from 'express';
import { readPublicConfig } from '../controllers/configController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const configRouter = Router();
configRouter.get('/public', asyncHandler(readPublicConfig));

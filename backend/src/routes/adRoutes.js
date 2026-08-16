import { Router } from 'express';
import { z } from 'zod';
import { readAdSlot } from '../controllers/adController.js';
import { AD_SLOTS } from '../constants/adSlots.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const adRouter = Router();
const paramsSchema = z.object({ slotId: z.enum(AD_SLOTS) });
adRouter.get('/slots/:slotId', validate(paramsSchema, 'params'), asyncHandler(readAdSlot));

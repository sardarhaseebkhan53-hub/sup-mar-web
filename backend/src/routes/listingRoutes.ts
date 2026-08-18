import { Router } from 'express';
import { z } from 'zod';
import { create, patch, remove, show, transition, uploadIntent, view } from '../controllers/listingController.js';
import { USER_ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listingInputSchema } from '../validators/listingValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const imageIntent = z.object({ fileName: z.string().trim().min(1).max(200), fileType: z.enum(['image/jpeg', 'image/png', 'image/webp']), fileSize: z.number().int().positive().max(8 * 1024 * 1024) }).strict();
export const listingRouter = Router();
listingRouter.get('/:id', asyncHandler(show));
listingRouter.post('/:id/view', asyncHandler(view));
listingRouter.use(asyncHandler(authenticate), authorize(USER_ROLES.SELLER));
listingRouter.post('/uploads/intent', validate(imageIntent), asyncHandler(uploadIntent));
listingRouter.post('/', validate(listingInputSchema), asyncHandler(create));
listingRouter.patch('/:id', validate(listingInputSchema.partial()), asyncHandler(patch));
listingRouter.delete('/:id', asyncHandler(remove));
for (const action of ['publish', 'pause', 'resume', 'sold']) listingRouter.post(`/:id/${action}`, (req, _res, next) => { (req.params as any).action = action; next(); }, asyncHandler(transition));

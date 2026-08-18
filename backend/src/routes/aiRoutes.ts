import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { optionalAuthenticate } from '../middleware/optionalAuth.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { chat, compare, conversation, conversations, listingAssist, myTickets, recommendations, search, status, support } from '../controllers/aiController.js';

const aiWindow = rateLimit({
  windowMs: 60_000,
  limit: env.nodeEnv === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, message: 'Too many QAVLIO AI requests. Try again shortly.', code: 'AI_RATE_LIMITED' }),
});

export const aiRouter = Router();
aiRouter.use(aiWindow);
aiRouter.get('/status', asyncHandler(status));
aiRouter.post('/chat', asyncHandler(optionalAuthenticate), asyncHandler(chat));
aiRouter.post('/search', asyncHandler(optionalAuthenticate), asyncHandler(search));
aiRouter.post('/compare', asyncHandler(optionalAuthenticate), asyncHandler(compare));
aiRouter.post('/recommendations', asyncHandler(optionalAuthenticate), asyncHandler(recommendations));
aiRouter.post('/listing-assistant', asyncHandler(optionalAuthenticate), asyncHandler(listingAssist));
aiRouter.post('/support', asyncHandler(authenticate), asyncHandler(support));
aiRouter.get('/support/tickets', asyncHandler(authenticate), asyncHandler(myTickets));
aiRouter.get('/conversations', asyncHandler(authenticate), asyncHandler(conversations));
aiRouter.get('/conversations/:id', asyncHandler(optionalAuthenticate), asyncHandler(conversation));

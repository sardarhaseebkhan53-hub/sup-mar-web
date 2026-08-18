import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { optionalAuthenticate } from '../middleware/optionalAuth.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  chat,
  compare,
  conversation,
  conversations,
  listingAssist,
  listingAttributes,
  listingCategory,
  listingDescription,
  listingPriceInsight,
  listingQualityScore,
  listingTitle,
  myTickets,
  recommendationFeed,
  recommendations,
  search,
  similarListings,
  status,
  support,
  trendingListings,
} from '../controllers/aiController.js';

const aiWindow = rateLimit({
  windowMs: 60_000,
  limit: env.nodeEnv === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: any) => req.auth?.userId || req.ip,
  handler: (_req, res) => res.status(429).json({ success: false, message: 'Too many QAVLIO AI requests. Try again shortly.', code: 'AI_RATE_LIMITED' }),
});

export const aiRouter = Router();
aiRouter.use(aiWindow);
aiRouter.get('/status', asyncHandler(status));
aiRouter.post('/chat', asyncHandler(optionalAuthenticate), asyncHandler(chat));
// `/assistant` is the Phase 16 name for the conversational endpoint; `/chat` stays for existing clients.
aiRouter.post('/assistant', asyncHandler(optionalAuthenticate), asyncHandler(chat));
aiRouter.post('/search', asyncHandler(optionalAuthenticate), asyncHandler(search));
aiRouter.post('/compare', asyncHandler(optionalAuthenticate), asyncHandler(compare));
aiRouter.post('/recommendations', asyncHandler(optionalAuthenticate), asyncHandler(recommendations));
aiRouter.post('/listing-assistant', asyncHandler(optionalAuthenticate), asyncHandler(listingAssist));
aiRouter.post('/listing/title', asyncHandler(optionalAuthenticate), asyncHandler(listingTitle));
aiRouter.post('/listing/description', asyncHandler(optionalAuthenticate), asyncHandler(listingDescription));
aiRouter.post('/listing/attributes', asyncHandler(optionalAuthenticate), asyncHandler(listingAttributes));
aiRouter.post('/listing/category', asyncHandler(optionalAuthenticate), asyncHandler(listingCategory));
aiRouter.post('/listing/price-insight', asyncHandler(optionalAuthenticate), asyncHandler(listingPriceInsight));
aiRouter.post('/listing/quality', asyncHandler(optionalAuthenticate), asyncHandler(listingQualityScore));
aiRouter.post('/support', asyncHandler(authenticate), asyncHandler(support));
aiRouter.get('/support/tickets', asyncHandler(authenticate), asyncHandler(myTickets));
aiRouter.get('/conversations', asyncHandler(authenticate), asyncHandler(conversations));
aiRouter.get('/conversations/:id', asyncHandler(optionalAuthenticate), asyncHandler(conversation));

/** Phase 16 recommendation surface — read-only, guest friendly. */
export const recommendationRouter = Router();
recommendationRouter.use(aiWindow);
recommendationRouter.get('/', asyncHandler(optionalAuthenticate), asyncHandler(recommendationFeed));
recommendationRouter.get('/trending', asyncHandler(optionalAuthenticate), asyncHandler(trendingListings));
recommendationRouter.get('/similar/:listingId', asyncHandler(optionalAuthenticate), asyncHandler(similarListings));

import { Router } from 'express';
import { z } from 'zod';
import { index, show } from '../controllers/sellerListingController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sellerListingQuerySchema } from '../validators/listingValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { index as billingIndex, show as billingShow } from '../controllers/billingController.js';
import { seller as sellerPromotions } from '../controllers/promotionController.js';
import { inbox as sellerReviewInbox } from '../controllers/reviewController.js';
import { requireSellerScope, requireScopePermission } from '../services/sellerScopeService.js';
import {
  aiInsights, analytics, bulkListings, createLeadRow, createTemplateRow, customerDetail, customers, dashboard, deleteTemplateRow,
  duplicate, exportDataset, invite, inventory, join, leadDetail, leadPatchSchema, leads, updateTeamMemberRow, onboarding, orderDetail, orders, removeLeadRow,
  performance, performanceMetrics, replyToReview, revenue, search, team, templates, updateInventoryRow, updateLeadRow, updateTemplateRow, useTemplateRow,
} from '../controllers/sellerCenterController.js';

export const sellerListingRouter = Router();

// Team invitations are accepted with the invited user's EXISTING account — the seller role
// is granted on acceptance, so this one route must be reachable before the seller gate.
sellerListingRouter.post('/team/join', asyncHandler(authenticate), validate(z.object({ token: z.string().trim().min(20).max(128) }).strict()), asyncHandler(join));

sellerListingRouter.use(asyncHandler(authenticate), asyncHandler(requireSellerScope));

sellerListingRouter.get('/listings', validate(sellerListingQuerySchema, 'query'), asyncHandler(index));
sellerListingRouter.get('/listings/:id', asyncHandler(show));
sellerListingRouter.get('/payments', validate(z.object({ type: z.enum(['listing_fee','promotion','package']).optional(), status: z.enum(['pending','processing','paid','failed','cancelled','refunded','expired']).optional(), date: z.enum(['30days','90days','year']).optional(), sort: z.enum(['newest','oldest','amount']).default('newest'), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }), 'query'), asyncHandler(billingIndex));
sellerListingRouter.get('/payments/:id', asyncHandler(billingShow));
sellerListingRouter.get('/promotions', asyncHandler(sellerPromotions));
sellerListingRouter.get('/reviews', asyncHandler(sellerReviewInbox));

/* ------------------------------ Phase 17 Seller Business Center ------------------------------ */

sellerListingRouter.get('/dashboard', asyncHandler(requireScopePermission('analytics')), asyncHandler(dashboard));
sellerListingRouter.get('/dashboard/performance', asyncHandler(requireScopePermission('analytics')), asyncHandler(performance));
sellerListingRouter.get('/onboarding', asyncHandler(requireScopePermission('listings')), asyncHandler(onboarding));

sellerListingRouter.post('/listings/bulk', asyncHandler(requireScopePermission('listings')), asyncHandler(bulkListings));
sellerListingRouter.post('/listings/:id/duplicate', asyncHandler(requireScopePermission('listings')), asyncHandler(duplicate));

sellerListingRouter.get('/inventory', asyncHandler(requireScopePermission('inventory')), asyncHandler(inventory));
sellerListingRouter.patch('/inventory/:id', asyncHandler(requireScopePermission('inventory')), asyncHandler(updateInventoryRow));

sellerListingRouter.get('/leads', asyncHandler(requireScopePermission('leads')), asyncHandler(leads));
sellerListingRouter.post('/leads', validate(z.object({ buyerId: z.string().trim().max(40).optional(), buyerName: z.string().trim().max(120).optional(), listingPublicId: z.string().trim().max(40).optional(), source: z.enum(['message','inquiry','call_request','contact','manual']).optional(), value: z.number().min(0).optional(), note: z.string().trim().max(500).optional(), conversationId: z.string().trim().max(40).optional() }).strict()), asyncHandler(createLeadRow));
sellerListingRouter.get('/leads/:id', asyncHandler(requireScopePermission('leads')), asyncHandler(leadDetail));
sellerListingRouter.patch('/leads/:id', asyncHandler(requireScopePermission('leads')), validate(leadPatchSchema), asyncHandler(updateLeadRow));
sellerListingRouter.delete('/leads/:id', asyncHandler(requireScopePermission('leads')), asyncHandler(removeLeadRow));

sellerListingRouter.get('/customers', asyncHandler(requireScopePermission('customers')), asyncHandler(customers));
sellerListingRouter.get('/customers/:id', asyncHandler(requireScopePermission('customers')), asyncHandler(customerDetail));

sellerListingRouter.get('/orders', asyncHandler(requireScopePermission('orders')), asyncHandler(orders));
sellerListingRouter.get('/orders/:id', asyncHandler(requireScopePermission('orders')), asyncHandler(orderDetail));

sellerListingRouter.get('/revenue', asyncHandler(requireScopePermission('revenue')), asyncHandler(revenue));
sellerListingRouter.get('/analytics', asyncHandler(requireScopePermission('analytics')), asyncHandler(analytics));

sellerListingRouter.get('/ai/insights', asyncHandler(requireScopePermission('ai')), asyncHandler(aiInsights));
sellerListingRouter.get('/ai/performance-metrics', asyncHandler(requireScopePermission('analytics')), asyncHandler(performanceMetrics));

sellerListingRouter.get('/messages/templates', asyncHandler(requireScopePermission('messages')), asyncHandler(templates));
sellerListingRouter.post('/messages/templates', asyncHandler(requireScopePermission('messages')), asyncHandler(createTemplateRow));
sellerListingRouter.patch('/messages/templates/:id', asyncHandler(requireScopePermission('messages')), asyncHandler(updateTemplateRow));
sellerListingRouter.delete('/messages/templates/:id', asyncHandler(requireScopePermission('messages')), asyncHandler(deleteTemplateRow));
sellerListingRouter.post('/messages/templates/:id/use', asyncHandler(requireScopePermission('messages')), asyncHandler(useTemplateRow));

sellerListingRouter.post('/reviews/:id/reply', asyncHandler(requireScopePermission('listings')), asyncHandler(replyToReview));

sellerListingRouter.get('/team', asyncHandler(requireScopePermission('team')), asyncHandler(team));
sellerListingRouter.post('/team/invite', asyncHandler(requireScopePermission('team')), asyncHandler(invite));
sellerListingRouter.patch('/team/:id', asyncHandler(requireScopePermission('team')), asyncHandler(updateTeamMemberRow));

sellerListingRouter.get('/search', asyncHandler(requireScopePermission('listings')), asyncHandler(search));
sellerListingRouter.get('/export/:dataset', asyncHandler(requireScopePermission('export')), asyncHandler(exportDataset));

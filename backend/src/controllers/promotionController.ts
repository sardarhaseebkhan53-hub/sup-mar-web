import { cancelPromotion, createPromotionRequest, listListingPromotions, listSellerPromotions } from '../services/paymentService.js'; import { getMarketplaceSettings } from '../services/marketplaceSettingsService.js';
export async function products(_req,res){const settings=await getMarketplaceSettings();res.json({success:true,data:settings.promotionEnabled?settings.promotionProducts:[]})}
export async function create(req,res){res.status(201).json({success:true,data:await createPromotionRequest(req.auth.userId,req.params.id,req.body.productKey,req.body.idempotencyKey,req.body.paymentMethod||'pay')})}
export async function listing(req,res){res.json({success:true,data:await listListingPromotions(req.auth.userId,req.params.id)})}
export async function seller(req,res){res.json({success:true,data:await listSellerPromotions(req.auth.userId)})}
export async function cancel(req,res){res.json({success:true,data:await cancelPromotion(req.auth.userId,req.params.id)})}
export async function placement(req,res){const {listPromotionPlacement}=await import('../services/promotionService.js');res.json({success:true,data:await listPromotionPlacement(req.params.placement,typeof req.query.category==='string'?req.query.category:undefined,Math.min(24,Number(req.query.limit)||12))})}

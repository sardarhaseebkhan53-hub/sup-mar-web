import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { filtersForCategory } from '../constants/discovery.js';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { Category } from '../models/Category.js';
import { Listing } from '../models/Listing.js';
import { AppError } from '../utils/AppError.js';
import type { ListingInput } from '../validators/listingValidator.js';
import { getCategoryBySlug, getSubcategories } from './categoryService.js';
import { verifyListingMedia } from './imageService.js';

const memoryListings = new Map<string, any>();
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'listing';
const publicId = () => `QV-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
const connected = () => mongoose.connection.readyState === 1;
const present = (record: any) => ({ ...record, id: String(record._id || record.id || record.publicId), price: record.price?.toString?.() || record.price });
export const presentPublicListing = (record: any) => ({
  publicId: record.publicId,
  slug: record.slug,
  title: record.title,
  description: record.description,
  price: record.price?.toString?.() || record.price,
  currency: record.currency || 'PKR',
  negotiable: Boolean(record.negotiable),
  condition: record.condition,
  categorySlug: record.categorySlug,
  subcategorySlug: record.subcategorySlug,
  attributes: record.attributes instanceof Map ? Object.fromEntries(record.attributes) : record.attributes || {},
  media: record.media || [],
  coverImage: record.coverImage || record.media?.[0]?.url || null,
  location: record.location || {},
  status: record.status,
  verificationStatus: record.verificationStatus || 'not-verified',
  safetyStatus: record.safetyStatus || 'normal',
  viewCount: record.viewCount || 0,
  favoriteCount: record.favoriteCount || 0,
  messagesCount: record.messagesCount || 0,
  isPromoted: Boolean(record.isPromoted && record.promotion?.status === 'active'),
  promotion: record.isPromoted && record.promotion?.status === 'active' ? {
    status: 'active',
    types: record.promotion?.types || [],
    placements: record.promotion?.placements || [],
    label: record.promotion?.label || 'Promoted',
    endsAt: record.promotion?.endsAt,
  } : { status: 'none', types: [], placements: [] },
  createdAt: record.createdAt,
  publishedAt: record.publishedAt,
});

async function resolveTaxonomy(input: ListingInput) {
  if (!input.categorySlug) return { category: null, subcategory: null };
  const category = await getCategoryBySlug(input.categorySlug);
  if (!category) throw new AppError(422, 'Choose an active marketplace category', 'CATEGORY_INVALID');
  let subcategory: any = null;
  if (input.subcategorySlug) {
    const options = await getSubcategories(input.categorySlug);
    subcategory = options?.find((item: any) => item.slug === input.subcategorySlug);
    if (!subcategory) throw new AppError(422, 'Choose a valid subcategory', 'SUBCATEGORY_INVALID');
  }
  const allowed = new Set(filtersForCategory(input.categorySlug).map((field) => field.key));
  for (const key of Object.keys(input.attributes || {})) if (!allowed.has(key)) throw new AppError(422, `Attribute “${key}” is not allowed for this category`, 'ATTRIBUTE_INVALID');
  return { category, subcategory };
}

async function idsFor(input: ListingInput) {
  if (!connected() || !input.categorySlug) return { categoryId: null, subcategoryId: null };
  const [category, subcategory] = await Promise.all([Category.findOne({ slug: input.categorySlug, isActive: true }).select('_id').lean() as any, input.subcategorySlug ? Category.findOne({ slug: input.subcategorySlug, isActive: true }).select('_id').lean() as any : null]);
  return { categoryId: category?._id || null, subcategoryId: subcategory?._id || null };
}

export function assertPublishable(record: any) {
  const errors: string[] = [];
  if (!record.categorySlug && !record.categoryId) errors.push('category');
  if (!record.title || record.title.length < 5) errors.push('title');
  if (!record.description || record.description.length < 20) errors.push('description');
  if (record.price === undefined || record.price === null || Number(record.price) < 0) errors.push('price');
  if (!record.condition) errors.push('condition');
  if (!record.location?.city || !record.location?.area) errors.push('location');
  if (!record.media?.length) errors.push('at least one photo');
  if (errors.length) throw new AppError(422, `Complete these fields before publishing: ${errors.join(', ')}`, 'LISTING_INCOMPLETE', { fields: errors });
}

export async function createListing(userId: string, input: ListingInput) {
  const { assertNoRestriction } = await import('./trustSafetyService.js'); await assertNoRestriction(userId, ['ACCOUNT','SELLING','LISTING']);
  await resolveTaxonomy(input); verifyListingMedia(userId, input.media || []); const ids = await idsFor(input);
  const now = new Date(); const id = publicId();
  const payload: any = { ...input, ...ids, coverImage: input.media?.[0]?.url || null, publicId: id, sellerId: userId, slug: slugify(input.title || 'draft'), status: 'draft', availability: 'available', viewCount: 0, favoriteCount: 0, messagesCount: 0, createdAt: now, updatedAt: now };
  if (!connected()) { memoryListings.set(id, payload); return present(payload); }
  return present((await Listing.create(payload)).toObject());
}

export async function getOwnedListing(userId: string, id: string) {
  const record = connected() ? await Listing.findOne({ $or: [{ publicId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])], sellerId: userId }).lean() : memoryListings.get(id);
  if (!record || String((record as any).sellerId) !== userId) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  return present(record);
}

export async function updateListing(userId: string, id: string, input: ListingInput) {
  const current = await getOwnedListing(userId, id);
  if (current.status === 'removed') throw new AppError(409, 'Removed listings cannot be edited', 'LISTING_REMOVED');
  await resolveTaxonomy({ ...current, ...input }); verifyListingMedia(userId, input.media || current.media || []); const ids = await idsFor({ ...current, ...input });
  const patch: any = { ...input, ...ids, ...(input.media && { coverImage: input.media[0]?.url || null }), ...(input.title && { slug: slugify(input.title) }), updatedAt: new Date() };
  if (!connected()) { const next = { ...current, ...patch }; memoryListings.set(current.publicId, next); await afterListingPriceChange(current, next); return present(next); }
  const saved = present(await Listing.findOneAndUpdate({ publicId: current.publicId, sellerId: userId }, { $set: patch }, { new: true, runValidators: true }).lean());
  await afterListingPriceChange(current, saved);
  return saved;
}

export async function transitionListing(userId: string, id: string, action: 'publish' | 'pause' | 'resume' | 'sold' | 'remove') {
  const current = await getOwnedListing(userId, id);
  const allowed: Record<string, string[]> = { publish: ['draft', 'pending', 'paused'], pause: ['published'], resume: ['paused'], sold: ['published', 'paused'], remove: ['draft', 'pending', 'published', 'paused', 'sold'] };
  if (!allowed[action].includes(current.status)) throw new AppError(409, `A ${current.status} listing cannot be ${action}d`, 'LISTING_STATUS_INVALID');
  let status = action === 'publish' || action === 'resume' ? 'published' : action === 'remove' ? 'removed' : action === 'sold' ? 'sold' : 'paused';
  let moderationState = status === 'published' ? 'Approved' : status === 'removed' ? 'Removed' : status === 'sold' ? 'Sold' : 'Suspended';
  let assessment: any = null;
  if (action === 'publish' || action === 'resume') {
    assertPublishable(current);
    const { assertNoRestriction, evaluateModerationRules } = await import('./trustSafetyService.js');
    await assertNoRestriction(userId, ['ACCOUNT','SELLING','LISTING']);
    const { assessListing } = await import('./riskAssessmentService.js');
    assessment = await assessListing(current);
    const rules = await evaluateModerationRules(current);
    if (['High','Critical'].includes(assessment.riskLevel || assessment.level) || ['REVIEW','BLOCK'].includes(rules.action)) { status = 'pending'; moderationState = 'Pending Review'; }
  }
  const patch: any = { status, moderationState, availability: status === 'sold' ? 'unavailable' : 'available', ...(status === 'published' && !current.publishedAt ? { publishedAt: new Date() } : {}), ...(assessment && { 'moderation.riskScore': assessment.score || 0, 'moderation.reasons': assessment.signals || [] }), updatedAt: new Date() };
  let saved: any;
  if (!connected()) { saved = { ...current, ...patch, moderation: { ...(current.moderation || {}), riskScore: assessment?.score || current.moderation?.riskScore, reasons: assessment?.signals || current.moderation?.reasons } }; memoryListings.set(current.publicId, saved); }
  else saved = await Listing.findOneAndUpdate({ publicId: current.publicId, sellerId: userId }, { $set: patch }, { new: true }).lean();
  await afterListingTransition(current, saved);
  return present(saved);
}

export async function adminUpdateListingSafety(id: string, safetyStatus: string) {
  const current: any = await adminGetListing(id);
  if (!['normal', 'flagged', 'restricted'].includes(safetyStatus)) throw new AppError(422, 'Invalid listing safety status', 'LISTING_SAFETY_INVALID');
  const patch = { safetyStatus, updatedAt: new Date() };
  if (connected()) return present(await Listing.findOneAndUpdate({ publicId: current.publicId }, { $set: patch }, { new: true }).lean());
  const next = { ...current, ...patch };
  memoryListings.set(current.publicId, next);
  return present(next);
}

export async function countEligibleSellerListings(userId: string, excludePublicId?: string) { if (connected()) return Listing.countDocuments({ sellerId: userId, status: { $in: ['published','paused','sold'] }, ...(excludePublicId && { publicId: { $ne: excludePublicId } }) }); return [...memoryListings.values()].filter((item) => item.sellerId === userId && item.publicId !== excludePublicId && ['published','paused','sold'].includes(item.status)).length; }

export async function listSellerListings(userId: string, input: any) {
  let rows: any[]; if (!connected()) rows = [...memoryListings.values()].filter((item) => item.sellerId === userId);
  else { const category = input.category ? await Category.findOne({ slug: input.category, isActive: true }).select('_id').lean() as any : null; const since = input.date ? new Date(Date.now() - (input.date === 'today' ? 1 : input.date === '7days' ? 7 : 30) * 86400000) : null; rows = await Listing.find({ sellerId: userId, ...(input.status && { status: input.status }), ...(category && { categoryId: category._id }), ...(since && { createdAt: { $gte: since } }), ...((input.minPrice !== undefined || input.maxPrice !== undefined) && { price: { ...(input.minPrice !== undefined && { $gte: input.minPrice }), ...(input.maxPrice !== undefined && { $lte: input.maxPrice }) } }) }).sort({ createdAt: input.sort === 'oldest' ? 1 : -1 }).lean(); }
  if (input.q) rows = rows.filter((item) => `${item.title} ${item.publicId}`.toLowerCase().includes(input.q.toLowerCase()));
  if (input.status) rows = rows.filter((item) => item.status === input.status);
  if (input.category && !connected()) rows = rows.filter((item) => item.categorySlug === input.category);
  if (input.date && !connected()) { const days = input.date === 'today' ? 1 : input.date === '7days' ? 7 : 30; rows = rows.filter((item) => +new Date(item.createdAt) >= Date.now() - days * 86400000); }
  if (input.minPrice !== undefined) rows = rows.filter((item) => Number(item.price) >= input.minPrice); if (input.maxPrice !== undefined) rows = rows.filter((item) => Number(item.price) <= input.maxPrice);
  if (input.sort === 'most-viewed') rows.sort((a, b) => b.viewCount - a.viewCount); if (input.sort === 'price-asc') rows.sort((a, b) => Number(a.price) - Number(b.price)); if (input.sort === 'price-desc') rows.sort((a, b) => Number(b.price) - Number(a.price));
  const total = rows.length; const start = (input.page - 1) * input.limit; rows = rows.slice(start, start + input.limit);
  const all = connected() ? await Listing.find({ sellerId: userId, status: { $ne: 'removed' } }).select('status viewCount favoriteCount messagesCount').lean() : [...memoryListings.values()].filter((item) => item.sellerId === userId && item.status !== 'removed');
  const summary = { active: all.filter((i: any) => i.status === 'published').length, pending: all.filter((i: any) => i.status === 'pending').length, drafts: all.filter((i: any) => i.status === 'draft').length, sold: all.filter((i: any) => i.status === 'sold').length, views: all.reduce((sum: number, i: any) => sum + (i.viewCount || 0), 0), favorites: all.reduce((sum: number, i: any) => sum + (i.favoriteCount || 0), 0), messages: all.reduce((sum: number, i: any) => sum + (i.messagesCount || 0), 0) };
  return { listings: rows.map(present), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) }, summary };
}

const publicIdFromKey = (key: string) => key.match(/QV-[A-Z0-9]+$/i)?.[0]?.toUpperCase() || key.toUpperCase();
export async function findListingByPublicKey(key: string) {
  const id = publicIdFromKey(key);
  if (connected()) return Listing.findOne({ publicId: id }).lean();
  return memoryListings.get(id) || DEMO_LISTINGS.find((item) => item.publicId === id) || null;
}
export async function getPublicListing(key: string) { const record: any = await findListingByPublicKey(key); if (!record || !['published','sold','paused','expired'].includes(record.status)) throw new AppError(record?.status === 'removed' ? 410 : 404, record?.status === 'removed' ? 'This listing is no longer available.' : 'Listing not found', record?.status === 'removed' ? 'LISTING_REMOVED' : 'LISTING_NOT_FOUND'); return present(record); }
export async function listPublicListingsBySeller(sellerId: string, sort = 'newest', excludeId?: string, limit = 24) {
  let rows: any[] = connected() ? await Listing.find({ sellerId, status: 'published', ...(excludeId && { publicId: { $ne: excludeId } }) }).limit(Math.min(limit, 50)).lean() : [...memoryListings.values()].filter((item) => item.sellerId === sellerId && item.status === 'published' && item.publicId !== excludeId);
  rows.sort(sort === 'price-asc' ? (a,b) => Number(a.price)-Number(b.price) : sort === 'price-desc' ? (a,b) => Number(b.price)-Number(a.price) : (a,b) => +new Date(b.createdAt)-+new Date(a.createdAt)); return rows.slice(0, limit).map(presentPublicListing);
}
export async function publicSellerStats(sellerId: string) { const rows: any[] = connected() ? await Listing.find({ sellerId, status: { $in: ['published','sold'] } }).select('status').lean() : [...memoryListings.values()].filter((item) => item.sellerId === sellerId && ['published','sold'].includes(item.status)); return { activeListings: rows.filter((item) => item.status === 'published').length, soldListings: rows.filter((item) => item.status === 'sold').length }; }
export async function relatedListings(record: any, limit = 8) {
  const id = record.publicId; let rows: any[] = connected() ? await Listing.find({ status: 'published', publicId: { $ne: id }, categoryId: record.categoryId }).limit(limit * 3).lean() : [...DEMO_LISTINGS, ...getPublishedMemoryListings()].filter((item: any) => item.publicId !== id && (!record.categorySlug || item.categorySlug === record.categorySlug));
  rows.sort((a,b) => { const locationA = a.location?.city === record.location?.city ? 1 : 0; const locationB = b.location?.city === record.location?.city ? 1 : 0; const priceA = Math.abs(Number(a.price)-Number(record.price)); const priceB = Math.abs(Number(b.price)-Number(record.price)); return locationB-locationA || priceA-priceB; }); return rows.slice(0, limit).map(presentPublicListing);
}
export function getPublishedMemoryListings() { return [...memoryListings.values()].filter((item) => item.status === 'published'); }
export async function setListingPromotion(publicId: string, active: boolean, startsAt?: Date, endsAt?: Date, details: { types?: string[]; placements?: string[]; priority?: number; label?: string } = {}) {
  const patch = {
    isPromoted: active,
    'promotion.status': active ? 'active' : 'expired',
    'promotion.startsAt': startsAt,
    'promotion.endsAt': endsAt,
    'promotion.types': active ? details.types || [] : [],
    'promotion.placements': active ? details.placements || [] : [],
    'promotion.priority': active ? details.priority || 0 : 0,
    'promotion.label': active ? details.label || 'Promoted' : '',
  };
  if (connected()) { await Listing.updateOne({ publicId }, { $set: patch }); return; }
  const item = memoryListings.get(publicId);
  if (item) {
    item.isPromoted = active;
    item.promotion = { ...(item.promotion || {}), status: active ? 'active' : 'expired', startsAt, endsAt, types: active ? details.types || [] : [], placements: active ? details.placements || [] : [], priority: active ? details.priority || 0 : 0, label: active ? details.label || 'Promoted' : '' };
    memoryListings.set(publicId, item);
  }
}

export async function setListingMonetization(userId: string, publicIdValue: string, entitlement: 'free' | 'paid' | 'credit', referenceId?: string) {
  const current: any = await getOwnedListing(userId, publicIdValue);
  if (current.monetization?.publicationEntitlement && current.monetization.publicationEntitlement !== 'none') return current;
  const monetization = {
    publicationEntitlement: entitlement,
    paymentId: entitlement === 'paid' && mongoose.isValidObjectId(referenceId) ? referenceId : null,
    creditTransactionId: entitlement === 'credit' ? referenceId || null : null,
    chargedAt: new Date(),
  };
  if (connected()) return present(await Listing.findOneAndUpdate({ publicId: current.publicId, sellerId: userId, 'monetization.publicationEntitlement': { $in: ['none', null] } }, { $set: { monetization } }, { new: true }).lean() || current);
  const item = memoryListings.get(current.publicId);
  if (item && (!item.monetization?.publicationEntitlement || item.monetization.publicationEntitlement === 'none')) { item.monetization = monetization; memoryListings.set(current.publicId, item); }
  return present(item || current);
}

export async function incrementListingMessages(publicIdValue: string) {
  if (connected()) { await Listing.updateOne({ publicId: publicIdValue }, { $inc: { messagesCount: 1 } }); return; }
  const item = memoryListings.get(publicIdValue); if (item) { item.messagesCount = (item.messagesCount || 0) + 1; memoryListings.set(publicIdValue, item); }
}
export async function adminListListings(input:any){const page=Number(input.page)||1,limit=Math.min(5000,Number(input.limit)||25);const risk=(item:any)=>Number(item.moderation?.riskScore||0)>=80?'Critical':Number(item.moderation?.riskScore||0)>=60?'High':Number(item.moderation?.riskScore||0)>=30?'Medium':'Low';let rows:any[],total:number;if(connected()){const filter:any={...(input.status&&{status:input.status}),...(input.category&&{categorySlug:input.category}),...(input.seller&&mongoose.isValidObjectId(input.seller)&&{sellerId:input.seller}),...(input.verification&&{verificationStatus:input.verification}),...(input.promotion&&{isPromoted:input.promotion==='active'}),...((input.minPrice!==undefined||input.maxPrice!==undefined)&&{price:{...(input.minPrice!==undefined&&{$gte:input.minPrice}),...(input.maxPrice!==undefined&&{$lte:input.maxPrice})}}),...((input.from||input.to)&&{createdAt:{...(input.from&&{$gte:new Date(input.from)}),...(input.to&&{$lte:new Date(input.to)})}})};if(input.location)filter.$and=[{$or:[{'location.city':{$regex:input.location.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}},{'location.province':{$regex:input.location.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}}]}];if(input.search){const search={$or:[{title:{$regex:input.search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}},{publicId:{$regex:input.search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}}]};filter.$and=[...(filter.$and||[]),search]}if(input.riskLevel)filter['moderation.riskScore']=input.riskLevel==='Critical'?{$gte:80}:input.riskLevel==='High'?{$gte:60,$lt:80}:input.riskLevel==='Medium'?{$gte:30,$lt:60}:{$lt:30};const sort:any=input.sort==='oldest'?{createdAt:1}:input.sort==='views'?{viewCount:-1}:input.sort==='price-asc'?{price:1}:input.sort==='price-desc'?{price:-1}:{createdAt:-1};[rows,total]=await Promise.all([Listing.find(filter).sort(sort).skip((page-1)*limit).limit(limit).lean(),Listing.countDocuments(filter)])}else{rows=[...memoryListings.values()].filter(item=>(!input.status||item.status===input.status)&&(!input.category||item.categorySlug===input.category)&&(!input.seller||String(item.sellerId)===input.seller)&&(!input.location||`${item.location?.city||''} ${item.location?.province||''}`.toLowerCase().includes(input.location.toLowerCase()))&&(!input.verification||item.verificationStatus===input.verification)&&(!input.promotion||Boolean(item.isPromoted)===(input.promotion==='active'))&&(!input.riskLevel||risk(item)===input.riskLevel)&&(input.minPrice===undefined||Number(item.price)>=input.minPrice)&&(input.maxPrice===undefined||Number(item.price)<=input.maxPrice)&&(!input.from||new Date(item.createdAt)>=new Date(input.from))&&(!input.to||new Date(item.createdAt)<=new Date(input.to))&&(!input.search||`${item.title} ${item.publicId}`.toLowerCase().includes(input.search.toLowerCase())));if(input.sort==='views')rows.sort((a,b)=>(b.viewCount||0)-(a.viewCount||0));else if(input.sort==='oldest')rows.sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt));else if(input.sort==='price-asc')rows.sort((a,b)=>Number(a.price)-Number(b.price));else if(input.sort==='price-desc')rows.sort((a,b)=>Number(b.price)-Number(a.price));else rows.sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt));total=rows.length;rows=rows.slice((page-1)*limit,page*limit)}return{listings:rows.map(item=>({...present(item),sellerId:String(item.sellerId),reportCount:item.reportCount||0,riskLevel:risk(item),moderation:{riskScore:item.moderation?.riskScore,reasons:item.moderation?.reasons||[],rejectionReason:item.moderation?.rejectionReason,removedReason:item.moderation?.removedReason}})),pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}}}
export async function adminGetListing(id:string){const item:any=connected()?await Listing.findOne({$or:[{publicId:id},...(mongoose.isValidObjectId(id)?[{_id:id}]:[])]}).lean():memoryListings.get(id);if(!item)throw new AppError(404,'Listing not found','LISTING_NOT_FOUND');return{...present(item),sellerId:String(item.sellerId),moderation:item.moderation||{},reportCount:item.reportCount||0}}
export async function adminUpdateListingStatus(id:string,status:string,reason:string,adminId:string){const current:any=await adminGetListing(id);if(status==='published')assertPublishable(current);const state:any={draft:'Draft',pending:'Pending Review',published:'Approved',rejected:'Rejected',paused:'Suspended',removed:'Removed',expired:'Expired',sold:'Sold'};const patch:any={status,moderationState:state[status]||current.moderationState,updatedAt:new Date()};if(['rejected','removed'].includes(status))patch.moderation={...(current.moderation||{}),[status==='rejected'?'rejectionReason':'removedReason']:reason,reviewedBy:adminId,reviewedAt:new Date()};if(status==='published')patch.publishedAt=current.publishedAt||new Date();let saved:any;if(connected())saved=await Listing.findOneAndUpdate({publicId:current.publicId},{$set:patch},{new:true}).lean();else{saved={...current,...patch};memoryListings.set(current.publicId,saved)}if(['rejected','removed','paused','published'].includes(status)){const{recordModerationAction,recordViolation}=await import('./trustSafetyService.js');await recordModerationAction(adminId,'listing',current.publicId,status.toUpperCase(),reason);if(['rejected','removed'].includes(status))await recordViolation(adminId,String(current.sellerId),'LISTING_POLICY',current.publicId,status.toUpperCase())}return present(saved)}
export async function adminUpdateListingVerification(id:string,status:'pending'|'verified'|'rejected',adminId:string,reason:string){const current:any=await adminGetListing(id);const patch:any={verificationStatus:status,updatedAt:new Date(),'moderation.reviewedBy':adminId,'moderation.reviewedAt':new Date()};let saved:any;if(connected())saved=await Listing.findOneAndUpdate({publicId:current.publicId},{$set:patch},{new:true}).lean();else{saved={...current,verificationStatus:status,updatedAt:new Date(),moderation:{...(current.moderation||{}),reviewedBy:adminId,reviewedAt:new Date()}};memoryListings.set(current.publicId,saved)}const{recordModerationAction}=await import('./trustSafetyService.js');await recordModerationAction(adminId,'listing',current.publicId,`VERIFICATION_${status.toUpperCase()}`,reason);return present(saved)}
export async function adminListingMetrics(){const rows:any[]=connected()?await Listing.find({}).select('status categorySlug viewCount favoriteCount messagesCount createdAt location sellerId isPromoted verificationStatus safetyStatus').lean():[...memoryListings.values()];return{total:rows.length,active:rows.filter(x=>x.status==='published').length,pending:rows.filter(x=>['pending','draft'].includes(x.status)).length,sold:rows.filter(x=>x.status==='sold').length,views:rows.reduce((s,x)=>s+(x.viewCount||0),0),favorites:rows.reduce((s,x)=>s+(x.favoriteCount||0),0),rows}}
export async function countListingsUsingCategory(slug:string){return connected()?Listing.countDocuments({$or:[{categorySlug:slug},{subcategorySlug:slug}]}):[...memoryListings.values()].filter(item=>item.categorySlug===slug||item.subcategorySlug===slug).length}
export async function adminListingCountsBySeller(userIds:string[]){if(!userIds.length)return{};if(connected()){const rows:any[]=await Listing.aggregate([{$match:{sellerId:{$in:userIds.filter(mongoose.isValidObjectId).map(id=>new mongoose.Types.ObjectId(id))}}},{$group:{_id:'$sellerId',listings:{$sum:1},active:{$sum:{$cond:[{$eq:['$status','published']},1,0]}}}}]);return Object.fromEntries(rows.map(row=>[String(row._id),{listings:row.listings,activeListings:row.active}]))}const result:any={};for(const item of memoryListings.values()){const id=String(item.sellerId);if(!userIds.includes(id))continue;result[id]||={listings:0,activeListings:0};result[id].listings+=1;if(item.status==='published')result[id].activeListings+=1}return result}
export function incrementMemoryListingView(id: string) { const item = memoryListings.get(id); if (item) { item.viewCount = (item.viewCount || 0) + 1; memoryListings.set(id, item); } }

function listingPriceOf(record: any) { return Number(record?.price?.toString?.() ?? record?.price ?? NaN); }

async function afterListingPriceChange(previous: any, next: any) {
  const before = listingPriceOf(previous);
  const after = listingPriceOf(next);
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === after) return;
  const { recordPriceChange } = await import('./priceHistoryService.js');
  const { enqueueAlert, processPriceAlerts } = await import('./alertService.js');
  await recordPriceChange(next.publicId, before, after);
  await enqueueAlert(() => processPriceAlerts(next, before, after));
}

async function afterListingTransition(previous: any, next: any) {
  const { enqueueAlert, processListingPublished, processListingStatusAlerts } = await import('./alertService.js');
  if (next.status === 'published' && previous.status !== 'published') await enqueueAlert(() => processListingPublished(next));
  if (['sold', 'removed', 'expired'].includes(next.status) && previous.status !== next.status) await enqueueAlert(() => processListingStatusAlerts(next));
  // Phase 16 — keep semantic index and recommendation caches in step with real listing state.
  const { ensureEmbedding, invalidateEmbedding } = await import('./embeddingService.js');
  const { invalidateRecommendations } = await import('./recommendationService.js');
  if (next.status === 'published') {
    void ensureEmbedding(next).catch(() => undefined); // background, never blocks the transition
  } else if (['sold', 'removed', 'expired'].includes(next.status)) {
    void invalidateEmbedding(next.publicId).catch(() => undefined);
    invalidateRecommendations(); // §46 — sold/removed listings leave cached recommendation feeds
  }
}

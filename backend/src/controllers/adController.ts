import { analyticsSeries,claimReward,createAdvertisement,deleteAdvertisement,listAdvertisements,selectAdvertisement,setAdvertisementStatus,trackAdEvent,updateAdvertisement } from '../services/advertisementService.js';import { createAdUploadIntent } from '../services/imageService.js';
const context=(req)=>({placement:req.params.placement||req.query.placement,category:req.query.category||'',city:req.query.city||'',device:req.query.device||'desktop',userType:req.auth?.roles?.includes('seller')?'seller':req.auth?.userId?'customer':'guest',listingId:req.query.listingId||'',sessionId:req.get('x-qavlio-ad-session')||req.query.sessionId||req.ip});
export async function listEligibleAds(req,res){const ad=await selectAdvertisement(context(req));res.json({success:true,data:{ad}})}
export async function readAdSlot(req,res){const ad=await selectAdvertisement({...context(req),placement:req.params.slotId});res.json({success:true,data:{slotId:req.params.slotId,active:Boolean(ad),campaign:ad}})}
export async function impression(req,res){res.json({success:true,data:await trackAdEvent(req.params.id,'impression',{...context(req),...req.body},req.auth?.userId)})}
export async function click(req,res){res.json({success:true,data:await trackAdEvent(req.params.id,'click',{...context(req),...req.body},req.auth?.userId)})}
export async function reward(req,res){res.status(202).json({success:true,data:await claimReward(req.auth.userId,req.params.id)})}
export async function adminIndex(req,res){res.json({success:true,data:await listAdvertisements(req.query)})}
export async function adminCreate(req,res){res.status(201).json({success:true,data:await createAdvertisement(req.body)})}
export async function adminUpdate(req,res){res.json({success:true,data:await updateAdvertisement(req.params.id,req.body)})}
export async function adminDelete(req,res){res.json({success:true,data:await deleteAdvertisement(req.params.id)})}
export async function adminPause(req,res){res.json({success:true,data:await setAdvertisementStatus(req.params.id,'paused')})}
export async function adminActivate(req,res){res.json({success:true,data:await setAdvertisementStatus(req.params.id,'active')})}
export async function adminAnalytics(_req,res){res.json({success:true,data:await analyticsSeries()})}
export async function uploadIntent(req,res){res.json({success:true,data:createAdUploadIntent(req.auth.userId,req.body)})}

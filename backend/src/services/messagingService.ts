import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { ConversationReport } from '../models/ConversationReport.js';
import { Message } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { findListingByPublicKey, presentPublicListing } from './listingService.js';
import { verifyMessageAttachments } from './imageService.js';

const conversations = new Map<string, any>(); const messages = new Map<string, any>(); const notifications = new Map<string, any>(); const reports = new Map<string, any>();
let emitter: (room: string, event: string, payload: unknown) => void = () => {}; let activeChecker: (userId:string,conversationId:string)=>boolean=()=>false;
export const setMessagingEmitter = (next: typeof emitter) => { emitter = next; }; export const setActiveConversationChecker=(next:typeof activeChecker)=>{activeChecker=next};
const connected = () => mongoose.connection.readyState === 1;
const member = (record: any, userId: string) => [String(record.buyerId), String(record.sellerId)].includes(userId);
const otherId = (record: any, userId: string) => String(record.buyerId) === userId ? String(record.sellerId) : String(record.buyerId);
const assertMember = (record: any, userId: string) => { if (!record || !member(record, userId)) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND'); };
const findMemoryConversation = (id: string) => conversations.get(id) || null;

async function enrich(record: any, userId: string) {
  const participant = await getIdentityRepository().findUserById(otherId(record, userId));
  const listing: any = await findListingByPublicKey(String(record.listingPublicId || record.listingId));
  return { id: String(record._id || record.id), buyerId: String(record.buyerId), sellerId: String(record.sellerId), participant: participant ? { id: String(participant._id || participant.id), name: participant.name, avatar: participant.avatar || null, lastSeenAt: participant.lastLoginAt || null } : { id: otherId(record,userId), name: 'QAVLIO user', avatar: null }, listing: listing ? presentPublicListing(listing) : null, lastMessagePreview: record.lastMessagePreview || '', lastMessageAt: record.lastMessageAt || record.updatedAt, unreadCount: String(record.buyerId) === userId ? record.unreadCountBuyer || 0 : record.unreadCountSeller || 0, archived: (record.archivedBy || []).map(String).includes(userId), blockedByMe: (record.blockedBy || []).map(String).includes(userId), blockedByOther: (record.blockedBy || []).map(String).includes(otherId(record,userId)), createdAt: record.createdAt, updatedAt: record.updatedAt };
}

export async function findOrCreateConversation(buyerId: string, listingKey: string) {
  const listing: any = await findListingByPublicKey(listingKey); if (!listing || listing.status !== 'published') throw new AppError(409, 'This seller cannot be contacted for this listing', 'LISTING_UNAVAILABLE'); const sellerId = String(listing.sellerId || ''); if (!sellerId) throw new AppError(409, 'Seller contact is unavailable', 'SELLER_UNAVAILABLE'); if (sellerId === buyerId) throw new AppError(409, 'This is your own listing', 'OWN_LISTING_CONTACT');
  const { areUsersBlocked } = await import('./blockService.js');
  if (await areUsersBlocked(buyerId, sellerId)) throw new AppError(403, 'Messaging is blocked with this user', 'USER_BLOCKED');
  let record: any; if (connected()) record = await Conversation.findOneAndUpdate({ buyerId, sellerId, listingId: listing._id }, { $setOnInsert: { buyerId, sellerId, listingId: listing._id } }, { new: true, upsert: true }).lean(); else { record = [...conversations.values()].find((item) => item.buyerId === buyerId && item.sellerId === sellerId && item.listingPublicId === listing.publicId); if (!record) { const now = new Date(); record = { id: crypto.randomUUID(), buyerId, sellerId, listingId: listing.publicId, listingPublicId: listing.publicId, lastMessagePreview: '', unreadCountBuyer: 0, unreadCountSeller: 0, archivedBy: [], blockedBy: [], deletedBy: [], createdAt: now, updatedAt: now }; conversations.set(record.id, record); } }
  return { ...(await enrich(record, buyerId)), ready: true };
}

export async function getConversation(userId: string, id: string) { const record: any = connected() && mongoose.isValidObjectId(id) ? await Conversation.findById(id).lean() : findMemoryConversation(id); assertMember(record,userId); return enrich(record,userId); }
export async function listConversations(userId: string, input: { q?: string; archived?: boolean; page: number; limit: number }) {
  let rows: any[] = connected() ? await Conversation.find({ $or: [{ buyerId: userId }, { sellerId: userId }], deletedBy: { $ne: userId }, ...(input.archived ? { archivedBy: userId } : { archivedBy: { $ne: userId } }) }).sort({ lastMessageAt: -1, updatedAt: -1 }).limit(200).lean() : [...conversations.values()].filter((item) => member(item,userId) && !(item.deletedBy||[]).includes(userId) && (input.archived ? (item.archivedBy||[]).includes(userId) : !(item.archivedBy||[]).includes(userId)));
  let enriched = await Promise.all(rows.map((row) => enrich(row,userId))); if (input.q) { const q=input.q.toLowerCase(); enriched=enriched.filter((item) => `${item.participant.name} ${item.listing?.title||''}`.toLowerCase().includes(q)); }
  const total=enriched.length; const start=(input.page-1)*input.limit; enriched=enriched.slice(start,start+input.limit); return { conversations: enriched, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total/input.limit) }, unreadTotal: enriched.reduce((sum,item)=>sum+item.unreadCount,0) };
}

export async function listMessages(userId: string, id: string, input: { before?: string; limit: number }) { const conversation: any = connected() && mongoose.isValidObjectId(id) ? await Conversation.findById(id).lean() : findMemoryConversation(id); assertMember(conversation,userId); let rows: any[]; if (connected()) { const query:any={conversationId:id}; if(input.before&&mongoose.isValidObjectId(input.before)){const anchor:any=await Message.findById(input.before).select('createdAt').lean();if(anchor)query.createdAt={$lt:anchor.createdAt}} rows=await Message.find(query).sort({createdAt:-1}).limit(input.limit+1).lean(); } else { rows=[...messages.values()].filter((item)=>item.conversationId===id).sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt)); if(input.before){const at=rows.findIndex((item)=>item.id===input.before);if(at>=0)rows=rows.slice(at+1)} rows=rows.slice(0,input.limit+1); } const hasMore=rows.length>input.limit; rows=rows.slice(0,input.limit).reverse(); return { messages: rows.map(presentMessage), hasMore, nextCursor: hasMore?String(rows[0]?._id||rows[0]?.id):null }; }
const presentMessage=(item:any)=>({id:String(item._id||item.id),clientId:item.clientId,senderId:String(item.senderId),receiverId:String(item.receiverId),type:item.type,text:item.text,attachments:item.attachments||[],status:item.status,createdAt:item.createdAt,updatedAt:item.updatedAt});

export async function sendMessage(userId: string, id: string, input: { text?: string; attachments?: any[]; clientId: string }) { const conversation:any=connected()&&mongoose.isValidObjectId(id)?await Conversation.findById(id).lean():findMemoryConversation(id);assertMember(conversation,userId);if((conversation.blockedBy||[]).length)throw new AppError(403,'Messaging is blocked in this conversation','CONVERSATION_BLOCKED');
  const { areUsersBlocked } = await import('./blockService.js');
  if (await areUsersBlocked(String(conversation.buyerId), String(conversation.sellerId))) throw new AppError(403,'Messaging is blocked with this user','USER_BLOCKED');const text=(input.text||'').trim();const attachments=input.attachments||[];verifyMessageAttachments(userId,attachments);if(!text&&!attachments.length)throw new AppError(422,'Write a message or add an image','MESSAGE_EMPTY');const receiverId=otherId(conversation,userId);let record:any;
  if(connected()){const existing:any=await Message.findOne({senderId:userId,clientId:input.clientId}).lean();if(existing)return presentMessage(existing);record=(await Message.create({conversationId:id,senderId:userId,receiverId,type:attachments.length?'image':'text',text,attachments,clientId:input.clientId,status:'sent'})).toObject();const buyerSending=String(conversation.buyerId)===userId;await Conversation.updateOne({_id:id},{$set:{lastMessageId:record._id,lastMessagePreview:text||'Photo',lastMessageAt:record.createdAt,updatedAt:record.createdAt},$inc:{[buyerSending?'unreadCountSeller':'unreadCountBuyer']:1},$pull:{archivedBy:receiverId}});}else{const existing=[...messages.values()].find((item)=>item.senderId===userId&&item.clientId===input.clientId);if(existing)return presentMessage(existing);const now=new Date();record={id:crypto.randomUUID(),conversationId:id,senderId:userId,receiverId,type:attachments.length?'image':'text',text,attachments,clientId:input.clientId,status:'sent',createdAt:now,updatedAt:now};messages.set(record.id,record);conversation.lastMessageId=record.id;conversation.lastMessagePreview=text||'Photo';conversation.lastMessageAt=now;conversation.updatedAt=now;conversation[String(conversation.buyerId)===userId?'unreadCountSeller':'unreadCountBuyer']+=1;conversation.archivedBy=(conversation.archivedBy||[]).filter((value:string)=>value!==receiverId);conversations.set(id,conversation);}
  const message=presentMessage(record);const notification=activeChecker(receiverId,id)?null:await createNotification(receiverId,{type:'message',title:'New message',body:text.slice(0,180)||'Sent you a photo',relatedId:id,relatedType:'conversation'});emitter(`conversation:${id}`,'message:new',message);if(notification)emitter(`user:${receiverId}`,'notification:new',notification);emitter(`user:${receiverId}`,'conversation:updated',{conversationId:id});return message; }

export async function markMessageDelivered(userId:string,messageId:string){let item:any;if(connected()&&mongoose.isValidObjectId(messageId))item=await Message.findOneAndUpdate({_id:messageId,receiverId:userId,status:'sent'},{$set:{status:'delivered'}},{new:true}).lean();else{item=messages.get(messageId);if(item?.receiverId===userId&&item.status==='sent'){item.status='delivered';messages.set(messageId,item)}}if(item){emitter(`conversation:${item.conversationId}`,'message:delivered',{messageId,status:'delivered'});return true}return false;}

export async function markConversationRead(userId:string,id:string){const conversation:any=connected()&&mongoose.isValidObjectId(id)?await Conversation.findById(id).lean():findMemoryConversation(id);assertMember(conversation,userId);if(connected()){await Message.updateMany({conversationId:id,receiverId:userId,status:{$ne:'read'}},{$set:{status:'read'}});await Conversation.updateOne({_id:id},{$set:{[String(conversation.buyerId)===userId?'unreadCountBuyer':'unreadCountSeller']:0}});}else{for(const message of messages.values())if(message.conversationId===id&&message.receiverId===userId)message.status='read';conversation[String(conversation.buyerId)===userId?'unreadCountBuyer':'unreadCountSeller']=0;conversations.set(id,conversation);}emitter(`conversation:${id}`,'message:read',{conversationId:id,readerId:userId,readAt:new Date()});return{read:true};}
export async function setArchived(userId:string,id:string,archived=true){const record:any=connected()&&mongoose.isValidObjectId(id)?await Conversation.findById(id).lean():findMemoryConversation(id);assertMember(record,userId);if(connected())await Conversation.updateOne({_id:id},archived?{$addToSet:{archivedBy:userId}}:{$pull:{archivedBy:userId}});else{record.archivedBy=archived?[...new Set([...(record.archivedBy||[]),userId])]:(record.archivedBy||[]).filter((x:string)=>x!==userId);conversations.set(id,record)}return{archived};}
export async function setBlocked(userId:string,id:string,blocked=true){const record:any=connected()&&mongoose.isValidObjectId(id)?await Conversation.findById(id).lean():findMemoryConversation(id);assertMember(record,userId);if(connected())await Conversation.updateOne({_id:id},blocked?{$addToSet:{blockedBy:userId}}:{$pull:{blockedBy:userId}});else{record.blockedBy=blocked?[...new Set([...(record.blockedBy||[]),userId])]:(record.blockedBy||[]).filter((x:string)=>x!==userId);conversations.set(id,record)}emitter(`conversation:${id}`,'conversation:blocked',{conversationId:id,blockedBy:blocked?userId:null});return{blocked};}
export async function adminConversationReports(){if(connected())return ConversationReport.find({}).sort({createdAt:-1}).lean();return[...reports.values()].sort((a,b)=>+b.createdAt-+a.createdAt)}export async function adminUpdateConversationReport(id:string,status:string){if(connected())return ConversationReport.findByIdAndUpdate(id,{$set:{status}},{new:true}).lean();const item=reports.get(id);if(!item)throw new AppError(404,'Report not found','REPORT_NOT_FOUND');item.status=status;reports.set(id,item);return item}
export async function reportConversation(userId:string,id:string,input:any){const record:any=connected()&&mongoose.isValidObjectId(id)?await Conversation.findById(id).lean():findMemoryConversation(id);assertMember(record,userId);if(connected()){if(await ConversationReport.exists({conversationId:id,reporterId:userId,status:{$in:['pending','reviewed']}}))throw new AppError(409,'You already reported this conversation','REPORT_EXISTS');const report=await ConversationReport.create({conversationId:id,reporterId:userId,...input});return{id:String(report._id),status:report.status}}const duplicate=[...reports.values()].find((item)=>item.conversationId===id&&item.reporterId===userId&&['pending','reviewed'].includes(item.status));if(duplicate)throw new AppError(409,'You already reported this conversation','REPORT_EXISTS');const report={id:crypto.randomUUID(),conversationId:id,reporterId:userId,...input,status:'pending',createdAt:new Date()};reports.set(report.id,report);return{id:report.id,status:report.status};}

export async function createSystemNotification(userId:string,input:{type:'message'|'favorite'|'listing'|'system'|'saved_search'|'price_alert'|'seller_update'|'listing_status';title:string;body:string;relatedId?:string;relatedType?:'conversation'|'listing'|'system'|'search'|'seller'}){const notification=await createNotification(userId,input);emitter(`user:${userId}`,'notification:new',notification);return notification;}
async function createNotification(userId:string,input:any){if(connected()){const item:any=(await Notification.create({userId,...input})).toObject();return presentNotification(item)}const item={id:crypto.randomUUID(),userId,...input,read:false,createdAt:new Date()};notifications.set(item.id,item);return presentNotification(item)}
const presentNotification=(item:any)=>({id:String(item._id||item.id),type:item.type,title:item.title,body:item.body,relatedId:item.relatedId,relatedType:item.relatedType,read:Boolean(item.read),createdAt:item.createdAt});
export async function listNotifications(userId:string,limit=20){const rows:any[]=connected()?await Notification.find({userId}).sort({createdAt:-1}).limit(limit).lean():[...notifications.values()].filter((item)=>item.userId===userId).sort((a,b)=>+b.createdAt-+a.createdAt).slice(0,limit);return{notifications:rows.map(presentNotification),unread:rows.filter((item)=>!item.read).length};}
export async function readNotification(userId:string,id:string){if(connected())await Notification.updateOne({_id:id,userId},{$set:{read:true}});else{const item=notifications.get(id);if(item?.userId===userId){item.read=true;notifications.set(id,item)}}return{read:true};}
export async function readAllNotifications(userId:string){if(connected())await Notification.updateMany({userId,read:false},{$set:{read:true}});else for(const [id,item]of notifications)if(item.userId===userId){item.read=true;notifications.set(id,item)}return{read:true};}
export async function isConversationMember(userId:string,id:string){const record:any=connected()&&mongoose.isValidObjectId(id)?await Conversation.findById(id).select('buyerId sellerId blockedBy').lean():findMemoryConversation(id);return Boolean(record&&member(record,userId));}

export async function findEligibleInteraction(reviewerId: string, sellerId: string, listingKey?: string) {
  const rows: any[] = connected()
    ? await Conversation.find({ buyerId: reviewerId }).lean()
    : [...conversations.values()].filter((item) => String(item.buyerId) === reviewerId);
  const byListing = listingKey
    ? rows.find((item) => [String(item.listingPublicId || ''), String(item.listingId || '')].some((value) => value && (value === listingKey || value.toUpperCase() === listingKey.toUpperCase())))
    : null;
  const bySeller = rows.find((item) => String(item.sellerId) === String(sellerId));
  const match = byListing || bySeller;
  if (!match) return null;
  return { conversationId: String(match._id || match.id), listingId: String(match.listingPublicId || match.listingId), sellerId: String(match.sellerId) };
}

export async function sellerResponseMetrics(sellerId: string) {
  const rows: any[] = connected()
    ? await Conversation.find({ sellerId }).select('_id buyerId').lean()
    : [...conversations.values()].filter((item) => String(item.sellerId) === sellerId);
  const replies: number[] = [];
  let answered = 0;
  for (const conversation of rows) {
    const thread: any[] = connected()
      ? await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).select('senderId createdAt').lean()
      : [...messages.values()].filter((item) => item.conversationId === String(conversation._id || conversation.id)).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const firstBuyer = thread.find((item) => String(item.senderId) === String(conversation.buyerId));
    const firstSeller = thread.find((item) => String(item.senderId) === sellerId);
    if (firstBuyer && firstSeller && +new Date(firstSeller.createdAt) >= +new Date(firstBuyer.createdAt)) {
      answered += 1;
      replies.push((+new Date(firstSeller.createdAt) - +new Date(firstBuyer.createdAt)) / 60000);
    }
  }
  const sample = rows.length;
  if (sample < 5) return { sample, responseRate: null, responseTimeMinutes: null };
  return { sample, responseRate: Math.round((answered / sample) * 100), responseTimeMinutes: replies.length ? Math.round(replies.reduce((sum, value) => sum + value, 0) / replies.length) : null };
}

export async function blockConversationsBetween(userId: string, otherIdValue: string, blocked: boolean) {
  if (connected()) {
    const query = { $or: [{ buyerId: userId, sellerId: otherIdValue }, { buyerId: otherIdValue, sellerId: userId }] };
    if (blocked) await Conversation.updateMany(query, { $addToSet: { blockedBy: userId } });
    else await Conversation.updateMany(query, { $pull: { blockedBy: userId } });
    return;
  }
  for (const [id, item] of conversations) {
    if (!member(item, userId) || !member(item, otherIdValue)) continue;
    item.blockedBy = blocked ? [...new Set([...(item.blockedBy || []), userId])] : (item.blockedBy || []).filter((value: string) => value !== userId);
    conversations.set(id, item);
  }
}

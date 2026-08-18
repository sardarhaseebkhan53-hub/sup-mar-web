import type { PublicListing } from './listingDetail';
export interface ChatParticipant { id:string; name:string; avatar?:string|null; lastSeenAt?:string|null }
export interface Conversation { id:string; buyerId:string; sellerId:string; participant:ChatParticipant; listing:PublicListing|null; lastMessagePreview:string; lastMessageAt?:string; unreadCount:number; archived:boolean; blockedByMe:boolean; blockedByOther:boolean; createdAt:string; }
export interface Attachment { url:string; thumbnailUrl?:string; key:string; width?:number; height?:number; mimeType:string; localUrl?:string }
export interface Message { id:string; clientId?:string; senderId:string; receiverId:string; type:'text'|'image'|'system'; text:string; attachments:Attachment[]; status:'sent'|'delivered'|'read'|'failed'|'sending'; createdAt:string; }
export interface NotificationItem { id:string; type:string; title:string; body:string; relatedId?:string; relatedType?:string; read:boolean; createdAt:string }

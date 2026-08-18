import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { isConversationMember, markConversationRead, markMessageDelivered, sendMessage, setActiveConversationChecker, setMessagingEmitter } from '../services/messagingService.js';
import { verifyAccessToken } from '../services/tokenService.js';

export function configureRealtime(httpServer) {
  const io = new Server(httpServer, { path: '/socket.io', cors: { origin(origin,callback){const allowed=!origin||env.clientOrigins.includes(origin)||(env.nodeEnv!=='production'&&/^https:\/\/[^/]+\.e2b\.app$/.test(origin));callback(allowed?null:new Error('Origin not allowed'),allowed)}, credentials: true }, transports: ['websocket', 'polling'] });
  const online = new Map<string, number>(); const active = new Map<string, Set<string>>();
  setMessagingEmitter((room,event,payload)=>io.to(room).emit(event,payload));
  setActiveConversationChecker((userId,conversationId)=>active.get(userId)?.has(conversationId)||false);
  io.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token;if(!token)throw new Error('Authentication required');const claims=verifyAccessToken(token);const repository=getIdentityRepository();const [user,session]=await Promise.all([repository.findUserById(claims.sub),repository.findSessionById(claims.sid)]);if(!user||!session||session.revokedAt||new Date(session.expiresAt)<=new Date()||user.status!=='active'||(user.security?.tokenVersion||0)!==claims.ver)throw new Error('Session expired');socket.data.userId=String(user._id||user.id);socket.data.joined=new Set<string>();next()}catch{next(new Error('Authentication failed'))}});
  io.on('connection',(socket)=>{const userId=socket.data.userId as string;online.set(userId,(online.get(userId)||0)+1);socket.join(`user:${userId}`);socket.emit('system:ready',{realtime:true,features:['messages','typing','presence','notifications']});
    socket.on('conversation:join',async(payload,ack)=>{try{const id=String(payload?.conversationId||'');if(!await isConversationMember(userId,id))throw new Error('Conversation not found');socket.join(`conversation:${id}`);socket.data.joined.add(id);if(!active.has(userId))active.set(userId,new Set());active.get(userId)!.add(id);socket.to(`conversation:${id}`).emit('user:online',{userId});ack?.({ok:true})}catch(error:any){ack?.({ok:false,error:error.message})}});
    socket.on('conversation:leave',(payload)=>{const id=String(payload?.conversationId||'');socket.leave(`conversation:${id}`);socket.data.joined.delete(id);active.get(userId)?.delete(id)});
    socket.on('message:send',async(payload,ack)=>{try{const message=await sendMessage(userId,String(payload?.conversationId||''),payload?.message||{});if(online.has(message.receiverId))await markMessageDelivered(message.receiverId,message.id);ack?.({ok:true,data:message})}catch(error:any){ack?.({ok:false,error:error.message,code:error.code||'MESSAGE_FAILED'})}});
    socket.on('message:delivered',async(payload)=>{await markMessageDelivered(userId,String(payload?.messageId||''))});
    socket.on('message:read',async(payload,ack)=>{try{const data=await markConversationRead(userId,String(payload?.conversationId||''));ack?.({ok:true,data})}catch(error:any){ack?.({ok:false,error:error.message})}});
    for(const event of ['typing:start','typing:stop'])socket.on(event,async(payload)=>{const id=String(payload?.conversationId||'');if(await isConversationMember(userId,id))socket.to(`conversation:${id}`).emit(event,{conversationId:id,userId})});
    socket.on('disconnect',()=>{for(const id of socket.data.joined as Set<string>){active.get(userId)?.delete(id);socket.to(`conversation:${id}`).emit('user:offline',{userId})}const count=(online.get(userId)||1)-1;if(count<=0)online.delete(userId);else online.set(userId,count)});
  }); return io;
}

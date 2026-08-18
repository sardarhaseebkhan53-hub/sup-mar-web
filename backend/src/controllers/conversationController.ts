import { findOrCreateConversation } from '../services/conversationService.js';
export async function create(req,res) { res.status(201).json({ success: true, data: await findOrCreateConversation(req.auth.userId, req.params.id), message: 'Conversation ready' }); }

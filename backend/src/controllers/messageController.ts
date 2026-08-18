import { createMessageUploadIntent } from '../services/imageService.js';
import { getConversation, listConversations, listMessages, markConversationRead, reportConversation, sendMessage, setArchived, setBlocked } from '../services/messagingService.js';
export async function index(req,res){res.json({success:true,data:await listConversations(req.auth.userId,req.query)})}
export async function show(req,res){res.json({success:true,data:await getConversation(req.auth.userId,req.params.id)})}
export async function messages(req,res){res.json({success:true,data:await listMessages(req.auth.userId,req.params.id,req.query)})}
export async function send(req,res){res.status(201).json({success:true,data:await sendMessage(req.auth.userId,req.params.id,req.body)})}
export async function read(req,res){res.json({success:true,data:await markConversationRead(req.auth.userId,req.params.id)})}
export async function archive(req,res){res.json({success:true,data:await setArchived(req.auth.userId,req.params.id,req.body.archived)})}
export async function block(req,res){res.json({success:true,data:await setBlocked(req.auth.userId,req.params.id,req.body.blocked)})}
export async function report(req,res){res.status(201).json({success:true,data:await reportConversation(req.auth.userId,req.params.id,req.body)})}
export async function uploadIntent(req,res){res.json({success:true,data:createMessageUploadIntent(req.auth.userId,req.body)})}

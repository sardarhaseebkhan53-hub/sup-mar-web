import { listNotifications, readAllNotifications, readNotification } from '../services/messagingService.js';
export async function index(req,res){res.json({success:true,data:await listNotifications(req.auth.userId,Number(req.query.limit)||20)})}
export async function read(req,res){res.json({success:true,data:await readNotification(req.auth.userId,req.params.id)})}
export async function readAll(req,res){res.json({success:true,data:await readAllNotifications(req.auth.userId)})}

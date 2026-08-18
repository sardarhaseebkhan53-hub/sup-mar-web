import { createPayment, getPayment, processWebhook, verifyPayment } from '../services/paymentService.js';
export async function create(req,res){const result=await createPayment(req.auth.userId,req.body);res.status(201).json({success:true,data:result})}
export async function show(req,res){res.json({success:true,data:await getPayment(req.auth.userId,req.params.id)})}
export async function verify(req,res){res.json({success:true,data:await verifyPayment(req.auth.userId,req.params.id)})}
export async function webhook(req,res){res.json({success:true,data:await processWebhook(req.rawBody||JSON.stringify(req.body),req.get('x-qavlio-signature')||'')})}

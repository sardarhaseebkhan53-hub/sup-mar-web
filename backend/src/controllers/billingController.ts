import { getSellerPaymentDetail, listSellerPayments } from '../services/paymentService.js';
export async function index(req,res){res.json({success:true,data:await listSellerPayments(req.auth.userId,req.query)})}
export async function show(req,res){res.json({success:true,data:await getSellerPaymentDetail(req.auth.userId,req.params.id)})}

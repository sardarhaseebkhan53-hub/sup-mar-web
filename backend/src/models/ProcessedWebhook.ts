import mongoose from 'mongoose';
const schema=new mongoose.Schema<any>({eventId:{type:String,required:true,unique:true},provider:{type:String,required:true},paymentReference:String,processedAt:{type:Date,default:Date.now}},{timestamps:false});
export const ProcessedWebhook:mongoose.Model<any>=(mongoose.models.ProcessedWebhook as mongoose.Model<any>)||mongoose.model<any>('ProcessedWebhook',schema);

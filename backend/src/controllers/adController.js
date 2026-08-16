import mongoose from 'mongoose';
import { AdCampaign } from '../models/AdCampaign.js';

export async function readAdSlot(req, res) {
  let campaign = null;
  if (mongoose.connection.readyState === 1) {
    const now = new Date();
    campaign = await AdCampaign.findOne({ slotIds: req.params.slotId, status: 'active', startsAt: { $lte: now }, endsAt: { $gte: now } }).select('name creative slotIds').lean();
  }
  res.json({ success: true, data: { slotId: req.params.slotId, active: Boolean(campaign), campaign } });
}

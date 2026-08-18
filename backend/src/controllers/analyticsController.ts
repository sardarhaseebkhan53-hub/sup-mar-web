import { recordPromotionEvent } from '../services/promotionAnalyticsService.js';

export async function track(req, res) {
  const source = `${req.auth?.userId || 'guest'}:${req.ip}:${req.get('user-agent') || ''}:${req.body.clientId || ''}`;
  const data = await recordPromotionEvent(req.params.id, req.body.type, source, req.body.placement || 'organic');
  res.status(202).json({ success: true, data });
}

import { getTrustByUsername } from '../services/trustService.js';
import { AppError } from '../utils/AppError.js';

export async function show(req, res) {
  const data = await getTrustByUsername(req.params.username);
  if (!data) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');
  res.json({ success: true, data });
}

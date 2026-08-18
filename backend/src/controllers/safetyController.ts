import { getSafetyPage, listSafetyPages } from '../services/safetyPolicyService.js';
import { AppError } from '../utils/AppError.js';

export async function index(_req, res) {
  res.json({ success: true, data: listSafetyPages() });
}

export async function show(req, res) {
  const page = getSafetyPage(req.params.slug);
  if (!page) throw new AppError(404, 'Safety topic not found', 'SAFETY_NOT_FOUND');
  res.json({ success: true, data: page });
}

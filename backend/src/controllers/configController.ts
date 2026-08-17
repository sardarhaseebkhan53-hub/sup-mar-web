import { getPublicConfig } from '../services/configService.js';

export async function readPublicConfig(_req, res) {
  res.json({ success: true, data: await getPublicConfig() });
}

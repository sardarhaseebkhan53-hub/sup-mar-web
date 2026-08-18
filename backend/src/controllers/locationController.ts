import { listCities, listCountries, listRegions, resolveCoarseLocation, searchLocations } from '../services/locationService.js';

export async function countries(_req, res) { res.json({ success: true, data: listCountries() }); }
export async function regions(req, res) { res.json({ success: true, data: listRegions(String(req.query.country || 'PK')) }); }
export async function cities(req, res) { res.json({ success: true, data: listCities({ country: req.query.country as string, region: req.query.region as string }) }); }
export async function search(req, res) { res.json({ success: true, data: searchLocations(String(req.query.q || '')) }); }
export async function resolve(req, res) {
  const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;
  res.json({ success: true, data: resolveCoarseLocation({ city: req.query.city as string, lat, lng }) });
}

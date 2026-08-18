import { LOCATION_CITIES, LOCATION_COUNTRIES, LOCATION_REGIONS, findCityByName, nearestCity } from '../constants/locations.js';

export function listCountries() {
  return LOCATION_COUNTRIES;
}

export function listRegions(country = 'PK') {
  return LOCATION_REGIONS.filter((region) => region.country === country.toUpperCase());
}

export function listCities(input: { country?: string; region?: string } = {}) {
  return LOCATION_CITIES.filter((city) => {
    if (input.country && city.country !== input.country.toUpperCase()) return false;
    if (input.region && city.region.toLowerCase() !== input.region.toLowerCase() && city.region.toLowerCase().replace(/\s+/g, '-') !== input.region.toLowerCase()) return false;
    return true;
  }).map(({ slug, name, region, country, countryName }) => ({ slug, name, region, country, countryName }));
}

export function searchLocations(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return listCities().slice(0, 8);
  return LOCATION_CITIES.filter((city) => [city.name, city.region, city.slug].some((value) => value.toLowerCase().includes(needle)))
    .slice(0, 12)
    .map(({ slug, name, region, country, countryName }) => ({ slug, name, region, country, countryName }));
}

export function resolveCoarseLocation(input: { city?: string; lat?: number; lng?: number }) {
  if (input.city) {
    const city = findCityByName(input.city);
    if (city) return { city: city.name, region: city.region, country: city.country, source: 'manual' };
  }
  if (Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    const city = nearestCity(Number(input.lat), Number(input.lng));
    if (city) return { city: city.name, region: city.region, country: city.country, source: 'approximate' };
  }
  return null;
}

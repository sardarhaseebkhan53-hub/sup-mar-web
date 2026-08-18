export type LocationCity = {
  slug: string;
  name: string;
  region: string;
  country: string;
  countryName: string;
  lat: number;
  lng: number;
};

export const LOCATION_COUNTRIES = [{ code: 'PK', name: 'Pakistan' }];

export const LOCATION_REGIONS = [
  { country: 'PK', slug: 'islamabad-capital-territory', name: 'Islamabad Capital Territory' },
  { country: 'PK', slug: 'punjab', name: 'Punjab' },
  { country: 'PK', slug: 'sindh', name: 'Sindh' },
  { country: 'PK', slug: 'khyber-pakhtunkhwa', name: 'Khyber Pakhtunkhwa' },
  { country: 'PK', slug: 'balochistan', name: 'Balochistan' },
  { country: 'PK', slug: 'gilgit-baltistan', name: 'Gilgit-Baltistan' },
  { country: 'PK', slug: 'azad-jammu-kashmir', name: 'Azad Jammu and Kashmir' },
];

export const LOCATION_CITIES: LocationCity[] = [
  { slug: 'islamabad', name: 'Islamabad', region: 'Islamabad Capital Territory', country: 'PK', countryName: 'Pakistan', lat: 33.6844, lng: 73.0479 },
  { slug: 'rawalpindi', name: 'Rawalpindi', region: 'Punjab', country: 'PK', countryName: 'Pakistan', lat: 33.5651, lng: 73.0169 },
  { slug: 'lahore', name: 'Lahore', region: 'Punjab', country: 'PK', countryName: 'Pakistan', lat: 31.5204, lng: 74.3587 },
  { slug: 'karachi', name: 'Karachi', region: 'Sindh', country: 'PK', countryName: 'Pakistan', lat: 24.8607, lng: 67.0011 },
  { slug: 'faisalabad', name: 'Faisalabad', region: 'Punjab', country: 'PK', countryName: 'Pakistan', lat: 31.4504, lng: 73.135 },
  { slug: 'multan', name: 'Multan', region: 'Punjab', country: 'PK', countryName: 'Pakistan', lat: 30.1575, lng: 71.5249 },
  { slug: 'gujranwala', name: 'Gujranwala', region: 'Punjab', country: 'PK', countryName: 'Pakistan', lat: 32.1877, lng: 74.1945 },
  { slug: 'sialkot', name: 'Sialkot', region: 'Punjab', country: 'PK', countryName: 'Pakistan', lat: 32.4945, lng: 74.5229 },
  { slug: 'peshawar', name: 'Peshawar', region: 'Khyber Pakhtunkhwa', country: 'PK', countryName: 'Pakistan', lat: 34.0151, lng: 71.5249 },
  { slug: 'quetta', name: 'Quetta', region: 'Balochistan', country: 'PK', countryName: 'Pakistan', lat: 30.1798, lng: 66.975 },
  { slug: 'hyderabad', name: 'Hyderabad', region: 'Sindh', country: 'PK', countryName: 'Pakistan', lat: 25.396, lng: 68.3578 },
  { slug: 'sukkur', name: 'Sukkur', region: 'Sindh', country: 'PK', countryName: 'Pakistan', lat: 27.7052, lng: 68.8574 },
  { slug: 'abbottabad', name: 'Abbottabad', region: 'Khyber Pakhtunkhwa', country: 'PK', countryName: 'Pakistan', lat: 34.1688, lng: 73.2215 },
  { slug: 'muzaffarabad', name: 'Muzaffarabad', region: 'Azad Jammu and Kashmir', country: 'PK', countryName: 'Pakistan', lat: 34.3706, lng: 73.4711 },
  { slug: 'gilgit', name: 'Gilgit', region: 'Gilgit-Baltistan', country: 'PK', countryName: 'Pakistan', lat: 35.9208, lng: 74.308 },
];

export function findCityByName(value?: string | null) {
  if (!value) return null;
  const needle = value.trim().toLowerCase();
  return LOCATION_CITIES.find((city) => city.name.toLowerCase() === needle || city.slug === needle) || null;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearestCity(lat: number, lng: number) {
  return [...LOCATION_CITIES].sort((a, b) => haversineKm({ lat, lng }, a) - haversineKm({ lat, lng }, b))[0] || null;
}

export function citiesWithin(cityName: string, radiusKm: number) {
  const origin = findCityByName(cityName);
  if (!origin) return [];
  return LOCATION_CITIES.filter((city) => haversineKm(origin, city) <= radiusKm).map((city) => city.name);
}

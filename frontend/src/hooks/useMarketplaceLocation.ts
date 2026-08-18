import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { locationApi } from '../services/apiClient';
import type { LocationCity } from '../types/discovery';

const KEY = 'qavlio-city';

export function useMarketplaceLocation() {
  const [city, setCityState] = useState(() => localStorage.getItem(KEY) || 'Rawalpindi');
  const cities = useQuery({ queryKey: ['location-cities'], queryFn: async () => (await locationApi.cities()).data as LocationCity[], staleTime: 60 * 60_000 });
  const setCity = useCallback((value: string) => {
    const next = value === 'All Pakistan' ? '' : value;
    setCityState(next || 'All Pakistan');
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  }, []);
  const clear = useCallback(() => setCity('All Pakistan'), [setCity]);
  const useApproximate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      const params = new URLSearchParams({ lat: String(position.coords.latitude), lng: String(position.coords.longitude) });
      const resolved = await locationApi.resolve(params);
      if (resolved.data?.city) setCity(resolved.data.city);
    }, () => undefined, { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 });
  }, [setCity]);
  useEffect(() => { const stored = localStorage.getItem(KEY); if (stored) setCityState(stored); }, []);
  return { city: city === 'All Pakistan' ? '' : city, label: city || 'All Pakistan', setCity, clear, useApproximate, cities: cities.data || [] };
}

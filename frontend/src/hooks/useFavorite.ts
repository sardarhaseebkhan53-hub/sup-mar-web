import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { listingApi } from '../services/apiClient';

const GUEST_KEY = 'qavlio-guest-favorites';

function readGuest(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function guestFavoriteIds() { return readGuest(); }

export function listingSharePath(listing: { slug?: string; publicId?: string; id?: string }) {
  const id = String(listing.publicId || listing.id || '').toLowerCase();
  const slug = listing.slug || 'listing';
  return `/listing/${slug}-${id}`;
}

export function useFavorite(listingId: string, title = 'listing') {
  const { user } = useAuth();
  const client = useQueryClient();
  const [guestIds, setGuestIds] = useState(readGuest);
  const query = useQuery({ queryKey: ['favorite', listingId], enabled: Boolean(user && listingId), queryFn: async () => (await listingApi.favoriteStatus(listingId)).data });
  const saved = user ? Boolean(query.data?.saved) : guestIds.includes(listingId);
  const mutation = useMutation({
    mutationFn: async () => (saved ? listingApi.unfavorite(listingId) : listingApi.favorite(listingId)),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: ['favorite', listingId] });
      const previous = client.getQueryData(['favorite', listingId]);
      client.setQueryData(['favorite', listingId], { saved: !saved });
      return { previous };
    },
    onError: (_error, _vars, context) => { if (context?.previous) client.setQueryData(['favorite', listingId], context.previous); },
    onSettled: async () => { await client.invalidateQueries({ queryKey: ['favorites'] }); await client.invalidateQueries({ queryKey: ['favorite', listingId] }); },
  });

  const toggle = useCallback((event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!listingId) return;
    if (!user) {
      setGuestIds((current) => {
        const next = current.includes(listingId) ? current.filter((id) => id !== listingId) : [...current, listingId];
        localStorage.setItem(GUEST_KEY, JSON.stringify([...new Set(next)].slice(0, 40)));
        return next;
      });
      return;
    }
    mutation.mutate();
  }, [listingId, mutation, user]);

  return {
    saved,
    toggle,
    pending: mutation.isPending,
    guest: !user,
    label: saved ? `Remove ${title} from favorites` : `Save ${title} to favorites`,
    priceAlertEnabled: Boolean(query.data?.priceAlertEnabled),
  };
}

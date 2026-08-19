import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { guestFavoriteIds } from '../../hooks/useFavorite';
import { listingApi } from '../../services/apiClient';

export default function FavoriteMergeBanner() {
  const { user } = useAuth();
  const [ids] = useState(() => guestFavoriteIds());
  const [open, setOpen] = useState(ids.length > 0);
  const [busy, setBusy] = useState(false);
  if (!user || !open || !ids.length) return null;
  return <div className="border-b border-violet-100 bg-violet-50">
    <div className="container-shell flex flex-wrap items-center gap-3 py-3">
      <p className="me-auto text-xs font-bold text-violet-900">Save your favorites to your QAVLIO account?</p>
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await listingApi.mergeFavorites(ids); localStorage.removeItem('qavlio-guest-favorites'); setOpen(false); } finally { setBusy(false); } }} className="h-9 rounded-control bg-violet-600 px-3 text-[11px] font-extrabold text-white">Save to account</button>
      <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-control px-3 text-[11px] font-extrabold text-violet-800">Not now</button>
    </div>
  </div>;
}

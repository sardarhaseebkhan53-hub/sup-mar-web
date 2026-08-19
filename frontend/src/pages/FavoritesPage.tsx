import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FavoriteButton from '../components/discovery/FavoriteButton';
import ShareButton from '../components/discovery/ShareButton';
import { listingApi } from '../services/apiClient';
import { listingSharePath } from '../hooks/useFavorite';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice } from '../utils/formatters';

export default function FavoritesPage() {
  useDocumentTitle('Favorites');
  const client = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({ queryKey: ['favorites'], queryFn: async () => (await listingApi.favorites()).data });
  const remove = useMutation({ mutationFn: (ids: string[]) => listingApi.bulkUnfavorite(ids), onSuccess: async () => { setSelected([]); setConfirm(false); await client.invalidateQueries({ queryKey: ['favorites'] }); } });
  const listings = query.data?.listings || [];
  return <main className="container-shell py-10">
    <header><p className="eyebrow">Private to your account</p><h1 className="mt-2 text-3xl font-extrabold">Saved Listings</h1><p className="mt-2 text-sm text-slate-500">Everything you saved, ready when you are.</p></header>
    {query.isLoading ? <div className="mt-7 grid gap-4 min-[520px]:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-panel bg-slate-200" />)}</div>
      : query.isError ? <div className="mt-7 rounded-panel border bg-white p-10 text-center"><h2 className="font-extrabold">We couldn't load your favorites.</h2><button type="button" onClick={() => query.refetch()} className="mt-4 rounded-control bg-violet-600 px-4 py-2 text-xs font-extrabold text-white">Retry</button></div>
      : !listings.length ? <div className="mt-7 rounded-panel border border-dashed bg-white p-12 text-center"><Heart className="mx-auto text-rose-500" size={36} /><h2 className="mt-4 text-xl font-extrabold">You haven't saved anything yet.</h2><p className="mt-2 text-sm text-slate-500">Tap the heart on a listing to keep it here.</p><Link to="/marketplace" className="mt-5 inline-flex rounded-control bg-violet-600 px-5 py-3 text-xs font-extrabold text-white">Explore Listings</Link></div>
      : <>
        {selected.length > 0 && <div className="mt-5 flex flex-wrap items-center gap-2 rounded-card border bg-white p-3"><p className="me-auto text-xs font-bold">{selected.length} selected</p><button type="button" onClick={() => setConfirm(true)} className="rounded-control bg-rose-600 px-3 py-2 text-xs font-extrabold text-white">Remove selected</button></div>}
        <div className="mt-7 grid gap-4 min-[520px]:grid-cols-2 lg:grid-cols-4">
          {listings.map((item: any) => <article key={item.publicId} className="overflow-hidden rounded-card border bg-white shadow-sm">
            <div className="relative aspect-[4/3] bg-slate-100">
              <Link to={listingSharePath(item)}>{(item.coverImage || item.media?.[0]?.url) && <img src={item.coverImage || item.media[0].url} alt="" className="h-full w-full object-cover" />}</Link>
              <label className="absolute start-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95"><span className="sr-only">Select {item.title}</span><input type="checkbox" checked={selected.includes(item.publicId)} onChange={() => setSelected((current) => current.includes(item.publicId) ? current.filter((id) => id !== item.publicId) : [...current, item.publicId])} /></label>
              <FavoriteButton id={item.publicId} title={item.title} compact className="!absolute end-2 top-2 !h-9 !w-9 !px-0" />
            </div>
            <div className="p-4">
              <p className="text-[10px] font-extrabold uppercase text-violet-600">{item.unavailable ? 'Listing unavailable' : item.condition}</p>
              <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-extrabold"><Link to={listingSharePath(item)}>{item.title}</Link></h2>
              <p className="mt-2 font-extrabold">{formatPrice(Number(item.price), 'PKR')}</p>
              <p className="mt-2 text-[11px] text-slate-500">{item.location?.city || 'Pakistan'}{item.sellerName ? ` · ${item.sellerName}` : ''}</p>
              <p className="mt-1 text-[10px] text-slate-400">Saved {item.savedAt ? new Date(item.savedAt).toLocaleDateString() : ''}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={listingSharePath(item)} className="grid h-9 place-items-center rounded-control bg-ink-950 px-3 text-[11px] font-extrabold text-white">Open</Link>
                <button type="button" onClick={() => remove.mutate([item.publicId])} className="h-9 rounded-control border px-3 text-[11px] font-extrabold">Remove</button>
                <ShareButton title={item.title} listing={item} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-600"><input type="checkbox" checked={Boolean(item.priceAlertEnabled)} onChange={(event) => { void listingApi.favoritePriceAlert(item.publicId, event.target.checked).then(() => client.invalidateQueries({ queryKey: ['favorites'] })); }} /> Alert me if price changes.</label>
            </div>
          </article>)}
        </div>
      </>}
    <ConfirmDialog open={confirm} title="Remove selected listings?" description="These listings will leave your saved list. You can save them again later." confirmationLabel="" confirmationValue="" onConfirmationChange={() => undefined} confirmText="Remove selected" onCancel={() => setConfirm(false)} onConfirm={() => remove.mutate(selected)} busy={remove.isPending}>{null}</ConfirmDialog>
  </main>;
}

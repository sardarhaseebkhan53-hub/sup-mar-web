import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import SavedSearchModal from '../components/discovery/SavedSearchModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buyerApi } from '../services/apiClient';
import type { SavedSearch } from '../types/discovery';

function searchHref(item: SavedSearch) {
  const params = new URLSearchParams();
  if (item.query) params.set('q', item.query);
  if (item.categoryId) params.set('category', item.categoryId);
  if (item.location) params.set('location', item.location);
  if (item.minPrice != null) params.set('minPrice', String(item.minPrice));
  if (item.maxPrice != null) params.set('maxPrice', String(item.maxPrice));
  if (item.condition) params.set('condition', item.condition);
  if (item.sort) params.set('sort', item.sort);
  return `/search?${params.toString()}`;
}

export default function SavedSearchesPage() {
  useDocumentTitle('Saved searches');
  const client = useQueryClient();
  const [edit, setEdit] = useState<SavedSearch | null>(null);
  const query = useQuery({ queryKey: ['saved-searches'], queryFn: async () => (await buyerApi.savedSearches()).data as SavedSearch[] });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: unknown }) => buyerApi.updateSavedSearch(id, data), onSuccess: () => client.invalidateQueries({ queryKey: ['saved-searches'] }) });
  const remove = useMutation({ mutationFn: (id: string) => buyerApi.deleteSavedSearch(id), onSuccess: () => client.invalidateQueries({ queryKey: ['saved-searches'] }) });
  return <main className="container-shell py-10">
    <header><p className="eyebrow">Discovery</p><h1 className="mt-2 text-3xl font-extrabold">Saved searches</h1><p className="mt-2 text-sm text-slate-500">Keep useful QAVLIO searches and choose how often you are notified.</p></header>
    <div className="mt-7">{query.isLoading ? <div className="h-40 animate-pulse rounded-panel bg-slate-200" /> : !query.data?.length ? <div className="rounded-panel border border-dashed bg-white p-10 text-center"><Search className="mx-auto text-violet-600" /><h2 className="mt-3 font-extrabold">No saved searches yet.</h2><p className="mt-2 text-sm text-slate-500">Use Save Search from marketplace results.</p><Link to="/marketplace" className="mt-4 inline-flex rounded-control bg-violet-600 px-4 py-2 text-xs font-extrabold text-white">Explore listings</Link></div>
      : <div className="grid gap-3">{query.data.map((item) => <article key={item.id} className="rounded-card border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><h2 className="font-extrabold">{item.name}</h2><p className="mt-1 text-xs text-slate-500">{item.query || 'Any keyword'}{item.location ? ` · ${item.location}` : ''}{item.maxPrice != null ? ` · under Rs. ${item.maxPrice.toLocaleString()}` : ''}</p><p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500"><Bell size={12} />{item.alertEnabled ? `${item.alertFrequency} alerts` : 'Alerts off'}</p></div><div className="flex flex-wrap gap-2"><Link to={searchHref(item)} className="grid h-9 place-items-center rounded-control bg-violet-600 px-3 text-[11px] font-extrabold text-white">View Listings</Link><button type="button" onClick={() => setEdit(item)} className="h-9 rounded-control border px-3 text-[11px] font-extrabold">Edit</button><button type="button" onClick={() => update.mutate({ id: item.id, data: { alertEnabled: !item.alertEnabled } })} className="h-9 rounded-control border px-3 text-[11px] font-extrabold">{item.alertEnabled ? 'Disable alert' : 'Enable alert'}</button><button type="button" onClick={() => remove.mutate(item.id)} className="h-9 rounded-control px-3 text-[11px] font-extrabold text-rose-600">Delete</button></div></div></article>)}</div>}</div>
    {edit && <SavedSearchModal open onClose={() => setEdit(null)} initial={edit} onSave={async (input) => { await update.mutateAsync({ id: edit.id, data: input }); }} />}
  </main>;
}

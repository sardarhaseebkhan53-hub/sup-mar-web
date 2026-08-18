import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { buyerApi } from '../../services/apiClient';
import type { RecentSearchItem } from '../../types/discovery';

export default function RecentSearches() {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['recent-searches'], enabled: Boolean(user), queryFn: async () => (await buyerApi.recentSearches()).data as RecentSearchItem[] });
  const remove = useMutation({ mutationFn: (id: string) => buyerApi.removeRecentSearch(id), onSuccess: () => client.invalidateQueries({ queryKey: ['recent-searches'] }) });
  const clear = useMutation({ mutationFn: () => buyerApi.clearRecentSearches(), onSuccess: () => client.invalidateQueries({ queryKey: ['recent-searches'] }) });
  const items = query.data || [];
  if (!user || !items.length) return null;
  return <section className="rounded-card border bg-white p-4">
    <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Recent Searches</h2><button type="button" onClick={() => clear.mutate()} className="text-[11px] font-extrabold text-slate-500">Clear all</button></div>
    <ul className="mt-3 space-y-1">{items.map((item) => <li key={item.id} className="flex items-center gap-2"><Link to={`/search?q=${encodeURIComponent(item.query)}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold hover:bg-slate-50"><Clock3 size={13} className="text-slate-400" /><span className="truncate">{item.query}</span></Link><button type="button" aria-label={`Remove ${item.query}`} onClick={() => remove.mutate(item.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button></li>)}</ul>
  </section>;
}

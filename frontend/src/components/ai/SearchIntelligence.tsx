import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { aiApi } from '../../services/apiClient';

export default function SearchIntelligence({ query }: { query?: string }) {
  const [, setParams] = useSearchParams();
  const enabled = Boolean(query && query.trim().length > 2);
  const result = useQuery({ queryKey: ['ai-search-interpret', query], enabled, queryFn: async () => (await aiApi.search(query!)).data, staleTime: 30_000 });
  if (!enabled || result.isError) return null;
  const data = result.data;
  const chips = (data?.suggestions || []).filter((item: unknown) => typeof item === 'object');
  return <div className="mb-4 rounded-card border border-violet-100 bg-violet-50/70 p-3 sm:p-4">
    <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-violet-700"><Sparkles size={13} /> Smart search</p>
    {result.isLoading ? <p className="mt-2 text-xs font-semibold text-slate-500">QAVLIO is thinking...</p> : <>
      {data?.interpreted?.length > 0 && <p className="mt-2 text-xs font-semibold text-slate-600">{data.interpreted.join(' · ')}</p>}
      {typeof data?.total === 'number' && <p className="mt-1 text-sm font-extrabold text-ink-900">Here are {data.total} matching listings.</p>}
      {data?.empty && <p className="mt-1 text-sm font-extrabold">I couldn&apos;t find a matching listing right now.</p>}
      {chips.length > 0 && <div className="mt-3">
        <p className="text-[11px] font-bold text-slate-500">Would you like to narrow this to:</p>
        <div className="mt-2 flex flex-wrap gap-2">{chips.map((chip: { label: string; payload: Record<string, string> }) => <button key={chip.label} type="button" onClick={() => setParams((current) => { const next = new URLSearchParams(current); Object.entries(chip.payload).forEach(([key, value]) => next.set(key, value)); next.delete('page'); return next; })} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200">{chip.label}</button>)}</div>
      </div>}
    </>}
  </div>;
}

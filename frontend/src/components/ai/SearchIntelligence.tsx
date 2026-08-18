import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { aiApi } from '../../services/apiClient';
import AISearchExplanation from './AISearchExplanation';
import AISearchFilters from './AISearchFilters';

/**
 * Smart search layer for the marketplace results page. Loads asynchronously so normal
 * browsing is never blocked (§47); every AI-extracted filter stays user-adjustable.
 */
export default function SearchIntelligence({ query }: { query?: string }) {
  const [params] = useSearchParams();
  const aiExplicit = params.get('ai') === '1';
  const enabled = Boolean(query && query.trim().length > 2);
  const result = useQuery({
    queryKey: ['ai-search-interpret', query],
    enabled,
    queryFn: async () => (await aiApi.search(query!)).data,
    staleTime: 30_000,
  });

  if (!enabled) return null;
  const data = result.data;
  const error = result.isError;

  return (
    <div className={`mb-4 rounded-card border p-3 sm:p-4 ${error ? 'hidden' : 'border-violet-100 bg-violet-50/70'}`} role="region" aria-label="Smart search insights">
      <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-violet-700">
        <Sparkles size={13} aria-hidden="true" /> Smart search
        {aiExplicit && <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] text-white">AI mode</span>}
      </p>
      <div className="mt-2">
        {result.isLoading
          ? <p role="status" className="text-xs font-semibold text-slate-500">QAVLIO is thinking…</p>
          : <AISearchExplanation data={data} />}
      </div>
      {data?.appliedFilters && data.appliedFilters.length > 0 && !data.empty && <AISearchFilters filters={data.appliedFilters} />}
      {!data?.empty && Array.isArray(data?.suggestions) && (data.suggestions || []).some((item: unknown) => typeof item === 'object') && (
        <div className="mt-3">
          <p className="text-[11px] font-bold text-slate-500">Narrow this search:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(data.suggestions || []).filter((item: unknown): item is { label: string; payload: Record<string, string> } => typeof item === 'object').map((chip: { label: string; payload: Record<string, string> }) => (
              <button key={chip.label} type="button" onClick={() => setParams(chip.payload)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100">{chip.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  function setParams(payload: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(payload).forEach(([key, value]) => next.set(key, value));
    next.delete('page');
    window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

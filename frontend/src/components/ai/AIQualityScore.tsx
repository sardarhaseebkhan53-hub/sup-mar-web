import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../../services/apiClient';
import type { AiQualityData } from '../../types/ai';
import AIUsageIndicator from './AIUsageIndicator';

/**
 * AIQualityScore (§38–39) — 0–100 listing completeness score with actionable suggestions.
 * Explicitly NOT a trust score.
 */
export default function AIQualityScore({ input, enabled = true }: { input: { title?: string; description?: string; category?: string; subcategory?: string; condition?: string; price?: number; imageCount?: number; attributes?: Record<string, unknown> }; enabled?: boolean }) {
  const hasInput = Boolean(input.title || input.description || input.category || input.imageCount);
  const query = useQuery({
    queryKey: ['ai-quality', input.title, input.description?.slice(0, 80), input.category, input.imageCount, Object.keys(input.attributes || {}).length],
    enabled: enabled && hasInput,
    staleTime: 30_000,
    queryFn: async () => (await aiApi.listingQuality(input)).data as AiQualityData,
  });

  if (query.isError) return null;
  const data = query.data;
  const tone = !data ? 'text-slate-400' : data.score >= 75 ? 'text-emerald-600' : data.score >= 50 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="rounded-card bg-white p-3 ring-1 ring-ink-900/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Listing quality</p>
        <AIUsageIndicator tone="suggestion" />
      </div>
      {query.isLoading || !data ? <p role="status" className="mt-2 text-xs font-semibold text-slate-500">Scoring your draft…</p> : (
        <>
          <p className="mt-2 flex items-baseline gap-1 text-xs font-semibold text-slate-500">
            <span className={`text-2xl font-extrabold ${tone}`}>{data.score}</span>
            <span>/100 · listing quality — not a trust score</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={data.score} aria-valuemin={0} aria-valuemax={100} aria-label="Listing quality score">
            <div className={`h-full ${data.score >= 75 ? 'bg-emerald-500' : data.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${data.score}%` }} />
          </div>
          <ul className="mt-3 space-y-1 text-[11px] font-semibold text-slate-600">
            {data.breakdown.map((part) => (
              <li key={part.key} className="flex items-center justify-between gap-2">
                <span>{part.label}{part.note ? <span className="text-slate-400"> · {part.note}</span> : null}</span>
                <span className="font-extrabold text-ink-800">{part.score}/{part.max}</span>
              </li>
            ))}
          </ul>
          {data.suggestions.length ? (
            <div className="mt-3 rounded-control bg-violet-50 p-2.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">Improve your listing</p>
              <ul className="mt-1 space-y-1 text-[11px] font-semibold text-violet-900">
                {data.suggestions.map((suggestion) => <li key={suggestion}>· {suggestion}</li>)}
              </ul>
            </div>
          ) : null}
          <p className="mt-2 text-[10px] font-semibold text-slate-400">{data.disclaimer}</p>
        </>
      )}
    </div>
  );
}

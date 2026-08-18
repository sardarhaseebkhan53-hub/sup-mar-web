import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../../services/apiClient';
import type { AiPriceInsightData } from '../../types/ai';
import AIUsageIndicator from './AIUsageIndicator';

const pkr = (value?: number) => (value === undefined ? '' : `Rs. ${value.toLocaleString('en-PK')}`);

/**
 * AIPriceInsight (§36–37) — ranges from comparable real QAVLIO listings only.
 * Honest "not enough data" state; never claims market value or guarantees.
 */
export default function AIPriceInsight({ category, attributes, price, enabled = true }: { category?: string; attributes?: Record<string, unknown>; price?: number; enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['ai-price-insight', category, JSON.stringify(attributes || {}), price],
    enabled: enabled && Boolean(category),
    staleTime: 120_000,
    queryFn: async () => (await aiApi.listingPriceInsight({ category, attributes, price })).data as AiPriceInsightData,
  });

  if (!category || query.isError) return null;
  const data = query.data;

  return (
    <div className="rounded-card bg-white p-3 ring-1 ring-ink-900/5" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Price insight</p>
        {data && <AIUsageIndicator tone="data" />}
      </div>
      {query.isLoading ? <p role="status" className="mt-2 text-xs font-semibold text-slate-500">Checking comparable QAVLIO listings…</p> : data && (
        data.available ? (
          <div className="mt-2 space-y-1.5 text-xs font-semibold text-ink-800">
            <p>Similar listings are commonly listed between <span className="font-extrabold">{pkr(data.typicalRange?.lower ?? data.min)}</span> and <span className="font-extrabold">{pkr(data.typicalRange?.upper ?? data.max)}</span>.</p>
            <p className="text-slate-500">Median ask: {pkr(data.median)} · {data.comparables} comparable listing{data.comparables === 1 ? '' : 's'}</p>
            {data.stance && price !== undefined && <p className="text-violet-800">Your price of {pkr(price)} is {data.stance}.</p>}
            <p className="text-[10px] font-semibold text-slate-400">{data.disclaimer} {data.source}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-slate-500">{data.note || 'Not enough comparable QAVLIO listings to estimate this reliably.'}</p>
        )
      )}
    </div>
  );
}

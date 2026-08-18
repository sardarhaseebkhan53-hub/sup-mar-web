import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { aiApi } from '../../services/apiClient';
import type { AiPriceInsightResult } from '../../types/ai';
import { formatPrice } from '../../utils/formatters';

interface Props {
  category?: string;
  subcategory?: string;
  condition?: string;
  price?: string;
  attributes?: Record<string, string | number | boolean>;
  city?: string;
}

/**
 * Price guidance computed from real QAVLIO listings only. When there is not
 * enough comparable inventory the component says so rather than estimating.
 */
export default function AIPriceInsight({ category, subcategory, condition, price, attributes, city }: Props) {
  const numericPrice = price ? Number(price) : undefined;
  const query = useQuery({
    queryKey: ['ai-price-insight', category, subcategory, condition, numericPrice, city],
    enabled: Boolean(category),
    staleTime: 120_000,
    queryFn: async () => (await aiApi.priceInsight({
      category,
      subcategory,
      condition,
      price: numericPrice,
      location: city ? { city } : undefined,
      attributes,
    })).data as AiPriceInsightResult,
  });

  if (!category || query.isError) return null;
  const data = query.data;

  return (
    <div className="rounded-card border border-slate-200 bg-white p-3 sm:p-4" role="region" aria-label="Price insight from QAVLIO listings">
      <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-slate-500">
        <TrendingUp size={13} aria-hidden="true" /> Price insight
      </p>

      {query.isLoading && <p className="mt-2 text-xs text-slate-500">Checking comparable QAVLIO listings…</p>}

      {data && !data.available && (
        <>
          <p className="mt-2 text-xs font-semibold text-ink-800">{data.message}</p>
          <p className="mt-1 text-[10px] text-slate-400">{data.note}</p>
        </>
      )}

      {data?.available && (
        <>
          <p className="mt-2 text-sm font-extrabold text-ink-900">
            {formatPrice(data.low || 0, 'PKR')} – {formatPrice(data.high || 0, 'PKR')}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{data.message}</p>

          <div className="mt-3" aria-hidden="true">
            <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-200 via-violet-200 to-amber-200">
              {numericPrice && data.min !== undefined && data.max !== undefined && data.max > data.min && (
                <span
                  className="absolute -top-1 h-4 w-1 rounded-full bg-ink-900"
                  style={{ left: `${Math.min(100, Math.max(0, ((numericPrice - data.min) / (data.max - data.min)) * 100))}%` }}
                />
              )}
            </div>
            <div className="mt-1 flex justify-between text-[9px] font-bold text-slate-400">
              <span>{formatPrice(data.min || 0, 'PKR')}</span>
              <span>Median {formatPrice(data.median || 0, 'PKR')}</span>
              <span>{formatPrice(data.max || 0, 'PKR')}</span>
            </div>
          </div>

          {data.positionMessage && (
            <p className={`mt-2 text-[11px] font-extrabold ${data.position === 'within' ? 'text-emerald-700' : 'text-amber-800'}`}>{data.positionMessage}</p>
          )}

          <p className="mt-2 text-[10px] font-bold text-slate-400">{data.label} · {data.note}</p>
        </>
      )}
    </div>
  );
}

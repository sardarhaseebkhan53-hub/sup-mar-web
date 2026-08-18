import { useQuery } from '@tanstack/react-query';
import { Gauge, ShieldAlert } from 'lucide-react';
import { aiApi } from '../../services/apiClient';
import type { AiQualityResult } from '../../types/ai';

interface Props {
  title: string;
  description: string;
  category?: string;
  subcategory?: string;
  images?: number;
  attributes?: Record<string, string | number | boolean>;
  price?: string;
  condition?: string;
  city?: string;
  area?: string;
}

/**
 * Listing completeness score. Explicitly labelled as NOT a trust score so sellers
 * and buyers never mistake it for verification or reputation.
 */
export default function AIQualityScore({ title, description, category, subcategory, images, attributes, price, condition, city, area }: Props) {
  const query = useQuery({
    queryKey: ['ai-listing-quality', title, description, category, subcategory, images, price, condition, city, JSON.stringify(attributes || {})],
    enabled: Boolean(title.trim() || description.trim()),
    staleTime: 30_000,
    queryFn: async () => (await aiApi.listingQuality({
      title,
      description,
      category,
      subcategory,
      images,
      attributes,
      price: price ? Number(price) : undefined,
      condition,
      location: city || area ? { city, area } : undefined,
    })).data as AiQualityResult,
  });

  const data = query.data;
  if (query.isError) return null;

  const tone = !data ? 'text-slate-400' : data.score >= 85 ? 'text-emerald-600' : data.score >= 70 ? 'text-violet-600' : data.score >= 50 ? 'text-amber-600' : 'text-rose-600';
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="rounded-card border border-slate-200 bg-white p-3 sm:p-4" role="region" aria-label="Listing quality score">
      <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-slate-500">
        <Gauge size={13} aria-hidden="true" /> Listing quality
      </p>

      {query.isLoading && <p className="mt-2 text-xs text-slate-500">Scoring your listing…</p>}

      {data && (
        <>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
                <circle
                  cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                  className={tone}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - data.score / 100)}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <span className={`absolute inset-0 grid place-items-center text-sm font-extrabold ${tone}`}>{data.score}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-ink-900">{data.score}/100 · {data.grade}</p>
              <p className="text-[11px] text-slate-500">Completeness of the information you provided.</p>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5">
            {data.breakdown.map((item) => (
              <li key={item.id}>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>{item.label}</span>
                  <span>{item.earned}/{item.weight}</span>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-slate-100" role="progressbar" aria-valuenow={item.earned} aria-valuemin={0} aria-valuemax={item.weight} aria-label={item.label}>
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round((item.earned / item.weight) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>

          {data.improvements.length > 0 && (
            <div className="mt-3 rounded-card bg-slate-50 p-2.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">How to improve</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
                {data.improvements.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[10px] font-semibold text-slate-400">
            <ShieldAlert size={11} className="mt-0.5 shrink-0" aria-hidden="true" /> {data.disclaimer}
          </p>
        </>
      )}

      <span className="sr-only" role="status" aria-live="polite">{query.isLoading ? 'Calculating listing quality' : data ? `Listing quality ${data.score} out of 100` : ''}</span>
    </div>
  );
}

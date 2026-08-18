import { Info } from 'lucide-react';
import type { AiListing } from '../../types/ai';
import RecommendationCard from './RecommendationCard';

interface Props {
  title: string;
  basis?: string;
  listings: AiListing[];
  loading?: boolean;
  personalized?: boolean;
  limit?: number;
  eyebrow?: string;
}

/**
 * A homepage/discovery recommendation row. When personalisation signals are weak
 * the caller supplies a non-personalised title (e.g. "Popular Near You") so we
 * never claim results were picked specifically for the user.
 */
export default function RecommendationSection({ title, basis, listings, loading, personalized, limit = 4, eyebrow }: Props) {
  if (!loading && !listings.length) return null;
  const headingId = `rec-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section aria-labelledby={headingId} className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          {eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-600">{eyebrow}</p>}
          <h2 id={headingId} className="mt-0.5 text-lg font-extrabold text-ink-900 sm:text-xl">{title}</h2>
          {basis && <p className="mt-1 max-w-2xl text-xs text-slate-500">{basis}</p>}
        </div>
        {personalized === false && (
          <p className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Info size={11} aria-hidden="true" /> Not personalised
          </p>
        )}
      </div>

      {loading ? (
        <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: limit }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-card bg-slate-200" />)}
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {listings.slice(0, limit).map((listing) => (
            <li key={listing.publicId}><RecommendationCard listing={listing} /></li>
          ))}
        </ul>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {loading ? `Loading ${title}` : `${Math.min(listings.length, limit)} listings in ${title}`}
      </span>
    </section>
  );
}

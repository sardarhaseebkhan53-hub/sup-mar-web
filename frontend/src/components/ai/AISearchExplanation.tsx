import { ArrowRight, SearchX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AiSearchResult, SearchCorrection } from '../../types/ai';
import AIUsageIndicator from './AIUsageIndicator';

/**
 * AISearchExplanation (§54, §10, §12) — transparency for AI search:
 * "Showing N listings matching: …", Did-you-mean corrections, and zero-result recovery
 * built from real categories, searches, prices, and cities.
 */
export default function AISearchExplanation({ data, loading }: { data?: AiSearchResult; loading?: boolean }) {
  const [, setParams] = useSearchParams();

  if (loading) {
    return <p role="status" className="flex items-center gap-2 text-xs font-bold text-violet-700"><AIUsageIndicator processing /> Reading your search…</p>;
  }
  if (!data) return null;

  const correction: SearchCorrection | null = data.correction || null;

  const applyCorrection = () => {
    if (!correction) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('q', correction.suggestion);
      next.delete('page');
      return next;
    });
  };

  if (data.empty) {
    const zero = data.zeroResult;
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50/70 p-4">
        <p className="flex items-center gap-2 text-sm font-extrabold text-amber-900"><SearchX size={16} aria-hidden="true" /> No exact matches found.</p>
        {zero?.relatedCategories?.length ? (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-amber-800">Related categories with listings:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {zero.relatedCategories.map((category) => (
                <Link key={category.slug} to={category.href} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-ink-800 ring-1 ring-amber-200 hover:bg-amber-100">{category.name}<ArrowRight size={11} aria-hidden="true" /></Link>
              ))}
            </div>
          </div>
        ) : null}
        {zero?.similarSearches?.length ? (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-amber-800">Similar searches with results:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {zero.similarSearches.map((term) => (
                <Link key={term} to={`/search?q=${encodeURIComponent(term)}`} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-ink-800 ring-1 ring-amber-200 hover:bg-amber-100">{term}</Link>
              ))}
            </div>
          </div>
        ) : null}
        {zero?.broaderPrice && <p className="mt-3"><Link to={zero.broaderPrice.href} className="text-[11px] font-extrabold text-amber-900 underline">{zero.broaderPrice.label}</Link></p>}
        {zero?.nearbyLocations?.length ? (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-amber-800">Nearby locations with matches:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {zero.nearbyLocations.map((location) => (
                <Link key={location.href} to={location.href} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-ink-800 ring-1 ring-amber-200 hover:bg-amber-100">{location.label}</Link>
              ))}
            </div>
          </div>
        ) : null}
        <p className="mt-3 text-[10px] font-semibold text-amber-800/80">Every suggestion above points to real QAVLIO listings — nothing is invented.</p>
      </div>
    );
  }

  const chips = data.explanation?.length ? data.explanation : data.interpreted;
  return (
    <div>
      {chips.length > 0 && (
        <p className="text-xs font-semibold text-slate-600" aria-live="polite">
          Showing <span className="font-extrabold text-ink-900">{data.total}</span> listing{data.total === 1 ? '' : 's'} matching:{' '}
          {chips.map((chip, index) => (
            <span key={`${chip}-${index}`} className="me-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-extrabold text-violet-800 ring-1 ring-violet-200">{chip}</span>
          ))}
        </p>
      )}
      {correction && (
        <p className="mt-1.5 text-[11px] font-bold text-slate-500">
          Did you mean{' '}
          <button type="button" onClick={applyCorrection} className="rounded-full bg-white px-2 py-0.5 font-extrabold text-violet-700 underline ring-1 ring-violet-200">
            “{correction.suggestion}”
          </button>
          ? Results below keep your original wording.
        </p>
      )}
      {data.source && <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-violet-600/80">{data.source}</p>}
    </div>
  );
}

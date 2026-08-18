import { Info, Sparkles, Undo2 } from 'lucide-react';
import type { AiSearchCorrection, AiZeroResultRecovery } from '../../types/ai';

interface Props {
  loading?: boolean;
  total?: number;
  empty?: boolean;
  explanation?: string;
  interpreted?: string[];
  semanticApplied?: boolean;
  relaxedFilters?: string[];
  correction?: AiSearchCorrection | null;
  recovery?: AiZeroResultRecovery | null;
  onAcceptCorrection?: (suggestion: string) => void;
  onRecoveryAction?: (params: Record<string, string>) => void;
}

const RELAXED_LABEL: Record<string, string> = {
  attributes: 'specific attributes',
  year: 'the year range',
  synonyms: 'exact wording',
  keywords: 'some keywords',
  price: 'the price range',
  location: 'the location',
};

/**
 * Explains, in plain language, what QAVLIO AI understood and what it actually did.
 * Every automatic relaxation is disclosed; corrections are offered, never applied.
 */
export default function AISearchExplanation({ loading, total, empty, explanation, interpreted = [], semanticApplied, relaxedFilters = [], correction, recovery, onAcceptCorrection, onRecoveryAction }: Props) {
  return (
    <div className="rounded-card border border-violet-100 bg-violet-50/70 p-3 sm:p-4" role="status" aria-live="polite" aria-atomic="true">
      <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-violet-700">
        <Sparkles size={13} aria-hidden="true" /> Smart search
      </p>

      {loading ? (
        <p className="mt-2 text-xs font-semibold text-slate-500">QAVLIO is understanding your search…</p>
      ) : (
        <>
          {correction && (
            <p className="mt-2 text-sm font-semibold text-ink-900">
              Did you mean{' '}
              <button type="button" onClick={() => onAcceptCorrection?.(correction.suggestion)} className="rounded-control font-extrabold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                {correction.suggestion}
              </button>
              ? <span className="text-xs font-normal text-slate-500">We kept your original search — “{correction.original}”.</span>
            </p>
          )}

          {explanation && <p className="mt-2 text-sm font-extrabold text-ink-900">{explanation}</p>}
          {!explanation && typeof total === 'number' && !empty && <p className="mt-2 text-sm font-extrabold text-ink-900">Showing {total} matching {total === 1 ? 'listing' : 'listings'}.</p>}

          {interpreted.length > 0 && <p className="mt-1 text-xs font-semibold text-slate-600">{interpreted.join(' · ')}</p>}

          {relaxedFilters.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-amber-800">
              <Undo2 size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              To find results we relaxed {relaxedFilters.map((item) => RELAXED_LABEL[item] || item).join(', ')}.
            </p>
          )}

          {semanticApplied && (
            <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <Info size={11} aria-hidden="true" /> Results re-ranked by meaning, not just keywords. All listings come from QAVLIO.
            </p>
          )}

          {empty && recovery && (
            <div className="mt-3 space-y-2 rounded-card bg-white p-3">
              <p className="text-sm font-extrabold text-ink-900">{recovery.message}</p>
              {recovery.note && <p className="text-xs text-slate-500">{recovery.note}</p>}

              {recovery.relatedCategories && recovery.relatedCategories.length > 0 && (
                <Row label="Related categories">
                  {recovery.relatedCategories.map((item) => (
                    <Chip key={item.slug} onClick={() => onRecoveryAction?.({ category: item.slug })}>{item.name}</Chip>
                  ))}
                </Row>
              )}

              {recovery.broaderPrice && (
                <Row label="Wider price range">
                  <Chip onClick={() => onRecoveryAction?.({ ...(recovery.broaderPrice?.minPrice !== undefined ? { minPrice: String(recovery.broaderPrice.minPrice) } : {}), ...(recovery.broaderPrice?.maxPrice !== undefined ? { maxPrice: String(recovery.broaderPrice.maxPrice) } : {}) })}>
                    {recovery.broaderPrice.label}
                  </Chip>
                </Row>
              )}

              {recovery.nearbyLocations && recovery.nearbyLocations.length > 0 && (
                <Row label="Nearby locations">
                  {recovery.nearbyLocations.map((city) => <Chip key={city} onClick={() => onRecoveryAction?.({ location: city })}>{city}</Chip>)}
                </Row>
              )}

              {recovery.suggestedSearches && recovery.suggestedSearches.length > 0 && (
                <Row label="Similar searches">
                  {recovery.suggestedSearches.map((term) => <Chip key={term} onClick={() => onRecoveryAction?.({ q: term })}>{term}</Chip>)}
                </Row>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
      {children}
    </button>
  );
}

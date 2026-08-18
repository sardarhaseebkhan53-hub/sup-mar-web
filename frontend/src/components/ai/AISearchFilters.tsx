import { X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { AppliedAiFilter } from '../../types/ai';
import AIUsageIndicator from './AIUsageIndicator';

/**
 * AISearchFilters (§13) — AI-extracted filters shown as adjustable chips.
 * Users can remove any chip; the underlying search updates. AI never locks a filter in.
 */
export default function AISearchFilters({ filters }: { filters: AppliedAiFilter[] }) {
  const [, setParams] = useSearchParams();
  if (!filters.length) return null;

  const remove = (filter: AppliedAiFilter) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (filter.param === 'condition' || filter.param.startsWith('attr.')) {
        const existing = (next.get(filter.param) || '').split(',').filter(Boolean);
        const kept = existing.filter((item) => item !== filter.value);
        if (kept.length) next.set(filter.param, kept.join(','));
        else next.delete(filter.param);
      } else if (filter.key === 'keywords' || filter.key === 'model') {
        next.delete('q');
      } else {
        next.delete(filter.param);
      }
      next.delete('page');
      return next;
    });
  };

  return (
    <section aria-label="Applied filters" className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <AIUsageIndicator tone="suggestion" />
        <span className="text-[11px] font-bold text-slate-500">Applied filters — tap × to change:</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2" role="list">
        {filters.map((filter) => (
          <li key={filter.key}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-ink-800 ring-1 ring-ink-900/10">
              <span className="text-slate-400">{filter.label}:</span> {filter.value}
              {filter.removable && (
                <button type="button" onClick={() => remove(filter)} aria-label={`Remove filter ${filter.label} ${filter.value}`} className="grid h-4 w-4 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink-900">
                  <X size={11} aria-hidden="true" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

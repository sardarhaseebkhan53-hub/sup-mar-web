import { SlidersHorizontal, X } from 'lucide-react';
import type { AiAppliedFilter } from '../../types/ai';

interface Props {
  filters: AiAppliedFilter[];
  suggestions?: Array<string | { label: string; payload: Record<string, string> }>;
  onRemove?: (filter: AiAppliedFilter) => void;
  onApplySuggestion?: (payload: Record<string, string>) => void;
  onClearAll?: () => void;
}

/**
 * Shows the filters QAVLIO AI extracted from a natural-language query.
 * Filters are visible and individually removable — nothing is applied invisibly.
 */
export default function AISearchFilters({ filters, suggestions = [], onRemove, onApplySuggestion, onClearAll }: Props) {
  const chips = suggestions.filter((item): item is { label: string; payload: Record<string, string> } => typeof item === 'object' && item !== null);
  if (!filters.length && !chips.length) return null;

  return (
    <div className="rounded-card border border-ink-900/10 bg-white p-3 sm:p-4">
      {filters.length > 0 && (
        <>
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-slate-500">
            <SlidersHorizontal size={13} aria-hidden="true" /> Filters QAVLIO applied
          </p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Filters extracted from your search">
            {filters.map((filter) => (
              <li key={`${filter.key}-${filter.value}`}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 py-1.5 pl-3 pr-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200">
                  <span>{filter.label}: {filter.value}</span>
                  {filter.removable !== false && onRemove && (
                    <button type="button" onClick={() => onRemove(filter)} aria-label={`Remove filter ${filter.label} ${filter.value}`} className="grid h-5 w-5 place-items-center rounded-full text-violet-700 transition hover:bg-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                      <X size={11} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </li>
            ))}
            {onClearAll && filters.length > 1 && (
              <li>
                <button type="button" onClick={onClearAll} className="rounded-full px-3 py-1.5 text-[11px] font-extrabold text-slate-500 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  Clear AI filters
                </button>
              </li>
            )}
          </ul>
        </>
      )}

      {chips.length > 0 && (
        <div className={filters.length ? 'mt-3 border-t border-slate-100 pt-3' : ''}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Would you like to narrow this to</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button key={chip.label} type="button" onClick={() => onApplySuggestion?.(chip.payload)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { RotateCcw } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

export interface ListingFilters { location: string; minPrice: string; maxPrice: string; conditions: string[]; postedWithin: string; }
interface FilterPanelProps { onApply?: (filters: ListingFilters) => void; }
interface FilterGroupProps { title: string; children: ReactNode; }
const initialFilters: ListingFilters = { location: 'All Pakistan', minPrice: '', maxPrice: '', conditions: [], postedWithin: 'any' };
const FilterGroup = ({ title, children }: FilterGroupProps) => <fieldset className="border-b border-slate-100 py-5 last:border-0"><legend className="mb-3 text-xs font-extrabold text-ink-900">{title}</legend>{children}</fieldset>;

export default function FilterPanel({ onApply }: FilterPanelProps) {
  const [filters, setFilters] = useState<ListingFilters>(initialFilters);
  const [applied, setApplied] = useState(false);
  const toggleCondition = (condition: string) => setFilters((current) => ({ ...current, conditions: current.conditions.includes(condition) ? current.conditions.filter((item) => item !== condition) : [...current.conditions, condition] }));
  const reset = () => { setFilters(initialFilters); setApplied(false); };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setApplied(true); onApply?.(filters); };

  return <form onSubmit={submit} className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm" aria-label="Listing filters">
    <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Filters</h2><button type="button" onClick={reset} className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700"><RotateCcw size={12} /> Reset</button></div>
    <FilterGroup title="Location"><select value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} className="input-base !h-10 !px-3 !text-xs"><option>All Pakistan</option><option>Rawalpindi</option><option>Islamabad</option><option>Lahore</option><option>Karachi</option></select></FilterGroup>
    <FilterGroup title="Price range"><div className="grid grid-cols-2 gap-2"><input value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} className="input-base !h-10 !px-3 !text-xs" inputMode="numeric" placeholder="Min" aria-label="Minimum price" /><input value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} className="input-base !h-10 !px-3 !text-xs" inputMode="numeric" placeholder="Max" aria-label="Maximum price" /></div></FilterGroup>
    <FilterGroup title="Condition"><div className="space-y-2">{['New', 'Used', 'Open box'].map((label) => <label key={label} className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={filters.conditions.includes(label)} onChange={() => toggleCondition(label)} className="h-4 w-4 rounded border-slate-300 accent-violet-600" /> {label}</label>)}</div></FilterGroup>
    <FilterGroup title="Posted within"><select className="input-base !h-10 !px-3 !text-xs" value={filters.postedWithin} onChange={(event) => setFilters({ ...filters, postedWithin: event.target.value })}><option value="any">Any time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option></select></FilterGroup>
    <button type="submit" className="mt-2 h-11 w-full rounded-xl bg-violet-600 text-xs font-extrabold text-white transition hover:bg-violet-700">Apply filters</button>
    <p className="mt-2 min-h-4 text-center text-[10px] font-semibold text-emerald-700" aria-live="polite">{applied ? 'Demo filters applied to the interface.' : ''}</p>
  </form>;
}

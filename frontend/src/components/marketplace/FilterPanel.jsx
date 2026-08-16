import React from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';

const FilterGroup = ({ title, children }) => <fieldset className="border-b border-slate-100 py-5 last:border-0"><legend className="mb-3 text-xs font-extrabold text-ink-900">{title}</legend>{children}</fieldset>;

export default function FilterPanel() {
  return (
    <aside className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm" aria-label="Listing filters">
      <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Filters</h2><button className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700"><RotateCcw size={12} /> Reset</button></div>
      <FilterGroup title="Location"><button className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-left text-xs font-semibold text-slate-600">All Pakistan <ChevronDown size={14} /></button></FilterGroup>
      <FilterGroup title="Price range"><div className="grid grid-cols-2 gap-2"><input className="input-base !h-10 !px-3 !text-xs" inputMode="numeric" placeholder="Min" aria-label="Minimum price" /><input className="input-base !h-10 !px-3 !text-xs" inputMode="numeric" placeholder="Max" aria-label="Maximum price" /></div></FilterGroup>
      <FilterGroup title="Condition"><div className="space-y-2">{['New', 'Used', 'Open box'].map((label) => <label key={label} className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-violet-600" /> {label}</label>)}</div></FilterGroup>
      <FilterGroup title="Posted within"><select className="input-base !h-10 !px-3 !text-xs" defaultValue="any"><option value="any">Any time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option></select></FilterGroup>
      <button className="mt-2 h-11 w-full rounded-xl bg-violet-600 text-xs font-extrabold text-white hover:bg-violet-700">Apply filters</button>
    </aside>
  );
}

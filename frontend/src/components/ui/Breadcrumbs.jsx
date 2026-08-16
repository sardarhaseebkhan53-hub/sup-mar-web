import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-hidden text-xs font-semibold text-slate-500">
      <Link to="/" className="shrink-0 hover:text-violet-700" aria-label="Home"><Home size={14} /></Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight size={13} className="shrink-0 text-slate-300" />
          {item.to ? <Link to={item.to} className="truncate hover:text-violet-700">{item.label}</Link> : <span className="truncate text-ink-800">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

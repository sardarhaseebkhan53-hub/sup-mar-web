import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCompactNumber } from '../../utils/formatters';
import CategoryIcon from '../ui/CategoryIcon';

export default function CategoryCard({ category }) {
  return (
    <Link to={`/category/${category.slug}`} className="group flex min-w-[132px] flex-1 flex-col items-center rounded-2xl border border-ink-900/10 bg-white p-4 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-card sm:min-w-0">
      <span className="relative"><CategoryIcon name={category.icon} accent={category.accent} size={27} className="h-14 w-14 rounded-2xl transition group-hover:scale-105" /><ArrowUpRight size={13} className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100" /></span>
      <h3 className="mt-3 text-xs font-extrabold text-ink-900">{category.shortName || category.name}</h3>
      <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatCompactNumber(category.count)} listings</p>
    </Link>
  );
}

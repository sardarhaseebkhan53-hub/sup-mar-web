import { ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import type { Category } from '../../types/marketplace';
import CategoryIcon from '../ui/CategoryIcon';

export default function CategoryNav() {
  const categories = useCategories() as Category[];
  return <nav aria-label="Marketplace categories" className="border-b border-ink-900/10 bg-white">
    <div className="container-shell hide-scrollbar flex items-center gap-1 overflow-x-auto py-1.5">
      {categories.slice(0, 10).map((category) => <NavLink key={category.id} to={`/category/${category.slug}`} className="group flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold text-ink-800 transition duration-150 hover:bg-violet-50 hover:text-violet-700"><CategoryIcon name={category.icon} accent={category.accent} size={14} className="h-5 w-5 rounded-md bg-transparent" />{category.shortName || category.name}</NavLink>)}
      <NavLink to="/categories" className="flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-violet-700 hover:bg-violet-50">More <ChevronDown size={13} /></NavLink>
    </div>
  </nav>;
}

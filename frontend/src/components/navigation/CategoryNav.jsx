import React from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import CategoryIcon from '../ui/CategoryIcon';

export default function CategoryNav() {
  const categories = useCategories();
  return (
    <nav aria-label="Marketplace categories" className="border-b border-ink-900/10 bg-white">
      <div className="container-shell hide-scrollbar flex items-center gap-1 overflow-x-auto py-2">
        {categories.slice(0, 10).map((category) => (
          <NavLink key={category.id} to={`/category/${category.slug}`} className="group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-ink-800 transition hover:bg-violet-50 hover:text-violet-700">
            <CategoryIcon name={category.icon} accent={category.accent} size={15} className="h-6 w-6 rounded-md bg-transparent" />
            {category.shortName || category.name}
          </NavLink>
        ))}
        <NavLink to="/browse" className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold text-ink-800 hover:bg-violet-50 hover:text-violet-700">More <ChevronDown size={13} /></NavLink>
      </div>
    </nav>
  );
}

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Category } from '../../types/marketplace';
import { formatCompactNumber } from '../../utils/formatters';
import CategoryIcon from '../ui/CategoryIcon';

interface CategoryCardProps { category: Category; }
export default function CategoryCard({ category }: CategoryCardProps) {
  const reduceMotion = useReducedMotion();
  const listingLabel = Number.isFinite(category.count) ? `${formatCompactNumber(category.count ?? 0)} listings` : 'Explore listings';
  return <motion.div whileHover={reduceMotion ? undefined : { y: -3 }} transition={{ duration: 0.2 }} className="min-w-0">
    <Link to={`/marketplace/${category.slug}`} className="group flex min-h-[146px] min-w-[132px] flex-1 flex-col items-center justify-center rounded-card border border-ink-900/10 bg-white p-4 text-center shadow-sm transition duration-200 hover:border-violet-200 hover:shadow-card sm:min-w-0">
      <span className="relative"><CategoryIcon name={category.icon} accent={category.accent} size={26} className="h-14 w-14 rounded-card transition duration-200 group-hover:scale-105" /><ArrowUpRight size={14} className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100" /></span>
      <h3 className="mt-3 text-xs font-extrabold text-ink-900">{category.shortName || category.name}</h3><p className="mt-1 text-[10px] font-semibold text-slate-400">{listingLabel}</p>
    </Link>
  </motion.div>;
}

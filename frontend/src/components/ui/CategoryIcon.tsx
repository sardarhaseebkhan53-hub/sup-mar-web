import {
  Armchair, Baby, Bike, BookOpen, BriefcaseBusiness, Building2, CarFront, Dumbbell, Factory, House, Laptop, LayoutGrid, PawPrint, Shirt, Smartphone, Sparkles, Ticket, Tv, Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { CategoryAccent } from '../../types/marketplace';

const iconMap: Record<string, LucideIcon> = { Armchair, Baby, Bike, BookOpen, BriefcaseBusiness, Building2, CarFront, Dumbbell, Factory, House, Laptop, LayoutGrid, PawPrint, Shirt, Smartphone, Sparkles, Ticket, Tv, Wrench };
const accentMap: Record<CategoryAccent, string> = {
  violet: 'bg-violet-100 text-violet-700', orange: 'bg-orange-100 text-orange-700', blue: 'bg-blue-100 text-blue-700', cyan: 'bg-cyan-100 text-cyan-700', emerald: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', pink: 'bg-pink-100 text-pink-700', indigo: 'bg-indigo-100 text-indigo-700', rose: 'bg-rose-100 text-rose-700', slate: 'bg-slate-100 text-slate-700', purple: 'bg-purple-100 text-purple-700',
};

interface CategoryIconProps { name: string; accent?: CategoryAccent; size?: number; className?: string; }
export default function CategoryIcon({ name, accent = 'violet', size = 22, className }: CategoryIconProps) {
  const Icon = iconMap[name] ?? LayoutGrid;
  return <span className={cn('inline-flex items-center justify-center', accentMap[accent], className)} aria-hidden="true"><Icon size={size} strokeWidth={1.9} /></span>;
}

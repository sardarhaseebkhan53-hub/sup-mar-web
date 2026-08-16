import React from 'react';
import {
  Armchair,
  Bike,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Laptop,
  LayoutGrid,
  PawPrint,
  Shirt,
  Smartphone,
  Wrench,
} from 'lucide-react';

const iconMap = { Armchair, Bike, BriefcaseBusiness, Building2, CarFront, Laptop, LayoutGrid, PawPrint, Shirt, Smartphone, Wrench };
const accentMap = {
  violet: 'bg-violet-100 text-violet-700', orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700', cyan: 'bg-cyan-100 text-cyan-700',
  emerald: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700',
  pink: 'bg-pink-100 text-pink-700', indigo: 'bg-indigo-100 text-indigo-700',
  rose: 'bg-rose-100 text-rose-700', slate: 'bg-slate-100 text-slate-700',
  purple: 'bg-purple-100 text-purple-700',
};

export default function CategoryIcon({ name, accent = 'violet', size = 22, className = '' }) {
  const Icon = iconMap[name] || LayoutGrid;
  return (
    <span className={`inline-flex items-center justify-center ${accentMap[accent]} ${className}`} aria-hidden="true">
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
}

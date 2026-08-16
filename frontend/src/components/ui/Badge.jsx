import React from 'react';
const variants = {
  featured: 'bg-gold-300 text-ink-950',
  verified: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
  neutral: 'bg-slate-100 text-slate-700',
  violet: 'bg-violet-100 text-violet-700',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${variants[variant]} ${className}`}>{children}</span>;
}

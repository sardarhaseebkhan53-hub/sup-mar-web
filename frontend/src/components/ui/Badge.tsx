import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'featured' | 'sponsored' | 'verified' | 'neutral' | 'violet' | 'success' | 'warning' | 'error';

const variants: Record<BadgeVariant, string> = {
  featured: 'bg-gold-300 text-ink-950',
  sponsored: 'bg-ink-950 text-white',
  verified: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
  neutral: 'bg-slate-100 text-slate-700',
  violet: 'bg-violet-100 text-violet-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  error: 'bg-rose-50 text-rose-700',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]', variants[variant], className)}>{children}</span>;
}

import { PackageSearch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, description, actionLabel, actionTo = '/marketplace', icon: Icon = PackageSearch }: EmptyStateProps) {
  return <section className="rounded-panel border border-dashed border-ink-900/15 bg-white px-6 py-12 text-center" role="status">
    <span className="mx-auto grid h-12 w-12 place-items-center rounded-card bg-violet-50 text-violet-700"><Icon size={22} /></span>
    <h2 className="mt-4 text-lg font-extrabold text-ink-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    {actionLabel && <Button to={actionTo} variant="secondary" size="sm" className="mt-5">{actionLabel}</Button>}
  </section>;
}

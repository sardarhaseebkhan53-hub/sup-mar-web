import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; to?: string; onClick?: () => void };
  children?: ReactNode;
  className?: string;
  /** `panel` renders a bordered card; `inline` blends into an existing card. */
  variant?: 'panel' | 'inline';
}

/**
 * Shared empty state.
 *
 * Empty is a designed state, not a leftover placeholder: it explains what will appear
 * here and offers the next useful action. Copy always comes from the translation layer.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, children, className = '', variant = 'panel' }: EmptyStateProps) {
  return (
    <div
      className={`flex animate-fade-in flex-col items-center justify-center gap-3 px-6 py-10 text-center motion-reduce:animate-none ${
        variant === 'panel' ? 'rounded-card border border-dashed border-ink-900/15 bg-white' : ''
      } ${className}`}
      role="status"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-500" aria-hidden="true">
        <Icon size={22} />
      </span>
      <p className="text-sm font-extrabold text-ink-900">{title}</p>
      {description && <p className="max-w-md text-xs leading-6 text-slate-500">{description}</p>}
      {children}
      {action && (
        <Button size="sm" variant="secondary" to={action.to} onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

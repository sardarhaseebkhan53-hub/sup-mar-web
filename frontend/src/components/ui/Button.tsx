import { LoaderCircle } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-violet-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-card active:translate-y-0',
  secondary: 'border border-ink-900/15 bg-white text-ink-900 shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 active:translate-y-0',
  gold: 'bg-gold-300 text-ink-950 shadow-sm hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-card active:translate-y-0',
  ghost: 'text-ink-800 hover:bg-ink-900/5',
  danger: 'bg-red-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-700 active:translate-y-0',
};
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-control px-3 text-xs', md: 'h-11 gap-2 rounded-control px-4 text-sm', lg: 'h-12 gap-2 rounded-control px-5 text-sm', icon: 'h-11 w-11 rounded-control',
};

export interface ButtonProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  to?: string;
  state?: unknown;
}

export function Button({ children, variant = 'primary', size = 'md', className, loading = false, disabled = false, type = 'button', to, state, onClick, ...props }: ButtonProps) {
  const classes = cn('inline-flex items-center justify-center whitespace-nowrap font-extrabold transition duration-200 disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className);
  const content = <>{loading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{children}</>;
  if (to) return <Link to={to} state={state} className={classes} aria-busy={loading || undefined} onClick={onClick} {...props}>{content}</Link>;
  return <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} onClick={onClick} {...props}>{content}</button>;
}

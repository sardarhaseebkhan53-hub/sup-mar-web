import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLElement> {
  elevated?: boolean;
}

export function Card({ className, elevated = false, ...props }: CardProps) {
  return <article className={cn('rounded-card border border-ink-900/10 bg-white', elevated ? 'shadow-card' : 'shadow-sm', className)} {...props} />;
}

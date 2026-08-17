import { LoaderCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export function LoadingSpinner({ label = 'Loading', className }: LoadingSpinnerProps) {
  return <span className={cn('inline-flex items-center gap-2 text-sm font-bold text-slate-500', className)} role="status">
    <LoaderCircle size={18} className="animate-spin text-violet-600" aria-hidden="true" />
    <span>{label}</span>
  </span>;
}

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, leading, className, id, ...props }, ref) {
  const inputId = id ?? props.name;
  return <label className="block" htmlFor={inputId}>
    {label && <span className="mb-2 block text-xs font-extrabold text-ink-800">{label}</span>}
    <span className="relative block">
      {leading && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{leading}</span>}
      <input ref={ref} id={inputId} className={cn('input-base', Boolean(leading) && 'pl-10', error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10', className)} aria-invalid={Boolean(error)} aria-describedby={hint || error ? `${inputId}-description` : undefined} {...props} />
    </span>
    {(hint || error) && <span id={`${inputId}-description`} className={cn('mt-1.5 block text-[11px]', error ? 'text-rose-600' : 'text-slate-500')}>{error || hint}</span>}
  </label>;
});

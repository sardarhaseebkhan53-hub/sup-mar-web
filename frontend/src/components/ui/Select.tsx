import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, className, children, id, ...props }, ref) {
  const selectId = id ?? props.name;
  return <label className="block" htmlFor={selectId}>
    {label && <span className="mb-2 block text-xs font-extrabold text-ink-800">{label}</span>}
    <span className="relative block">
      <select ref={ref} id={selectId} className={cn('input-base appearance-none pr-10', className)} {...props}>{children}</select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </span>
  </label>;
});

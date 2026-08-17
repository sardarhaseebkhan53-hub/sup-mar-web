import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something did not load', description = 'Please try again. Your place on this page is safe.', onRetry }: ErrorStateProps) {
  return <section className="rounded-panel border border-rose-200 bg-rose-50 px-6 py-10 text-center" role="alert">
    <span className="mx-auto grid h-12 w-12 place-items-center rounded-card bg-white text-rose-600 shadow-sm"><AlertTriangle size={22} /></span>
    <h2 className="mt-4 text-lg font-extrabold text-ink-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    {onRetry && <Button type="button" onClick={onRetry} variant="secondary" size="sm" className="mt-5"><RotateCw size={15} /> Try again</Button>}
  </section>;
}

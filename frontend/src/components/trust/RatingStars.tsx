import { Star } from 'lucide-react';

export default function RatingStars({ value, onChange, readOnly = false, size = 22 }: { value: number; onChange?: (value: number) => void; readOnly?: boolean; size?: number }) {
  return <div className="flex items-center gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={readOnly ? `${value} out of 5 stars` : 'Rating'}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" disabled={readOnly} onClick={() => onChange?.(star)} aria-checked={value === star} role={readOnly ? undefined : 'radio'} aria-label={`${star} star${star > 1 ? 's' : ''}`} className="rounded-sm text-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 disabled:cursor-default">
        <Star size={size} className={star <= value ? 'fill-gold-300 text-gold-500' : 'text-slate-300'} />
      </button>
    ))}
  </div>;
}

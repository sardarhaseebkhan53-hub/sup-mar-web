export default function CouponBadge({ type, value }: { type: string; value: number }) {
  const label = type === 'percentage' ? `${value}% OFF` : type === 'fixed' ? `${value} PKR OFF` : `${value} credit`;
  const tone = type === 'percentage' ? 'bg-violet-600 text-white' : type === 'fixed' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${tone}`}>{label}</span>;
}

export function DealBadge({ variant = 'deal' }: { variant?: 'deal'|'discount'|'featured'|'limited' }) {
  const map: Record<string,string> = {
    deal: 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
    discount: 'bg-emerald-600 text-white',
    featured: 'bg-violet-600 text-white',
    limited: 'bg-amber-500 text-white animate-pulse',
  };
  const textMap: Record<string,string> = { deal: 'Deal', discount: 'Discount', featured: 'Featured', limited: 'Limited Time' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${map[variant]||map.deal}`}>{textMap[variant]||variant}</span>;
}

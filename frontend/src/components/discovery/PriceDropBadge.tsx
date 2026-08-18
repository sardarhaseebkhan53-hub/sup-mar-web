import { TrendingDown } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import type { PriceDrop } from '../../types/discovery';

export default function PriceDropBadge({ drop }: { drop?: PriceDrop | null }) {
  if (!drop?.amount) return null;
  return <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800"><TrendingDown size={13} />Price dropped {formatPrice(drop.amount, 'PKR')}</p>;
}

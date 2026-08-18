import { Zap } from 'lucide-react';

export default function PromotionBadge({ label = 'Promoted', urgent = false }: { label?: string; urgent?: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${urgent || label==='Urgent' ? 'bg-amber-100 text-amber-900' : 'bg-violet-100 text-violet-800'}`}><Zap size={10}/>{label}</span>;
}

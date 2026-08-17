import { Megaphone } from 'lucide-react';
import { AD_SLOT_IDS } from '../../constants/adSlots';
import { cn } from '../../utils/cn';

const validSlotIds = new Set<string>(Object.values(AD_SLOT_IDS) as string[]);
interface AdSlotProps { slotId: string; variant?: 'banner' | 'rectangle'; className?: string; label?: string; }

export default function AdSlot({ slotId, variant = 'banner', className, label = 'Advertisement' }: AdSlotProps) {
  if (!validSlotIds.has(slotId)) return null;
  return <aside data-ad-slot={slotId} aria-label={`${label}: ${slotId}`} className={cn('relative overflow-hidden rounded-card border border-dashed border-ink-900/15 bg-white', variant === 'rectangle' ? 'min-h-52' : 'min-h-[88px]', className)}>
    <div className={cn('flex h-full gap-4 p-5', variant === 'rectangle' ? 'min-h-52 flex-col items-start justify-end' : 'min-h-[88px] items-center justify-between')}>
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-slate-100 text-slate-500"><Megaphone size={18} /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-500">{label}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">Reserved, admin-controlled placement</p></div></div>
      <span className="rounded-full bg-slate-50 px-3 py-1 text-[9px] font-bold text-slate-400">{slotId}</span>
    </div>
  </aside>;
}

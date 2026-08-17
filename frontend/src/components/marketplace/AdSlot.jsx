import React from 'react';
import { Megaphone } from 'lucide-react';
import { AD_SLOT_IDS } from '../../constants/adSlots';

const validSlotIds = new Set(Object.values(AD_SLOT_IDS));

export default function AdSlot({ slotId, variant = 'banner', className = '', label = 'Advertisement' }) {
  if (!validSlotIds.has(slotId)) {
    if (import.meta.env.DEV) console.warn(`Unknown QAVLIO ad slot: ${slotId}`);
    return null;
  }

  return (
    <aside data-ad-slot={slotId} aria-label={`${label}: ${slotId}`} className={`group relative overflow-hidden border border-dashed border-violet-300/80 bg-gradient-to-r from-violet-50 via-white to-gold-50 ${variant === 'rectangle' ? 'min-h-52 rounded-2xl' : 'min-h-[92px] rounded-2xl'} ${className}`}>
      <div className="absolute -right-8 -top-14 h-36 w-36 rounded-full bg-violet-200/35 blur-2xl" />
      <div className={`relative flex h-full gap-4 p-5 ${variant === 'rectangle' ? 'min-h-52 flex-col items-start justify-end' : 'min-h-[92px] items-center justify-between'}`}>
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><Megaphone size={19} /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-violet-600">{label}</p><p className="mt-0.5 text-sm font-extrabold text-ink-900">Reach buyers where decisions happen.</p></div></div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-ink-900/10">{slotId}</span>
      </div>
    </aside>
  );
}

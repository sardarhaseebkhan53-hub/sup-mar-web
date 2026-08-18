import { CalendarDays, Coins, Megaphone } from 'lucide-react';

export default function CreditBalance({ wallet, compact = false }: { wallet?: { listingCredits?: number; promotionCredits?: number; featuredDays?:number }; compact?: boolean }) {
  const items=[[Coins,'Listing credits',wallet?.listingCredits||0],[Megaphone,'Promotion credits',wallet?.promotionCredits||0],[CalendarDays,'Featured days',wallet?.featuredDays||0]] as const;
  return <section className={`rounded-card border border-violet-200 bg-violet-50 ${compact ? 'p-3' : 'p-5'}`} aria-label="Available credits">
    {!compact && <h2 className="text-sm font-extrabold">Available credits</h2>}
    <div className={`${compact ? 'flex flex-wrap gap-4' : 'mt-4 grid grid-cols-3 gap-3'}`}>{items.map(([Icon,label,value])=><div key={label} className="flex items-center gap-2"><Icon size={17} className="shrink-0 text-violet-600"/><span><strong className="block text-lg leading-none">{value}</strong><small className="text-[9px] text-slate-500">{label}</small></span></div>)}</div>
    {!compact && <p className="mt-4 text-[10px] leading-4 text-slate-500">Credits can be used for QAVLIO services. They are not cash and cannot be withdrawn.</p>}
  </section>;
}

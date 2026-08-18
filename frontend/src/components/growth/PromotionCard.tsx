import { Megaphone } from 'lucide-react';

export default function PromotionCard({ offer }: { offer: any }) {
  return (
    <article className="rounded-card border bg-white p-5 transition hover:shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Megaphone size={16}/></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-extrabold">{offer.title || offer.name}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{offer.description || 'Special offer'}</p>
        </div>
      </div>
      {offer.badge && <span className="mt-3 inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold text-white">{offer.badge}</span>}
    </article>
  );
}

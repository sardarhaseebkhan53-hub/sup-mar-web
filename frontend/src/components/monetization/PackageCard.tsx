import { Check, PackageCheck } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';

export default function PackageCard({ item, featured, busy, onPurchase }: { item:any; featured?:boolean; busy?:boolean; onPurchase:()=>void }) {
  return <article className={`relative flex h-full flex-col rounded-panel border bg-white p-6 shadow-sm ${featured?'border-violet-500 ring-2 ring-violet-500/10':'border-slate-200'}`}>
    {featured&&<span className="absolute right-4 top-4 rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-extrabold uppercase text-violet-700">Popular</span>}
    <PackageCheck className="text-violet-600"/><h2 className="mt-4 text-xl font-extrabold">{item.name}</h2><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{item.description}</p>
    <p className="mt-5 text-3xl font-extrabold">{formatPrice(item.price,item.currency)}</p><p className="mt-1 text-[10px] text-slate-400">Valid for {item.validityDays || 365} days</p>
    <dl className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[9px] text-slate-500">Listing credits</dt><dd className="mt-1 text-lg font-extrabold">{item.listingCredits}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[9px] text-slate-500">Promotion credits</dt><dd className="mt-1 text-lg font-extrabold">{item.promotionCredits}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[9px] text-slate-500">Featured days</dt><dd className="mt-1 text-lg font-extrabold">{item.promotionDays||0}</dd></div></dl>
    <ul className="mt-5 flex-1 space-y-2">{item.features.map((feature:string)=><li key={feature} className="flex gap-2 text-xs text-slate-600"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600"/>{feature}</li>)}</ul>
    <button type="button" onClick={onPurchase} disabled={busy} className="mt-6 h-12 rounded-control bg-violet-600 text-sm font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-60">{busy?'Preparing checkout…':'Purchase'}</button>
  </article>;
}

import { Coins, Gift, Clock, ArrowDownCircle } from 'lucide-react';

export default function RewardBalance({ balance }: { balance: any }) {
  const b = balance || {};
  const available = b.available?.total || b.balance || 0;
  const pending = b.pending?.total || 0;
  const used = b.used?.total || 0;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-card border bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Coins size={18}/></span><div><p className="text-xl font-extrabold">{available} PKR</p><p className="text-[10px] uppercase tracking-wide text-white/80">Available</p></div></div>
      </article>
      <article className="rounded-card border bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><Clock size={18}/></span><div><p className="text-xl font-extrabold">{pending} PKR</p><p className="text-[10px] uppercase tracking-wide text-slate-500">Pending</p></div></div></article>
      <article className="rounded-card border bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-600"><ArrowDownCircle size={18}/></span><div><p className="text-xl font-extrabold">{used} PKR</p><p className="text-[10px] uppercase tracking-wide text-slate-500">Used</p></div></div></article>
    </div>
  );
}

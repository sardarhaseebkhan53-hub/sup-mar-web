import { Gift, Users, TrendingUp, Clock } from 'lucide-react';

export default function ReferralCard({ stats, code }: { stats: any; code: any }) {
  if (!stats) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article className="rounded-card border bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Users size={18}/></span>
          <div>
            <p className="text-xl font-extrabold">{stats.total || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Referrals</p>
          </div>
        </div>
      </article>
      <article className="rounded-card border bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Gift size={18}/></span>
          <div>
            <p className="text-xl font-extrabold">{stats.rewarded || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Successful</p>
          </div>
        </div>
      </article>
      <article className="rounded-card border bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><Clock size={18}/></span>
          <div>
            <p className="text-xl font-extrabold">{stats.pending || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Pending</p>
          </div>
        </div>
      </article>
      <article className="rounded-card border bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><TrendingUp size={18}/></span>
          <div>
            <p className="text-xl font-extrabold">{code?.totalRewards || stats.totalRewards || 0} PKR</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/80">Earned Rewards</p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function ReferralStatsBar({ stats }: { stats: any }) {
  const items = [
    { label: 'Pending', value: stats?.pending || 0 },
    { label: 'Eligible', value: stats?.eligible || 0 },
    { label: 'Rewarded', value: stats?.rewarded || 0 },
    { label: 'Rejected', value: stats?.rejected || 0 },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(i => <span key={i.label} className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs"><strong>{i.value}</strong> {i.label}</span>)}
    </div>
  );
}

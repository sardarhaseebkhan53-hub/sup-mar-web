import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, value, change, icon: Icon, tone = 'violet' }) {
  const tones = { violet: 'bg-violet-100 text-violet-700', gold: 'bg-gold-100 text-gold-600', emerald: 'bg-emerald-100 text-emerald-700', blue: 'bg-blue-100 text-blue-700' };
  const isPositive = change?.startsWith('+');
  return <article className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span>{change && <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change}</span>}</div><p className="mt-5 text-2xl font-extrabold">{value}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{label}</p></article>;
}

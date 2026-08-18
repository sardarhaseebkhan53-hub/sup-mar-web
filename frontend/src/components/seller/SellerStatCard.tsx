import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const TONES: Record<string, string> = { violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', cyan: 'bg-cyan-50 text-cyan-600' };

/** SellerStatCard (§69) — a real-data metric card with an honest basis line. */
export default function SellerStatCard({ icon: Icon, label, value, tone = 'violet', hint, to }: { icon: LucideIcon; label: string; value: string | number; tone?: keyof typeof TONES; hint?: string; to?: string }) {
  const body = <article className="rounded-card border bg-white p-5 shadow-sm">
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${TONES[tone] || TONES.violet}`} aria-hidden="true"><Icon size={19} /></span>
    <p className="mt-4 text-2xl font-extrabold" aria-label={`${label}: ${value}`}>{typeof value === 'number' ? value.toLocaleString('en-PK') : value}</p>
    <p className="mt-1 text-[10px] font-bold text-slate-500">{label}</p>
    {hint && <p className="mt-2 text-[9px] font-semibold leading-4 text-slate-400">{hint}</p>}
  </article>;
  return to ? <Link to={to} className="block rounded-card transition hover:-translate-y-0.5 hover:shadow-card">{body}</Link> : body;
}

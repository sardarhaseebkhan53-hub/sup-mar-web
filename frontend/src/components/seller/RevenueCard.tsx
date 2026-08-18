import { CircleCheck, Clock3, CircleX } from 'lucide-react';

/** RevenueCard (§33–34, §69) — every metric is labeled with exactly what it contains. */
export default function RevenueCard({ metric }: { metric: { key: string; label: string; value: number; currency: string; basis: string } }) {
  const pkr = (value: number) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;
  return <article className="rounded-card border bg-white p-5 shadow-sm" aria-label={`${metric.label}: ${pkr(metric.value)}`}>
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{metric.label}</p>
    <p className="mt-2 text-2xl font-extrabold">{pkr(metric.value)}</p>
    <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-400">{metric.basis}</p>
  </article>;
}

/** Payout architecture states (§34) — honest until payouts go live. */
export function PayoutStates({ payouts }: { payouts: { supported: boolean; status: string; note: string } }) {
  if (payouts.supported) return null;
  const states = [
    { icon: Clock3, label: 'Pending', value: '—' },
    { icon: CircleCheck, label: 'Completed', value: '—' },
    { icon: CircleX, label: 'Failed', value: '—' },
  ];
  return <section className="rounded-panel border border-dashed bg-white p-5" aria-label="Payout information">
    <h3 className="text-sm font-extrabold">Payouts</h3>
    <div className="mt-3 grid grid-cols-3 gap-2">
      {states.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-card bg-slate-50 p-3 text-center">
          <Icon size={15} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-1 text-lg font-extrabold text-slate-400">{value}</p>
          <p className="text-[9px] font-bold text-slate-400">{label}</p>
        </div>
      ))}
    </div>
    <p className="mt-3 text-[10px] font-semibold text-slate-400">{payouts.note}</p>
  </section>;
}

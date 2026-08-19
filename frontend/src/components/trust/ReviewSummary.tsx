import type { ReviewSummary as Summary } from '../../types/trust';
import { RatingBadge } from './TrustBadges';

export default function ReviewSummary({ summary }: { summary?: Summary }) {
  const count = summary?.count || 0;
  const distribution = summary?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  return <section className="rounded-panel border bg-white p-5">
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-3xl font-extrabold">{count ? Number(summary?.average || 0).toFixed(1) : '—'}</p>
        <RatingBadge rating={summary?.average} count={count} />
      </div>
      <p className="text-[11px] font-semibold text-slate-400">{count} reviews</p>
    </div>
    <div className="mt-4 space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const value = Number((distribution as any)[star] || 0);
        const width = count ? Math.round((value / count) * 100) : 0;
        return <div key={star} className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
          <span className="w-6">{star} ★</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-gold-300" style={{ width: `${width}%` }} /></span>
          <span className="w-6 text-end">{value}</span>
        </div>;
      })}
    </div>
  </section>;
}

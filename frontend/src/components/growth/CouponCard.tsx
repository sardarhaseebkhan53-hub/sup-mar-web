import { Calendar, Tag, Percent } from 'lucide-react';
import CouponBadge from './CouponBadge';
import CampaignStatusBadge from './CampaignStatusBadge';

export default function CouponCard({ coupon, onUse }: { coupon: any; onUse?: (c:any)=>void }) {
  const expired = new Date(coupon.endAt) < new Date();
  return (
    <article className={`rounded-card border bg-white p-5 transition hover:shadow-card ${expired ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Tag size={16}/></span>
          <div>
            <h3 className="font-mono text-sm font-extrabold tracking-widest">{coupon.code}</h3>
            <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{coupon.description || (coupon.type === 'percentage' ? `${coupon.value}% discount` : `${coupon.value} PKR off`)}</p>
          </div>
        </div>
        <CouponBadge type={coupon.type} value={coupon.value}/>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><Calendar size={12}/>Ends {new Date(coupon.endAt).toLocaleDateString()}</span>
        {coupon.minimumAmount ? <span>Min {coupon.minimumAmount} PKR</span> : null}
        {coupon.usageCount !== undefined && coupon.usageLimit ? <span>Used {coupon.usageCount}/{coupon.usageLimit}</span> : null}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <CampaignStatusBadge status={coupon.status}/>
        {onUse && <button onClick={()=>onUse(coupon)} className="text-xs font-bold text-violet-600 hover:text-violet-700">Apply</button>}
      </div>
    </article>
  );
}

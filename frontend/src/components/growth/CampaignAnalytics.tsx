import { BarChart3, Eye, MousePointer, Gift, TrendingUp } from 'lucide-react';

export default function CampaignAnalytics({ analytics, funnel }: { analytics?: any; funnel?: any }) {
  const a = analytics || {};
  const f = funnel || {};
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={Eye} label="Views" value={a.views ?? f.impression ?? 0}/>
        <Stat icon={MousePointer} label="Clicks" value={a.clicks ?? f.cta ?? 0}/>
        <Stat icon={Gift} label="Redemptions" value={a.couponRedemptions ?? f.couponRedeem ?? 0}/>
        <Stat icon={TrendingUp} label="Conversions" value={a.conversions ?? f.conversion ?? 0}/>
      </div>
      {f && Object.keys(f).length > 0 && (
        <div className="rounded-card border bg-white p-5">
          <h4 className="flex items-center gap-2 text-sm font-extrabold"><BarChart3 size={16} className="text-violet-600"/>Marketing Funnel</h4>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {[
              ['Impression', f.impression],
              ['Campaign Visit', f.campaignVisit],
              ['Listing View', f.listingView],
              ['CTA', f.cta],
              ['Coupon', f.couponApply],
              ['Redemption', f.couponRedeem],
              ['Conversion', f.conversion],
            ].map(([label,val], idx) => (
              <span key={String(label)} className="inline-flex items-center gap-2">
                <span className="rounded-full bg-violet-600 px-3 py-1 font-bold text-white">{label}: {val as any}</span>
                {idx < 6 && <span className="text-slate-400">→</span>}
              </span>
            ))}
          </div>
          {f.impression && f.conversion ? <p className="mt-3 text-[11px] text-slate-500">Conversion rate: {((f.conversion / Math.max(1,f.impression))*100).toFixed(2)}%</p> : null}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon:any; label:string; value:any }) {
  return <article className="rounded-card border bg-white p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon size={16}/></span><div><p className="text-lg font-extrabold">{value}</p><p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p></div></div></article>;
}

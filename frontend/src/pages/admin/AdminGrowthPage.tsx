import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Gift, Tag, Megaphone, TrendingUp, Eye, MousePointer, Share2, BarChart3 } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { growthApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import GrowthChart from '../../components/growth/GrowthChart';

export default function AdminGrowthPage() {
  useDocumentTitle('Growth Engine - QAVLIO');
  const [range, setRange] = useState('30d');

  const analytics = useQuery({ queryKey: ['growth-analytics', range], queryFn: async () => (await growthApi.analytics(range)).data });
  const referral = useQuery({ queryKey: ['growth-referrals', range], queryFn: async () => (await growthApi.referrals(range)).data });
  const coupons = useQuery({ queryKey: ['growth-coupons', range], queryFn: async () => (await growthApi.coupons(range)).data });
  const campaigns = useQuery({ queryKey: ['growth-campaigns', range], queryFn: async () => (await growthApi.campaigns(range)).data });
  const top = useQuery({ queryKey: ['growth-top'], queryFn: async () => (await growthApi.topCampaigns('conversions')).data });

  const data = analytics.data;

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <header>
          <p className="eyebrow">Growth engine</p>
          <h1 className="mt-2 text-3xl font-extrabold">Growth Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">New users, referral signups, coupon usage, campaign conversions, returning users. Real data, not fake analytics.</p>
        </header>
        <select value={range} onChange={e=>setRange(e.target.value)} className="h-10 rounded-control border bg-white px-3 text-xs"><option value="today">Today</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option></select>
      </div>

      {analytics.isLoading ? <div className="mt-6 h-80 animate-pulse rounded-panel bg-slate-200"/> : data ? (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-6">
            <StatCard icon={Users} label="New users" value={data.newUsers} tone="violet"/>
            <StatCard icon={Gift} label="Referral signups" value={data.referralSignups} tone="emerald"/>
            <StatCard icon={TrendingUp} label="Referral conv" value={`${data.referralConversion}%`} tone="blue"/>
            <StatCard icon={Tag} label="Coupon usage" value={data.couponUsage} tone="amber"/>
            <StatCard icon={Megaphone} label="Campaign conv" value={data.campaignConversions} tone="violet"/>
            <StatCard icon={Users} label="Returning" value={data.returningUsers} tone="emerald"/>
          </section>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <Panel title="Referral Analytics" icon={Gift}>
              <div className="grid grid-cols-3 gap-2 text-xs">{[
                ['Invites', data.referrals?.invites],
                ['Eligible', data.referrals?.eligible],
                ['Rewards', data.referrals?.rewardsIssued],
                ['Suspicious', data.referrals?.suspicious],
                ['Conv Rate', `${data.referrals?.conversionRate}%`],
              ].map(([l,v])=><div key={String(l)} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-500">{l}</p><p className="mt-1 font-extrabold">{v ?? 0}</p></div>)}</div>
              {referral.data?.daily && <div className="mt-4"><GrowthChart data={referral.data.daily.map((d:any)=>({ _id:d._id, count:d.count }))}/></div>}
            </Panel>
            <Panel title="Coupon Analytics" icon={Tag}>
              <div className="grid grid-cols-3 gap-2 text-xs">{[
                ['Created', data.coupons?.created],
                ['Active', data.coupons?.active],
                ['Redemptions', data.coupons?.redemptions],
                ['Discount PKR', data.coupons?.discountAmount],
                ['Usage Rate', `${data.coupons?.usageRate}%`],
              ].map(([l,v])=><div key={String(l)} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-500">{l}</p><p className="mt-1 font-extrabold">{v ?? 0}</p></div>)}</div>
              {coupons.data?.daily && <div className="mt-4"><GrowthChart data={coupons.data.daily.map((d:any)=>({ _id:d._id, count:d.count }))}/></div>}
            </Panel>
            <Panel title="Campaign Analytics" icon={Megaphone}>
              <div className="grid grid-cols-4 gap-2 text-xs">{[
                ['Total', data.campaigns?.total],
                ['Views', data.campaigns?.views],
                ['Clicks', data.campaigns?.clicks],
                ['CTR', `${data.campaigns?.ctr}%`],
                ['Conversions', data.campaigns?.conversions],
                ['Revenue', data.campaigns?.revenue],
              ].map(([l,v])=><div key={String(l)} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-500">{l}</p><p className="mt-1 font-extrabold">{v ?? 0}</p></div>)}</div>
            </Panel>
            <Panel title="Top Campaigns" icon={BarChart3}>
              <div className="divide-y">
                {(data.topCampaigns || top.data?.campaigns || []).slice(0,5).map((c:any)=><div key={c.id} className="flex items-center justify-between py-2 text-xs"><span className="truncate font-bold">{c.name}</span><span className="flex items-center gap-2 text-[11px] text-slate-500"><Eye size={12}/>{c.views} <MousePointer size={12}/>{c.clicks} <TrendingUp size={12}/>{c.conversions}</span></div>)}
                {!(data.topCampaigns||[]).length && !top.data?.campaigns?.length && <p className="py-4 text-center text-xs text-slate-400">No campaigns yet.</p>}
              </div>
            </Panel>
          </div>

          <section className="mt-6 rounded-panel border bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><BarChart3 size={16} className="text-violet-600"/>Funnel Insight</h2>
            <p className="mt-2 text-xs text-slate-500">Impression → Campaign visit → Listing view → CTA → Coupon → Eligible transaction. Admin can inspect conversion rates at /admin/campaigns/:id</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {Object.entries(data.events||{}).map(([k,v])=><span key={k} className="rounded-full border bg-slate-50 px-3 py-1">{k}: {String(v)}</span>)}
            </div>
          </section>
        </>
      ) : <p className="mt-6 rounded-card border bg-white p-10 text-center text-xs text-slate-500">No growth data yet.</p>}
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon:any; label:string; value:any; tone:string }) {
  const tones: Record<string,string> = { violet:'bg-violet-50 text-violet-600', emerald:'bg-emerald-50 text-emerald-600', blue:'bg-blue-50 text-blue-600', amber:'bg-amber-50 text-amber-600' };
  return <article className="rounded-card border bg-white p-4"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]||tones.violet}`}><Icon size={16}/></span><div><p className="text-lg font-extrabold">{value ?? 0}</p><p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p></div></div></article>;
}
function Panel({ title, icon: Icon, children }: { title:string; icon:any; children:any }) {
  return <section className="rounded-panel border bg-white p-5"><h2 className="flex items-center gap-2 text-sm font-extrabold"><Icon size={16} className="text-violet-600"/>{title}</h2><div className="mt-4">{children}</div></section>;
}

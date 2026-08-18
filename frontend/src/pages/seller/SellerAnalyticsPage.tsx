import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminChart from '../../components/admin/AdminChart';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

const WINDOWS = [{ id: '7days', label: '7 days' }, { id: '30days', label: '30 days' }, { id: '90days', label: '90 days' }, { id: 'year', label: '1 year' }];

/** Analytics (§35–39) — listings, categories, location-free aggregated views, and time charts. */
export default function SellerAnalyticsPage() {
  useDocumentTitle('Seller analytics');
  const [window, setWindow] = useState('30days');
  const query = useQuery({ queryKey: ['seller-analytics-v2', window], queryFn: async () => (await sellerCenterApi.analytics(window)).data, staleTime: 60_000 });
  const data = query.data;

  return <DashboardLayout role="seller">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Measured activity</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><BarChart3 className="text-violet-600" size={28} aria-hidden="true" /> Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Only what QAVLIO actually tracks — untracked metrics are labeled, never estimated.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Time window">
        {WINDOWS.map((item) => <button key={item.id} type="button" onClick={() => setWindow(item.id)} aria-pressed={window === item.id} className={`h-10 rounded-control px-4 text-xs font-extrabold ${window === item.id ? 'bg-violet-600 text-white' : 'border bg-white text-slate-600'}`}>{item.label}</button>)}
      </div>
    </header>

    {query.isLoading ? <div className="mt-6"><SellerLoadingState rows={6} /></div> : query.isError ? <div className="mt-6"><SellerErrorState retry={() => void query.refetch()} /></div> : data && <>
      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Performance overview">
        <SellerStatCard icon={BarChart3} label="Listings (active)" value={data.sections.listings.active} hint={`${data.sections.listings.total} total · ${data.sections.listings.sold} sold`} />
        <SellerStatCard icon={BarChart3} label="Views" value={data.sections.views.total} tone="cyan" hint={data.sections.views.note} />
        <SellerStatCard icon={BarChart3} label="Favorites" value={data.sections.favorites.total} tone="rose" />
        <SellerStatCard icon={BarChart3} label="Leads" value={data.sections.leads.total} tone="emerald" hint={Object.entries(data.sections.leads.byStage).filter(([, count]) => Number(count) > 0).map(([stage, count]) => `${stage}: ${count}`).join(' · ') || 'Pipeline empty'} />
        <SellerStatCard icon={BarChart3} label="Messages" value={data.sections.messages.total} tone="cyan" hint={data.sections.messages.responseRate !== null ? `Response rate ${data.sections.messages.responseRate}%` : 'Response metrics need 5+ conversations'} />
        <SellerStatCard icon={BarChart3} label="Promo impressions" value={data.sections.promotions.impressions} tone="amber" hint={data.sections.searchImpressions.note} />
        <SellerStatCard icon={BarChart3} label="Promo clicks" value={data.sections.promotions.clicks} tone="amber" />
        <SellerStatCard icon={BarChart3} label="Paid orders (window)" value={data.sections.revenue.paidOrders} hint={`Rs. ${Number(data.sections.revenue.spend || 0).toLocaleString('en-PK')} spend`} />
      </section>

      <section className="mt-8 rounded-panel border bg-white p-5" aria-label="Activity over time">
        <h2 className="text-sm font-extrabold">Views, leads, and spend by day</h2>
        {data.timeline.length ? <div className="mt-4"><AdminChart data={data.timeline.map((bucket: any) => ({ date: bucket.date, views: (bucket.counts.listing_view || 0) + (bucket.counts.listing_impression || 0), leads: bucket.counts.lead || 0, spend: bucket.counts.revenue || 0 }))} keys={['views', 'leads', 'spend']} /></div> : <p className="mt-4 text-xs font-semibold text-slate-400">No tracked events in this window yet.</p>}
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="rounded-panel border bg-white p-5" aria-label="Listing performance">
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><TrendingUp size={15} className="text-emerald-600" aria-hidden="true" /> Top listings</h2>
          <ul className="mt-3 divide-y">
            {data.topListings.map((item: any) => <li key={item.publicId}><Link to={`/seller/listings/${item.publicId}`} className="flex items-center gap-3 py-2.5 text-xs font-bold hover:text-violet-700"><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="text-slate-500">{item.views} views</span><span className="text-slate-500">{item.favorites} saves</span></Link></li>)}
          </ul>
          <h3 className="mt-5 flex items-center gap-2 text-xs font-extrabold text-slate-500"><TrendingDown size={13} className="text-amber-600" aria-hidden="true" /> Needs attention</h3>
          <ul className="mt-2 divide-y">
            {data.lowestPerforming.map((item: any) => <li key={item.publicId}><Link to={`/seller/listings/${item.publicId}`} className="flex items-center gap-3 py-2.5 text-xs font-bold hover:text-violet-700"><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="text-slate-500">{item.views} views</span></Link></li>)}
          </ul>
        </section>
        <section className="rounded-panel border bg-white p-5" aria-label="Category performance">
          <h2 className="text-sm font-extrabold">Category performance</h2>
          {data.categories.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[380px] text-left text-xs">
            <thead className="text-[9px] uppercase text-slate-400"><tr>{['Category', 'Listings', 'Views', 'Leads', 'Sold'].map((head) => <th key={head} scope="col" className="px-3 py-2">{head}</th>)}</tr></thead>
            <tbody>{data.categories.map((row: any) => <tr key={row.category} className="border-t"><th scope="row" className="px-3 py-2 font-extrabold capitalize">{row.category.split('-').join(' ')}</th><td className="px-3">{row.listings}</td><td className="px-3">{row.views}</td><td className="px-3">{row.leads}</td><td className="px-3">{row.sales}</td></tr>)}</tbody>
          </table></div> : <p className="mt-3 text-xs font-semibold text-slate-400">Categories appear once you publish listings.</p>}
          <div className="mt-4 grid gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Highlights</p>
            {data.mostContacted.filter((item: any) => item.messages > 0).map((item: any) => <p key={item.publicId} className="text-[11px] font-semibold text-slate-600">💬 “{item.title}” — {item.messages} buyer messages</p>)}
            {data.mostFavorited.filter((item: any) => item.favorites > 0).map((item: any) => <p key={item.publicId} className="text-[11px] font-semibold text-slate-600">❤️ “{item.title}” — {item.favorites} saves</p>)}
          </div>
        </section>
      </div>
      <p className="mt-6 text-[10px] font-semibold text-slate-400">{data.basis}</p>
    </>}
  </DashboardLayout>;
}

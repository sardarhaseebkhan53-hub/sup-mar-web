import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BarChart3, LineChart, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminChart from '../../components/admin/AdminChart';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTranslation } from '../../i18n';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';
import { formatPrice } from '../../utils/formatters';

const WINDOWS = [
  { id: '7days', labelKey: 'seller.analytics.window7' },
  { id: '30days', labelKey: 'seller.analytics.window30' },
  { id: '90days', labelKey: 'seller.analytics.window90' },
  { id: 'year', labelKey: 'seller.analytics.windowYear' },
];

/** Analytics (§35–39) — listings, categories, location-free aggregated views, and time charts. */
export default function SellerAnalyticsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('seller.analytics.title'));
  const [window, setWindow] = useState('30days');
  const query = useQuery({ queryKey: ['seller-analytics-v2', window], queryFn: async () => (await sellerCenterApi.analytics(window)).data, staleTime: 60_000 });
  const data = query.data;

  return <DashboardLayout role="seller">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{t('seller.analytics.eyebrow')}</p>
        <h1 className="mt-2 flex items-center gap-2 text-h2 text-ink-900"><BarChart3 className="text-violet-600" size={28} aria-hidden="true" /> {t('seller.analytics.title')}</h1>
        <p className="mt-2 max-w-2xl text-body-sm text-slate-500">{t('seller.analytics.description')}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('seller.analytics.window')}>
        {WINDOWS.map((item) => <button key={item.id} type="button" onClick={() => setWindow(item.id)} aria-pressed={window === item.id} className={`h-10 rounded-control px-4 text-xs font-extrabold transition duration-150 ${window === item.id ? 'bg-violet-600 text-white shadow-sm' : 'border bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'}`}>{t(item.labelKey)}</button>)}
      </div>
    </header>

    {query.isLoading ? <div className="mt-6"><SellerLoadingState rows={6} /></div> : query.isError ? <div className="mt-6"><SellerErrorState retry={() => void query.refetch()} /></div> : data && <>
      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={t('seller.analytics.overview')}>
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.listingsActive')} value={data.sections.listings.active} hint={t('seller.analytics.listingsHint', { total: data.sections.listings.total, sold: data.sections.listings.sold })} />
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.views')} value={data.sections.views.total} tone="cyan" hint={data.sections.views.note} />
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.favorites')} value={data.sections.favorites.total} tone="rose" />
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.leads')} value={data.sections.leads.total} tone="emerald" hint={Object.entries(data.sections.leads.byStage).filter(([, count]) => Number(count) > 0).map(([stage, count]) => `${stage}: ${count}`).join(' · ') || t('seller.analytics.pipelineEmpty')} />
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.messages')} value={data.sections.messages.total} tone="cyan" hint={data.sections.messages.responseRate !== null ? t('seller.analytics.responseRate', { value: data.sections.messages.responseRate }) : t('seller.analytics.responseNeeds')} />
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.promoImpressions')} value={data.sections.promotions.impressions} tone="amber" hint={data.sections.searchImpressions.note} />
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.promoClicks')} value={data.sections.promotions.clicks} tone="amber" />
        <SellerStatCard icon={BarChart3} label={t('seller.analytics.paidOrders')} value={data.sections.revenue.paidOrders} hint={t('seller.analytics.spendHint', { amount: formatPrice(Number(data.sections.revenue.spend || 0)) })} />
      </section>

      <section className="mt-8 rounded-panel border bg-white p-5" aria-label={t('seller.analytics.timeline')}>
        <h2 className="text-sm font-extrabold">{t('seller.analytics.timeline')}</h2>
        {data.timeline.length
          ? <div className="mt-4"><AdminChart data={data.timeline.map((bucket: any) => ({ date: bucket.date, views: (bucket.counts.listing_view || 0) + (bucket.counts.listing_impression || 0), leads: bucket.counts.lead || 0, spend: bucket.counts.revenue || 0 }))} keys={['views', 'leads', 'spend']} /></div>
          : <div className="mt-4 rounded-card bg-slate-50/70"><EmptyState variant="inline" icon={LineChart} title={t('empty.analytics')} description={t('empty.analyticsHint')} /></div>}
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="rounded-panel border bg-white p-5" aria-label="Listing performance">
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><TrendingUp size={15} className="text-emerald-600" aria-hidden="true" /> {t('seller.analytics.topListings')}</h2>
          <ul className="mt-3 divide-y">
            {data.topListings.map((item: any) => <li key={item.publicId}><Link to={`/seller/listings/${item.publicId}`} className="flex items-center gap-3 py-2.5 text-xs font-bold hover:text-violet-700"><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="text-slate-500">{t('seller.analytics.viewsCount', { count: item.views })}</span><span className="text-slate-500">{t('seller.analytics.savesCount', { count: item.favorites })}</span></Link></li>)}
          </ul>
          <h3 className="mt-5 flex items-center gap-2 text-xs font-extrabold text-slate-500"><TrendingDown size={13} className="text-amber-600" aria-hidden="true" /> {t('seller.analytics.needsAttention')}</h3>
          <ul className="mt-2 divide-y">
            {data.lowestPerforming.map((item: any) => <li key={item.publicId}><Link to={`/seller/listings/${item.publicId}`} className="flex items-center gap-3 py-2.5 text-xs font-bold hover:text-violet-700"><span className="min-w-0 flex-1 truncate">{item.title}</span><span className="text-slate-500">{t('seller.analytics.viewsCount', { count: item.views })}</span></Link></li>)}
          </ul>
        </section>
        <section className="rounded-panel border bg-white p-5" aria-label="Category performance">
          <h2 className="text-sm font-extrabold">Category performance</h2>
          {data.categories.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[380px] text-start text-xs">
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

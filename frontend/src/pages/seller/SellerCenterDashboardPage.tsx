import { useQuery } from '@tanstack/react-query';
import { BarChart3, Boxes, CheckCircle2, Coins, Eye, Heart, LayoutDashboard, MessageCircle, Megaphone, MousePointerClick, PackageCheck, Plus, Tags, UsersRound, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import SellerQuickActions from '../../components/seller/SellerQuickActions';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

/**
 * Seller Business Center dashboard (§6–7, §58–59) — real data only, with the onboarding
 * checklist shown until the seller is fully set up. Basic selling is never blocked.
 */
export default function SellerCenterDashboardPage() {
  useDocumentTitle('Seller dashboard');
  const dashboard = useQuery({ queryKey: ['seller-center-dashboard'], queryFn: async () => (await sellerCenterApi.dashboard('30days')).data, staleTime: 60_000 });
  const data = dashboard.data;

  return <DashboardLayout role="seller">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">QAVLIO Seller Center</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><LayoutDashboard className="text-violet-600" size={28} aria-hidden="true" /> Business dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">Every number below comes from your real listings, conversations, leads, and payments — never estimates.</p>
      </div>
      <Link to="/seller/listings/new" className="inline-flex h-11 items-center gap-2 rounded-control bg-gold-300 px-5 text-xs font-extrabold text-ink-950"><Plus size={16} aria-hidden="true" /> Add listing</Link>
    </header>

    {data?.onboarding && !data.onboarding.complete && (
      <section className="mt-6 rounded-panel border border-violet-200 bg-violet-50/60 p-5" aria-label="Welcome to QAVLIO Seller Center">
        <h2 className="text-sm font-extrabold text-violet-900">Welcome to QAVLIO Seller Center 👋</h2>
        <p className="mt-1 text-xs font-semibold text-violet-800/80">{data.onboarding.note}</p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {data.onboarding.steps.map((step: any) => (
            <li key={step.id}>
              <Link to={step.href} className={`flex h-full flex-col gap-1 rounded-card border bg-white p-3 text-[11px] font-bold transition hover:shadow-sm ${step.done ? 'border-emerald-200' : ''}`}>
                <span className="flex items-center gap-1.5">{step.done ? <CheckCircle2 size={13} className="text-emerald-600" aria-hidden="true" /> : <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-200 text-[8px] font-extrabold text-slate-500" aria-hidden="true">•</span>}{step.title}</span>
                {step.optional && !step.done && <span className="text-[9px] font-semibold text-slate-400">Optional</span>}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    )}

    {dashboard.isLoading ? <div className="mt-6"><SellerLoadingState /></div> : dashboard.isError ? <div className="mt-6"><SellerErrorState retry={() => void dashboard.refetch()} /></div> : data && <>
      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Business overview">
        <SellerStatCard icon={PackageCheck} label="Active listings" value={data.cards.activeListings} to="/seller/listings" hint="Published and live now" />
        <SellerStatCard icon={Eye} label="Views" value={data.cards.views} tone="cyan" to="/seller/analytics" hint="Lifetime listing views" />
        <SellerStatCard icon={Heart} label="Favorites" value={data.cards.favorites} tone="rose" to="/seller/analytics" hint="Buyers who saved your items" />
        <SellerStatCard icon={UsersRound} label="Leads" value={data.cards.leads} tone="emerald" to="/seller/leads" hint={`In window: ${data.leadsInWindow}`} />
        <SellerStatCard icon={MessageCircle} label="Messages" value={data.cards.messages} to="/messages" hint={`${data.cards.unreadMessages} unread`} />
        <SellerStatCard icon={Wallet} label="Orders" value={data.cards.orders} tone="amber" to="/seller/orders" hint="Marketplace orders in window" />
        <SellerStatCard icon={Megaphone} label="Promo impressions" value={data.cards.promotionPerformance.impressions} to="/seller/promotions" hint="Tracked promotion delivery" />
        <SellerStatCard icon={MousePointerClick} label="Promo clicks" value={data.cards.promotionPerformance.clicks} tone="cyan" to="/seller/promotions" hint="Tracked clicks on promoted listings" />
      </section>

      <section className="mt-8" aria-label="Quick actions">
        <h2 className="mb-3 text-sm font-extrabold">Quick actions</h2>
        <SellerQuickActions actions={[
          { icon: Plus, label: 'Add listing', to: '/seller/listings/new' },
          { icon: UsersRound, label: 'View leads', to: '/seller/leads' },
          { icon: MessageCircle, label: 'Open messages', to: '/messages' },
          { icon: Tags, label: 'Promote listing', to: '/seller/listings' },
          { icon: BarChart3, label: 'View analytics', to: '/seller/analytics' },
          { icon: Boxes, label: 'Manage inventory', to: '/seller/inventory' },
        ]} />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2" aria-label="Pipeline and spend">
        <div className="rounded-panel border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Lead pipeline</h2>
            <Link to="/seller/leads" className="text-xs font-bold text-violet-700">Open pipeline</Link>
          </div>
          <ul className="mt-4 space-y-2">
            {Object.entries(data.leadsByStage).map(([stage, count]) => (
              <li key={stage} className="flex items-center gap-3 text-xs font-bold">
                <span className="w-24 capitalize text-slate-500">{stage}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (Number(count) / Math.max(1, data.cards.leads)) * 100)}%` }} /></span>
                <span>{Number(count)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-panel border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Marketplace spend (30 days)</h2>
            <Link to="/seller/revenue" className="text-xs font-bold text-violet-700">Revenue center</Link>
          </div>
          <p className="mt-4 text-3xl font-extrabold">Rs. {Number(data.revenueInWindow.spend || 0).toLocaleString('en-PK')}</p>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">{data.revenueInWindow.label}.</p>
          <p className="mt-4 rounded-card bg-slate-50 p-3 text-[10px] font-semibold leading-4 text-slate-500"><Coins size={11} className="mr-1 inline" aria-hidden="true" />{data.basis}</p>
        </div>
      </section>
    </>}
  </DashboardLayout>;
}

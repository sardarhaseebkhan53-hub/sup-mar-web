import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Bot, Gauge, Sparkles, ShieldCheck } from 'lucide-react';
import AIListingAssistant from '../../components/ai/AIListingAssistant';
import { SellerErrorState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

/** AI Seller Center (§46–48) — listing tools from Phase 16 plus grounded business insights. */
export default function SellerAiToolsPage() {
  useDocumentTitle('AI seller tools');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const insights = useQuery({ queryKey: ['seller-ai-insights'], queryFn: async () => (await sellerCenterApi.aiInsights()).data, staleTime: 120_000 });
  const metrics = useQuery({ queryKey: ['seller-perf-metrics'], queryFn: async () => (await sellerCenterApi.performanceMetrics()).data, staleTime: 120_000 });

  return <DashboardLayout role="seller">
    <header>
      <p className="eyebrow">QAVLIO intelligence</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Sparkles className="text-violet-600" size={28} aria-hidden="true" /> AI seller tools</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">Listing help from Phase 16 plus business insights generated only from your real analytics. You approve every action.</p>
    </header>

    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="rounded-panel border bg-white p-5 sm:p-7" aria-label="AI listing assistant">
        <h2 className="flex items-center gap-2 text-sm font-extrabold"><Bot size={16} className="text-violet-600" aria-hidden="true" /> AI Listing Assistant</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">Draft a listing with the assistant, then copy it into a new listing. Nothing publishes automatically.</p>
        <label className="mt-4 block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Working title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-base mt-1 text-xs" placeholder="iphone 15 pro good condition" maxLength={100} />
        </label>
        <label className="mt-3 block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Facts / description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="input-base mt-2 min-h-32 py-3 text-xs" placeholder="What you can confirm: brand, storage, condition, accessories." maxLength={10000} />
        </label>
        <div className="mt-5"><AIListingAssistant title={title} description={description} onApplyTitle={setTitle} onApplyDescription={setDescription} /></div>
      </section>

      <div className="space-y-5">
        <section className="rounded-panel border border-violet-200 bg-violet-50/60 p-5" aria-label="AI business insights">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-violet-900"><Sparkles size={15} aria-hidden="true" /> Business insights</h2>
          {insights.isLoading && <p role="status" className="mt-3 text-xs font-bold text-violet-700">Reading your analytics…</p>}
          {insights.isError && <SellerErrorState retry={() => void insights.refetch()} />}
          {insights.data && <>
            <ul className="mt-3 space-y-2" aria-live="polite">
              {insights.data.statements.length ? insights.data.statements.map((statement: string) => <li key={statement} className="rounded-card bg-white p-3 text-[11px] font-semibold text-ink-800">· {statement}</li>) : <li className="rounded-card bg-white p-3 text-[11px] font-semibold text-slate-500">Publish listings and receive messages — insights appear from your real activity.</li>}
            </ul>
            {insights.data.suggestions.length > 0 && <div className="mt-3 rounded-card border border-violet-200 bg-white p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">Suggestions for you</p>
              <ul className="mt-1.5 space-y-1 text-[11px] font-semibold text-violet-900">{insights.data.suggestions.map((suggestion: string) => <li key={suggestion}>· {suggestion}</li>)}</ul>
            </div>}
            <p className="mt-3 text-[9px] font-semibold text-violet-800/70">{insights.data.basis}</p>
            <p className="mt-2 flex items-start gap-1.5 rounded-card bg-white p-2.5 text-[9px] font-semibold text-slate-500"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> {insights.data.safety}</p>
          </>}
        </section>

        {metrics.data && <section className="rounded-panel border bg-white p-5" aria-label="Internal performance metrics">
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><Gauge size={15} className="text-violet-600" aria-hidden="true" /> Your performance</h2>
          <ul className="mt-3 space-y-2 text-xs font-semibold text-slate-600">
            <li className="flex justify-between rounded-control bg-slate-50 px-3 py-2">Average listing quality<span className="font-extrabold text-ink-900">{metrics.data.listingQuality ?? '—'}/100</span></li>
            <li className="flex justify-between rounded-control bg-slate-50 px-3 py-2">Response rate<span className="font-extrabold text-ink-900">{metrics.data.responsePerformance.responseRate !== null ? `${metrics.data.responsePerformance.responseRate}%` : 'Not enough data'}</span></li>
            <li className="flex justify-between rounded-control bg-slate-50 px-3 py-2">Listings sold (90 days)<span className="font-extrabold text-ink-900">{metrics.data.salesPerformance.soldListings}</span></li>
            <li className="flex justify-between rounded-control bg-slate-50 px-3 py-2">Leads won<span className="font-extrabold text-ink-900">{metrics.data.salesPerformance.leadsWon}</span></li>
          </ul>
          <p className="mt-3 text-[9px] font-semibold text-slate-400">{metrics.data.disclaimer}</p>
        </section>}
      </div>
    </div>
  </DashboardLayout>;
}

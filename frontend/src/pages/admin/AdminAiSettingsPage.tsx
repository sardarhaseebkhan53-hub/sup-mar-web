import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, Bot, Clock, Coins, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import AIUsageIndicator from '../../components/ai/AIUsageIndicator';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { adminAiApi } from '../../services/apiClient';

const FEATURE_LABELS: Record<string, string> = {
  assistant: 'AI Assistant',
  search: 'AI Search',
  recommendations: 'AI Recommendations',
  listingAssistant: 'AI Listing Assistant',
  priceInsights: 'AI Price Insights',
  support: 'AI Support',
  moderation: 'AI Moderation Assist',
};

/** Phase 16 §51 — Admin AI dashboard: usage, errors, latency, popular features, cost controls. */
export default function AdminAiSettingsPage() {
  useDocumentTitle('AI dashboard');
  const client = useQueryClient();
  const [days, setDays] = useState(30);
  const settings = useQuery({ queryKey: ['admin-ai-settings'], queryFn: async () => (await adminAiApi.settings()).data });
  const analytics = useQuery({ queryKey: ['admin-ai-analytics', days], queryFn: async () => (await adminAiApi.analytics(days)).data });
  const update = useMutation({ mutationFn: (data: unknown) => adminAiApi.update(data), onSuccess: () => client.invalidateQueries({ queryKey: ['admin-ai-settings'] }) });
  const data = settings.data || {};
  const features = data.features || {};
  const usage = analytics.data?.usage;

  return <DashboardLayout role="admin">
    <header>
      <p className="eyebrow">QAVLIO intelligence</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Sparkles className="text-violet-600" aria-hidden="true" /> AI dashboard</h1>
      <p className="mt-2 text-sm text-slate-500">Provider credentials stay on the server. These toggles and limits cannot be bypassed from the browser.</p>
    </header>

    <section className="mt-6 rounded-panel border border-violet-200 bg-violet-50/60 p-4" aria-label="AI transparency">
      <AIUsageIndicator tone="suggestion" />
      <p className="mt-2 text-xs font-semibold text-slate-600">All AI features are server-side, provider-abstracted, and grounded in real QAVLIO listings. Prices, listings, and sellers are never invented; users cannot select arbitrary models.</p>
    </section>

    {settings.isLoading ? <div className="mt-6 h-72 animate-pulse rounded-panel bg-slate-200" /> : <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-panel border bg-white p-5">
        <h2 className="font-extrabold">Configuration</h2>
        <label className="mt-4 flex items-center justify-between py-3 text-sm font-bold"><span>AI enabled</span><input type="checkbox" checked={Boolean(data.enabled)} onChange={(event) => update.mutate({ enabled: event.target.checked })} className="h-5 w-5 accent-violet-600" /></label>
        <label className="block py-3 text-xs font-extrabold">Provider
          <select defaultValue={data.provider} onChange={(event) => update.mutate({ provider: event.target.value })} className="input-base mt-2">
            <option value="heuristic">Heuristic (no API key)</option>
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>
        <label className="block py-3 text-xs font-extrabold">Model
          <input defaultValue={data.model} onBlur={(event) => event.target.value !== data.model && update.mutate({ model: event.target.value })} className="input-base mt-2" placeholder="Set in environment if empty" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-extrabold">Requests / minute<input type="number" min={1} max={120} defaultValue={data.requestLimitPerMinute} onBlur={(event) => update.mutate({ requestLimitPerMinute: Number(event.target.value) })} className="input-base mt-2" /></label>
          <label className="text-xs font-extrabold">Requests / day<input type="number" min={1} max={5000} defaultValue={data.requestLimitPerDay} onBlur={(event) => update.mutate({ requestLimitPerDay: Number(event.target.value) })} className="input-base mt-2" /></label>
          <label className="text-xs font-extrabold">Max response tokens<input type="number" min={60} max={4000} defaultValue={data.maxOutputTokens || 700} onBlur={(event) => update.mutate({ maxOutputTokens: Number(event.target.value) })} className="input-base mt-2" /></label>
        </div>
        <p className="mt-4 text-[11px] font-semibold text-slate-500">Server key present: {data.hasServerKey ? 'yes' : 'no'} · env provider: {data.envProvider || 'heuristic'}</p>
        <div className="mt-4 divide-y">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between py-3 text-sm font-bold">
              <span>{label}</span>
              <input type="checkbox" checked={features[key] !== false} onChange={(event) => update.mutate({ features: { [key]: event.target.checked } })} className="h-5 w-5 accent-violet-600" />
            </label>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">Usage</h2>
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-9 rounded-control border px-2 text-xs font-bold" aria-label="Analytics window">
            <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AdminStatCard icon={Activity} label="AI requests" value={analytics.data?.requests || 0} tone="violet" />
          <AdminStatCard icon={Sparkles} label="AI searches" value={analytics.data?.search || 0} tone="violet" />
          <AdminStatCard icon={TrendingUp} label="Successful searches" value={analytics.data?.successfulSearches || 0} tone="emerald" />
          <AdminStatCard icon={AlertTriangle} label="No-result searches" value={analytics.data?.noResultSearches || 0} tone="amber" />
          <AdminStatCard icon={Clock} label="Avg response ms" value={analytics.data?.averageResponseTimeMs || 0} tone="violet" />
          <AdminStatCard icon={Clock} label="p95 response ms" value={analytics.data?.p95ResponseTimeMs || 0} tone="violet" />
          <AdminStatCard icon={AlertTriangle} label="AI errors" value={analytics.data?.errors || 0} tone="rose" />
          <AdminStatCard icon={Activity} label="Cached responses" value={analytics.data?.cachedRequests || 0} tone="emerald" />
          <AdminStatCard icon={Bot} label="Listing assistant" value={analytics.data?.listingAssistantRequests || 0} tone="violet" />
          <AdminStatCard icon={TrendingUp} label="Recommendations" value={analytics.data?.recommendationRequests || 0} tone="emerald" />
          <AdminStatCard icon={Coins} label="Tokens (in+out)" value={usage?.tokensTotal || 0} tone="violet" />
          <AdminStatCard icon={Coins} label="Estimated cost (USD)" value={usage?.estimatedCostUsd || 0} tone="amber" />
        </div>

        {analytics.data?.popularFeatures?.length ? (
          <div className="mt-4 rounded-panel border bg-white p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Popular features</h3>
            <ul className="mt-2 space-y-1.5">
              {analytics.data.popularFeatures.map((feature: { feature: string; count: number }) => (
                <li key={feature.feature} className="flex items-center justify-between text-xs font-bold">
                  <span>{FEATURE_LABELS[feature.feature] || feature.feature}</span>
                  <span className="text-slate-500">{feature.count} requests</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {analytics.data?.providers?.length ? (
          <div className="mt-4 rounded-panel border bg-white p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Providers</h3>
            <ul className="mt-2 space-y-1.5">
              {analytics.data.providers.map((provider: { provider: string; count: number }) => (
                <li key={provider.provider} className="flex items-center justify-between text-xs font-bold">
                  <span className="capitalize">{provider.provider}</span>
                  <span className="text-slate-500">{provider.count} requests</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>}
  </DashboardLayout>;
}

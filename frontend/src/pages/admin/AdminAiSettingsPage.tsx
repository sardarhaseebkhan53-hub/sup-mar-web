import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Coins, Gauge, Sparkles, Timer, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { adminAiApi } from '../../services/apiClient';

const FEATURE_LABELS: Record<string, string> = {
  search: 'AI Search',
  assistant: 'AI Assistant',
  recommendations: 'Recommendations',
  listingAssistant: 'Listing Assistant',
  priceInsights: 'Price Insights',
  moderation: 'AI Moderation',
  semanticSearch: 'Semantic (embedding) search',
  support: 'AI Support',
};

export default function AdminAiSettingsPage() {
  useDocumentTitle('AI dashboard');
  const client = useQueryClient();
  const [days, setDays] = useState(30);

  const settings = useQuery({ queryKey: ['admin-ai-settings'], queryFn: async () => (await adminAiApi.settings()).data });
  const analytics = useQuery({ queryKey: ['admin-ai-analytics', days], queryFn: async () => (await adminAiApi.analytics(days)).data });
  const update = useMutation({
    mutationFn: (data: unknown) => adminAiApi.update(data),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-ai-settings'] }),
  });

  const data = settings.data || {};
  const features = data.features || {};
  const usage = analytics.data?.usage || {};
  const models: string[] = data.allowedModels?.[data.provider] || [];

  return (
    <DashboardLayout role="admin">
      <header>
        <p className="eyebrow">QAVLIO intelligence</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Sparkles className="text-violet-600" aria-hidden="true" /> AI dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">Provider credentials stay on the server. These toggles cannot be bypassed from the browser.</p>
      </header>

      {settings.isLoading ? (
        <div className="mt-6 h-72 animate-pulse rounded-panel bg-slate-200" />
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-panel border bg-white p-5">
            <h2 className="font-extrabold">Configuration</h2>

            <label className="mt-4 flex items-center justify-between py-3 text-sm font-bold">
              <span>AI enabled<span className="block text-[11px] font-normal text-slate-500">Master kill switch for every AI feature.</span></span>
              <input type="checkbox" checked={Boolean(data.enabled)} onChange={(event) => update.mutate({ enabled: event.target.checked })} className="h-5 w-5 accent-violet-600" />
            </label>

            <label className="block py-3 text-xs font-extrabold">Provider
              <select value={data.provider} onChange={(event) => update.mutate({ provider: event.target.value })} className="input-base mt-2">
                <option value="heuristic">Heuristic (no API key)</option>
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>

            <label className="block py-3 text-xs font-extrabold">Model
              <select value={data.model || ''} onChange={(event) => update.mutate({ model: event.target.value })} className="input-base mt-2">
                {models.map((model) => <option key={model} value={model}>{model || 'Provider default'}</option>)}
              </select>
              <span className="mt-1 block text-[10px] font-normal text-slate-400">Only allow-listed models can be selected — a cost control.</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-extrabold">Requests / minute
                <input type="number" min={1} max={120} defaultValue={data.requestLimitPerMinute} onBlur={(event) => update.mutate({ requestLimitPerMinute: Number(event.target.value) })} className="input-base mt-2" />
              </label>
              <label className="text-xs font-extrabold">Requests / day
                <input type="number" min={1} max={5000} defaultValue={data.requestLimitPerDay} onBlur={(event) => update.mutate({ requestLimitPerDay: Number(event.target.value) })} className="input-base mt-2" />
              </label>
              <label className="text-xs font-extrabold">Max response chars
                <input type="number" min={200} max={20000} defaultValue={data.maxResponseChars} onBlur={(event) => update.mutate({ maxResponseChars: Number(event.target.value) })} className="input-base mt-2" />
              </label>
            </div>

            <p className="mt-4 text-[11px] font-semibold text-slate-500">Server key present: {data.hasServerKey ? 'yes' : 'no'} · env provider: {data.envProvider || 'heuristic'}</p>

            <h3 className="mt-5 text-xs font-extrabold uppercase tracking-wider text-slate-400">Feature flags</h3>
            <div className="mt-1 divide-y">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between py-3 text-sm font-bold">
                  <span>{label}</span>
                  <input type="checkbox" checked={features[key] !== false} onChange={(event) => update.mutate({ features: { [key]: event.target.checked } })} className="h-5 w-5 accent-violet-600" />
                </label>
              ))}
            </div>

            {update.isError && <p role="alert" className="mt-3 rounded-control bg-red-50 p-2 text-[11px] font-bold text-red-700">Could not save that change.</p>}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-extrabold">Usage &amp; cost</h2>
              <label className="text-[11px] font-bold text-slate-500">
                <span className="sr-only">Reporting window</span>
                <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-9 rounded-control border px-2 text-xs font-bold">
                  <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AdminStatCard icon={Sparkles} label="AI requests" value={usage.requests ?? analytics.data?.requests ?? 0} tone="violet" />
              <AdminStatCard icon={Coins} label="Est. cost (USD)" value={Number(usage.estimatedCostUsd || 0).toFixed(4)} tone="amber" />
              <AdminStatCard icon={Gauge} label="Total tokens" value={usage.totalTokens || 0} tone="violet" />
              <AdminStatCard icon={Timer} label="Avg latency ms" value={usage.averageLatencyMs || analytics.data?.averageResponseTimeMs || 0} tone="violet" />
              <AdminStatCard icon={Timer} label="p95 latency ms" value={usage.p95LatencyMs || 0} tone="violet" />
              <AdminStatCard icon={TriangleAlert} label="Error rate" value={`${Math.round((usage.errorRate || 0) * 100)}%`} tone="rose" />
              <AdminStatCard icon={Sparkles} label="Successful searches" value={analytics.data?.successfulSearches || 0} tone="emerald" />
              <AdminStatCard icon={Sparkles} label="No-result searches" value={analytics.data?.noResultSearches || 0} tone="amber" />
            </div>

            {usage.features?.length > 0 && (
              <div className="mt-4 rounded-panel border bg-white p-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">By feature</h3>
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                      <th scope="col" className="py-1">Feature</th><th scope="col">Requests</th><th scope="col">Errors</th><th scope="col">Tokens</th><th scope="col">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.features.map((row: any) => (
                      <tr key={row.feature} className="border-t border-slate-100">
                        <td className="py-1.5 font-bold">{row.feature}</td>
                        <td>{row.requests}</td>
                        <td className={row.errors ? 'font-bold text-rose-600' : ''}>{row.errors}</td>
                        <td>{row.tokens}</td>
                        <td>${Number(row.costUsd || 0).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {usage.providers?.length > 0 && (
              <div className="mt-4 rounded-panel border bg-white p-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">By provider</h3>
                <ul className="mt-2 space-y-1 text-xs">
                  {usage.providers.map((row: any) => (
                    <li key={`${row.provider}-${row.model}`} className="flex justify-between border-t border-slate-100 py-1.5">
                      <span className="font-bold">{row.provider}{row.model ? ` · ${row.model}` : ''}</span>
                      <span>{row.requests} req · ${Number(row.costUsd || 0).toFixed(4)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {usage.recentErrors?.length > 0 && (
              <div className="mt-4 rounded-panel border border-rose-200 bg-rose-50 p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rose-700">
                  <AlertTriangle size={12} aria-hidden="true" /> Recent failures
                </h3>
                <ul className="mt-2 space-y-1 text-[11px] text-rose-900">
                  {usage.recentErrors.slice(0, 5).map((row: any, index: number) => (
                    <li key={index}>{row.feature}: {row.errorCode || 'error'} · {new Date(row.createdAt).toLocaleString()}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

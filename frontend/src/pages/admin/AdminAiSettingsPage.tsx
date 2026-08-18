import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { adminAiApi } from '../../services/apiClient';

export default function AdminAiSettingsPage() {
  useDocumentTitle('AI settings');
  const client = useQueryClient();
  const [days, setDays] = useState(30);
  const settings = useQuery({ queryKey: ['admin-ai-settings'], queryFn: async () => (await adminAiApi.settings()).data });
  const analytics = useQuery({ queryKey: ['admin-ai-analytics', days], queryFn: async () => (await adminAiApi.analytics(days)).data });
  const update = useMutation({ mutationFn: (data: unknown) => adminAiApi.update(data), onSuccess: () => client.invalidateQueries({ queryKey: ['admin-ai-settings'] }) });
  const data = settings.data || {};
  const features = data.features || {};
  return <DashboardLayout role="admin">
    <header>
      <p className="eyebrow">QAVLIO intelligence</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Sparkles className="text-violet-600" /> AI settings</h1>
      <p className="mt-2 text-sm text-slate-500">Provider credentials stay on the server. These toggles cannot be bypassed from the browser.</p>
    </header>
    {settings.isLoading ? <div className="mt-6 h-72 animate-pulse rounded-panel bg-slate-200" /> : <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
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
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-extrabold">Requests / minute<input type="number" min={1} max={120} defaultValue={data.requestLimitPerMinute} onBlur={(event) => update.mutate({ requestLimitPerMinute: Number(event.target.value) })} className="input-base mt-2" /></label>
          <label className="text-xs font-extrabold">Requests / day<input type="number" min={1} max={5000} defaultValue={data.requestLimitPerDay} onBlur={(event) => update.mutate({ requestLimitPerDay: Number(event.target.value) })} className="input-base mt-2" /></label>
        </div>
        <p className="mt-4 text-[11px] font-semibold text-slate-500">Server key present: {data.hasServerKey ? 'yes' : 'no'} · env provider: {data.envProvider || 'heuristic'}</p>
        <div className="mt-4 divide-y">
          {Object.entries({ assistant: 'AI Assistant', search: 'AI Search', recommendations: 'AI Recommendations', listingAssistant: 'AI Listing Assistant', support: 'AI Support', moderation: 'AI Moderation Assist' }).map(([key, label]) => (
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
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-9 rounded-control border px-2 text-xs font-bold">
            <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AdminStatCard icon={Sparkles} label="AI requests" value={analytics.data?.requests || 0} tone="violet" />
          <AdminStatCard icon={Sparkles} label="AI searches" value={analytics.data?.search || 0} tone="violet" />
          <AdminStatCard icon={Sparkles} label="Successful searches" value={analytics.data?.successfulSearches || 0} tone="emerald" />
          <AdminStatCard icon={Sparkles} label="No-result searches" value={analytics.data?.noResultSearches || 0} tone="amber" />
          <AdminStatCard icon={Sparkles} label="Support escalations" value={analytics.data?.supportEscalations || 0} tone="rose" />
          <AdminStatCard icon={Sparkles} label="Avg response ms" value={analytics.data?.averageResponseTimeMs || 0} tone="violet" />
          <AdminStatCard icon={Sparkles} label="AI errors" value={analytics.data?.errors || 0} tone="rose" />
        </div>
      </section>
    </div>}
  </DashboardLayout>;
}

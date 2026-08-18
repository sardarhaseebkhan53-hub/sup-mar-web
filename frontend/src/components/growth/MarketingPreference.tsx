import { useEffect, useState } from 'react';
import { buyerApi } from '../../services/apiClient';

export default function MarketingPreference() {
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    buyerApi.notificationPreferences().then(res=>{ setPrefs(res.data); setLoading(false); }).catch(()=>setLoading(false));
  }, []);

  const toggle = async (key: string, value: boolean) => {
    if (!prefs) return;
    setSaving(true);
    try {
      const updated = await buyerApi.updateNotifications({ [key]: value } as any);
      setPrefs(updated.data);
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="h-40 animate-pulse rounded-card bg-slate-100"/>;
  if (!prefs) return <p className="text-xs text-slate-500">Could not load preferences.</p>;

  const options = [
    { key: 'marketing', label: 'Marketing notifications', desc: 'New offers, campaigns, and promotions' },
    { key: 'promotions', label: 'Campaign notifications', desc: 'Campaigns matching your interests' },
    { key: 'recommendations', label: 'Recommendation notifications', desc: 'Personalized listing suggestions', fallback: 'savedSearchAlerts' },
    { key: 'listingAvailability', label: 'Wishlist campaign alerts', desc: 'When favorited listings are discounted' },
  ];

  return (
    <div className="rounded-panel border bg-white p-6">
      <h3 className="text-sm font-extrabold">Marketing Preferences</h3>
      <p className="mt-1 text-xs text-slate-500">Control how you receive growth and promotional content. Respecting opt-out is mandatory.</p>
      <div className="mt-4 divide-y">
        {options.map(opt=>{
          const val = prefs[opt.key] ?? prefs[opt.fallback as any] ?? false;
          return (
            <label key={opt.key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">{opt.label}</p>
                <p className="text-[11px] text-slate-500">{opt.desc}</p>
              </div>
              <input type="checkbox" checked={Boolean(val)} disabled={saving} onChange={e=>toggle(opt.key, e.target.checked)} className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-200 p-0.5 transition checked:bg-violet-600" />
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Every promotional message supports unsubscribe. Marketing frequency limits are enforced server-side.</p>
    </div>
  );
}

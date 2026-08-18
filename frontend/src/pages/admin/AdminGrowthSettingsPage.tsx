import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { growthApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/Button';

export default function AdminGrowthSettingsPage() {
  useDocumentTitle('Growth Settings - QAVLIO');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['growth-settings'], queryFn: async () => (await growthApi.settings()).data });
  const [form, setForm] = useState<any>(null);

  useEffect(()=>{ if (query.data) setForm(query.data); }, [query.data]);

  const save = useMutation({
    mutationFn: () => growthApi.updateSettings(form),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['growth-settings'] }),
  });

  if (query.isLoading) return <DashboardLayout role="admin"><div className="mt-6 h-80 animate-pulse rounded-panel bg-slate-200"/></DashboardLayout>;
  if (!form) return <DashboardLayout role="admin"><p className="mt-6 text-xs text-slate-500">No settings found.</p></DashboardLayout>;

  const update = (path:string, value:any) => {
    const keys = path.split('.');
    const newForm = { ...form };
    let cur = newForm;
    for (let i=0;i<keys.length-1;i++) { cur[keys[i]] = { ...cur[keys[i]] }; cur = cur[keys[i]]; }
    cur[keys[keys.length-1]] = value;
    setForm(newForm);
  };

  return (
    <DashboardLayout role="admin">
      <header>
        <p className="eyebrow">Growth engine</p>
        <h1 className="mt-2 text-3xl font-extrabold">Growth Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Configure referral rewards, eligibility, coupon limits, campaign defaults, reward expiration, marketing frequency.</p>
      </header>

      <div className="mt-6 grid gap-6">
        <section className="rounded-panel border bg-white p-6">
          <h2 className="text-sm font-extrabold">Referral</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold">Enabled<input type="checkbox" checked={form.referral?.enabled} onChange={e=>update('referral.enabled', e.target.checked)} className="ml-2"/></label>
            <label className="text-xs font-bold">Reward Type<select value={form.referral?.rewardType} onChange={e=>update('referral.rewardType', e.target.value)} className="ml-2 h-8 rounded border bg-white px-2 text-xs"><option value="listing_credit">Listing Credit</option><option value="promotion_credit">Promotion Credit</option><option value="account_credit">Account Credit</option><option value="coupon">Coupon</option><option value="points">Points</option></select></label>
            <label className="text-xs font-bold">Reward Amount<input type="number" value={form.referral?.rewardAmount} onChange={e=>update('referral.rewardAmount', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Expiration Days<input type="number" value={form.referral?.expirationDays} onChange={e=>update('referral.expirationDays', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Max Referrals / User<input type="number" value={form.referral?.maxReferralsPerUser} onChange={e=>update('referral.maxReferralsPerUser', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Require Verified Email<input type="checkbox" checked={form.referral?.eligibility?.requireVerifiedEmail} onChange={e=>update('referral.eligibility.requireVerifiedEmail', e.target.checked)} className="ml-2"/></label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">Max Per Day (Fraud)<input type="number" value={form.referral?.fraud?.maxPerDay} onChange={e=>update('referral.fraud.maxPerDay', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Flag Volume<input type="number" value={form.referral?.fraud?.flagVolume} onChange={e=>update('referral.fraud.flagVolume', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
        </section>

        <section className="rounded-panel border bg-white p-6">
          <h2 className="text-sm font-extrabold">Coupons</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-bold">Default Expiry Days<input type="number" value={form.coupons?.defaultExpiryDays} onChange={e=>update('coupons.defaultExpiryDays', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Brute Force Window (min)<input type="number" value={form.coupons?.bruteForceWindowMinutes} onChange={e=>update('coupons.bruteForceWindowMinutes', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Brute Force Max Attempts<input type="number" value={form.coupons?.bruteForceMaxAttempts} onChange={e=>update('coupons.bruteForceMaxAttempts', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
        </section>

        <section className="rounded-panel border bg-white p-6">
          <h2 className="text-sm font-extrabold">Campaigns</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-bold">Default Expiry Days<input type="number" value={form.campaigns?.defaultExpiryDays} onChange={e=>update('campaigns.defaultExpiryDays', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
        </section>

        <section className="rounded-panel border bg-white p-6">
          <h2 className="text-sm font-extrabold">Rewards</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-bold">Enabled<input type="checkbox" checked={form.rewards?.enabled} onChange={e=>update('rewards.enabled', e.target.checked)} className="ml-2"/></label>
            <label className="text-xs font-bold">Expiration Enabled<input type="checkbox" checked={form.rewards?.expirationEnabled} onChange={e=>update('rewards.expirationEnabled', e.target.checked)} className="ml-2"/></label>
            <label className="text-xs font-bold">Expiration Days<input type="number" value={form.rewards?.defaultExpirationDays} onChange={e=>update('rewards.defaultExpirationDays', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
        </section>

        <section className="rounded-panel border bg-white p-6">
          <h2 className="text-sm font-extrabold">Marketing Frequency</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-bold">Daily Limit<input type="number" value={form.marketing?.dailyLimit} onChange={e=>update('marketing.dailyLimit', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Weekly Limit<input type="number" value={form.marketing?.weeklyLimit} onChange={e=>update('marketing.weeklyLimit', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Cooldown Hours<input type="number" value={form.marketing?.cooldownHours} onChange={e=>update('marketing.cooldownHours', Number(e.target.value))} className="mt-1 h-10 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
        </section>

        <div className="flex justify-end"><Button onClick={()=>save.mutate()} loading={save.isPending}>Save Settings</Button></div>
        {save.isSuccess && <p className="text-xs font-bold text-emerald-600">Settings saved.</p>}
        {save.isError && <p className="text-xs font-bold text-red-600">{(save.error as any)?.message || 'Failed to save'}</p>}
      </div>
    </DashboardLayout>
  );
}

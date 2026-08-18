import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Plus } from 'lucide-react';
import { useState } from 'react';
import ReferralCard from '../components/growth/ReferralCard';
import ReferralLink from '../components/growth/ReferralLink';
import ReferralHistory from '../components/growth/ReferralHistory';
import RewardBalance from '../components/growth/RewardBalance';
import { referralApi, rewardApi } from '../services/apiClient';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/ui/Button';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthProvider';

export default function ReferralsPage() {
  useDocumentTitle('Referrals - QAVLIO');
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const client = useQueryClient();
  const [customCode, setCustomCode] = useState('');

  const query = useQuery({ queryKey: ['referrals-my'], queryFn: async () => (await referralApi.my()).data, enabled: isAuthenticated });
  const rewardsQuery = useQuery({ queryKey: ['rewards-balance'], queryFn: async () => (await rewardApi.balance()).data, enabled: isAuthenticated });
  const historyQuery = useQuery({ queryKey: ['referrals-history'], queryFn: async () => (await referralApi.history('?limit=50')).data, enabled: isAuthenticated });

  const create = useMutation({
    mutationFn: () => referralApi.createCode(customCode || undefined),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['referrals-my'] }); setCustomCode(''); },
  });

  if (!isAuthenticated) {
    return (
      <div className="container-shell py-12">
        <h1 className="text-3xl font-extrabold">Referrals</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to view your referral code, share link, and track rewards.</p>
      </div>
    );
  }

  const data = query.data;
  const code = data?.code?.code || data?.code?.code || data?.code || '';
  const link = data?.link || '';
  const stats = data?.stats || {};
  const referrals = data?.referrals || historyQuery.data?.referrals || [];

  return (
    <DashboardLayout role="customer">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth & rewards</p>
          <h1 className="mt-2 text-3xl font-extrabold">Referrals</h1>
          <p className="mt-2 text-sm text-slate-500">Your unique code, shareable link, and complete referral history. All rewards are validated server-side.</p>
        </div>
        {!code && <Button onClick={() => create.mutate()} loading={create.isPending}><Plus size={14}/>Generate Code</Button>}
      </header>

      {query.isLoading ? <div className="mt-6 h-40 animate-pulse rounded-panel bg-slate-200"/> : (
        <>
          {code ? (
            <div className="mt-6 grid gap-6">
              <ReferralCard stats={stats} code={data?.code}/>
              <ReferralLink code={code} link={link}/>
              {rewardsQuery.data && <RewardBalance balance={rewardsQuery.data}/>}
              <section>
                <h2 className="text-sm font-extrabold">Custom code (optional)</h2>
                <p className="mt-1 text-xs text-slate-500">You can request a custom code. Avoid sensitive personal information.</p>
                <div className="mt-3 flex gap-2">
                  <input value={customCode} onChange={e=>setCustomCode(e.target.value.toUpperCase())} placeholder="MYCODE" className="h-11 w-64 rounded-control border bg-white px-4 text-sm font-bold uppercase tracking-widest" />
                  <Button variant="secondary" size="sm" onClick={()=>create.mutate()} loading={create.isPending}>Update Code</Button>
                </div>
              </section>
              <section>
                <h2 className="text-sm font-extrabold">Referral History</h2>
                <p className="mt-1 text-xs text-slate-500">Status: Pending → Eligible → Rewarded. Fraud checks are applied without auto-punishing via IP alone.</p>
                <div className="mt-3"><ReferralHistory referrals={referrals}/></div>
              </section>
            </div>
          ) : (
            <div className="mt-6 rounded-panel border border-dashed bg-white p-12 text-center">
              <Gift className="mx-auto text-violet-400"/>
              <h2 className="mt-4 font-extrabold">No referral code yet</h2>
              <p className="mt-2 text-xs text-slate-500">Generate your unique QAVLIO referral code. Example: QAVLIO-HASEEB-7X (random is preferred for privacy).</p>
              <div className="mt-5 flex justify-center"><Button onClick={()=>create.mutate()} loading={create.isPending}><Plus size={14}/>Generate Referral Code</Button></div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

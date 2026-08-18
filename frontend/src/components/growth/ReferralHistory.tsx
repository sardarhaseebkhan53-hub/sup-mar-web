import CampaignStatusBadge from './CampaignStatusBadge';

export default function ReferralHistory({ referrals }: { referrals: any[] }) {
  if (!referrals?.length) return <div className="rounded-card border border-dashed bg-white p-10 text-center"><p className="text-sm font-bold">No referrals yet</p><p className="mt-2 text-xs text-slate-500">Share your code to start earning rewards.</p></div>;
  return (
    <div className="overflow-hidden rounded-panel border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reward</th></tr>
          </thead>
          <tbody className="divide-y">
            {referrals.map((r:any)=><tr key={r.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 font-mono font-bold">{r.code}</td>
              <td className="px-4 py-3"><CampaignStatusBadge status={r.status}/></td>
              <td className="px-4 py-3">{r.reward?.amount ? `${r.reward.amount} ${r.reward.currency || 'PKR'}` : '—'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

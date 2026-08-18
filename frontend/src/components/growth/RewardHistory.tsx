import CampaignStatusBadge from './CampaignStatusBadge';

export default function RewardHistory({ transactions }: { transactions: any[] }) {
  if (!transactions?.length) return <div className="rounded-card border border-dashed bg-white p-8 text-center text-xs text-slate-500">No reward transactions yet.</div>;
  return (
    <div className="overflow-hidden rounded-panel border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((t:any)=><tr key={t._id || t.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 capitalize">{t.type}</td>
              <td className="px-4 py-3 capitalize">{t.source}</td>
              <td className="px-4 py-3 font-bold">{t.amount>0?'+':''}{t.amount} PKR</td>
              <td className="px-4 py-3"><CampaignStatusBadge status={t.status}/></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { adminTrustApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function AdminRiskPage() {
  useDocumentTitle('Risk assessments');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-risks'], queryFn: async () => (await adminTrustApi.risks('riskLevel=High')).data });
  const update = useMutation({ mutationFn: (id: string) => adminTrustApi.updateRisk(id, { reviewed: true }), onSuccess: () => client.invalidateQueries({ queryKey: ['admin-risks'] }) });
  return <DashboardLayout role="admin">
    <header><p className="eyebrow">Trust operations</p><h1 className="mt-2 text-3xl font-extrabold">High-risk listings</h1><p className="mt-2 text-sm text-slate-500">Signals are not proof of fraud. Review them before taking a listing action.</p></header>
    {query.isLoading ? <div className="mt-5 h-64 animate-pulse rounded-card bg-slate-200" /> : <div className="mt-5 space-y-3">{(query.data?.assessments || []).map((item: any) => <article key={item.id} className="rounded-card border bg-white p-4"><div className="flex items-start gap-3"><ShieldAlert className="text-amber-600" /><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold">{item.listingId}</h2><p className="mt-1 text-[11px] text-slate-500">{item.riskLevel} · {(item.signals || []).join(', ') || 'No signals'}</p></div><button type="button" onClick={() => update.mutate(item.id)} className="rounded-control border px-3 py-1.5 text-[10px] font-extrabold">{item.reviewed ? 'Reviewed' : 'Mark reviewed'}</button></div></article>)}{!query.data?.assessments?.length && <div className="rounded-panel border border-dashed p-12 text-center"><h2 className="font-extrabold">No high-risk listings in this window.</h2></div>}</div>}
  </DashboardLayout>;
}

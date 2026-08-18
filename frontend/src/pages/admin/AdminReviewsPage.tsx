import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { adminTrustApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function AdminReviewsPage() {
  useDocumentTitle('Review moderation');
  const client = useQueryClient();
  const [status, setStatus] = useState('');
  const query = useQuery({ queryKey: ['admin-reviews', status], queryFn: async () => (await adminTrustApi.reviews(status ? `status=${status}` : '')).data });
  const update = useMutation({ mutationFn: ({ id, next }: { id: string; next: string }) => adminTrustApi.reviewStatus(id, next), onSuccess: () => client.invalidateQueries({ queryKey: ['admin-reviews'] }) });
  return <DashboardLayout role="admin">
    <header><p className="eyebrow">Trust operations</p><h1 className="mt-2 text-3xl font-extrabold">Reviews</h1><p className="mt-2 text-sm text-slate-500">Approve, hide, remove, or restore marketplace reviews. Actions are audited.</p></header>
    <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-5 h-10 rounded-control border px-3 text-xs"><option value="">All statuses</option>{['Published', 'Pending', 'Hidden', 'Removed'].map((item) => <option key={item}>{item}</option>)}</select>
    {query.isLoading ? <div className="mt-5 h-64 animate-pulse rounded-card bg-slate-200" /> : <div className="mt-5 space-y-3">{(query.data?.reviews || []).map((item: any) => <article key={item.id} className="rounded-card border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-extrabold">{item.title || 'Review'}</h2><span className="text-[10px] font-bold">{item.status}</span></div><p className="mt-2 text-xs text-slate-600">{item.comment}</p><div className="mt-3 flex flex-wrap gap-2">{['Published', 'Hidden', 'Removed'].map((next) => <button key={next} type="button" onClick={() => update.mutate({ id: item.id, next })} className="rounded-control border px-3 py-1.5 text-[10px] font-extrabold">{next}</button>)}</div></article>)}{!query.data?.reviews?.length && <div className="rounded-panel border border-dashed p-12 text-center"><Star className="mx-auto text-slate-300" /><h2 className="mt-3 font-extrabold">No reviews match this queue.</h2></div>}</div>}
  </DashboardLayout>;
}

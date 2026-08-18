import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import DashboardHeading from '../../components/dashboard/DashboardHeading';
import ReviewCard from '../../components/trust/ReviewCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { trustApi } from '../../services/apiClient';

export default function SellerReviewsPage() {
  useDocumentTitle('Seller reviews');
  const client = useQueryClient();
  const [text, setText] = useState<Record<string, string>>({});
  const query = useQuery({ queryKey: ['seller-review-inbox'], queryFn: async () => (await trustApi.sellerInbox()).data });
  const respond = useMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => trustApi.respond(id, value), onSuccess: () => client.invalidateQueries({ queryKey: ['seller-review-inbox'] }) });
  return <DashboardLayout role="seller">
    <DashboardHeading eyebrow="Reputation" title="Seller reviews" description="Respond to published reviews about your listings. You cannot change someone else’s review." action={null} />
    {query.isLoading ? <div className="h-48 animate-pulse rounded-panel bg-slate-200" /> : !query.data?.length ? <p className="rounded-panel border border-dashed p-10 text-center text-sm text-slate-500">No published reviews yet.</p> : <div className="space-y-4">{query.data.map((review: any) => <div key={review.id} className="space-y-2"><ReviewCard review={review} />{!review.response && <form onSubmit={(event) => { event.preventDefault(); respond.mutate({ id: review.id, value: text[review.id] || '' }); }} className="rounded-card border bg-white p-4"><label className="text-xs font-extrabold">Seller response<textarea value={text[review.id] || ''} onChange={(event) => setText((current) => ({ ...current, [review.id]: event.target.value }))} className="input-base mt-2 min-h-20 py-2" /></label><button type="submit" className="mt-3 h-9 rounded-control bg-ink-950 px-4 text-[11px] font-extrabold text-white">Publish response</button></form>}</div>)}</div>}
  </DashboardLayout>;
}

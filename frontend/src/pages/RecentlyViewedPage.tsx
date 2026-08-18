import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PublicListingGrid } from '../components/listing-detail/PublicListingGrid';
import DashboardHeading from '../components/dashboard/DashboardHeading';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import DashboardLayout from '../layouts/DashboardLayout';
import { buyerApi } from '../services/apiClient';

export default function RecentlyViewedPage() {
  useDocumentTitle('Recently viewed');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['recently-viewed'], queryFn: async () => (await buyerApi.recentlyViewed()).data });
  const clear = useMutation({ mutationFn: () => buyerApi.clearRecentlyViewed(), onSuccess: () => client.invalidateQueries({ queryKey: ['recently-viewed'] }) });
  return <DashboardLayout role="customer">
    <DashboardHeading eyebrow="Private history" title="Recently viewed" description="Only you can see this browsing history. Sellers never receive it." action={<button type="button" onClick={() => clear.mutate()} className="rounded-control border px-3 py-2 text-xs font-extrabold">Clear recently viewed</button>} />
    {query.isLoading ? <div className="h-48 animate-pulse rounded-panel bg-slate-200" /> : <PublicListingGrid listings={query.data || []} empty="You have not viewed any listings yet." />}
  </DashboardLayout>;
}

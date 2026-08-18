import { useQuery } from '@tanstack/react-query';
import DashboardHeading from '../../components/dashboard/DashboardHeading';
import ReviewCard from '../../components/trust/ReviewCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { trustApi } from '../../services/apiClient';

export default function MyReviewsPage() {
  useDocumentTitle('My reviews');
  const query = useQuery({ queryKey: ['my-reviews'], queryFn: async () => (await trustApi.mine()).data });
  return <DashboardLayout role="customer">
    <DashboardHeading eyebrow="Your activity" title="My reviews" description="Reviews you published after a QAVLIO conversation with a seller." action={null} />
    {query.isLoading ? <div className="h-48 animate-pulse rounded-panel bg-slate-200" /> : !query.data?.length ? <p className="rounded-panel border border-dashed p-10 text-center text-sm text-slate-500">You have not published a review yet.</p> : <div className="space-y-3">{query.data.map((review: any) => <ReviewCard key={review.id} review={review} />)}</div>}
  </DashboardLayout>;
}

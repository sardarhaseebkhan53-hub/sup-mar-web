import { useQuery } from '@tanstack/react-query';
import DashboardHeading from '../../components/dashboard/DashboardHeading';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { trustApi } from '../../services/apiClient';

export default function MyReportsPage() {
  useDocumentTitle('My reports');
  const query = useQuery({ queryKey: ['my-reports'], queryFn: async () => (await trustApi.myReports()).data });
  return <DashboardLayout role="customer">
    <DashboardHeading eyebrow="Trust & safety" title="My reports" description="A private list of reports you submitted. Internal moderation notes are not shown here." action={null} />
    {query.isLoading ? <div className="h-48 animate-pulse rounded-panel bg-slate-200" /> : !query.data?.length ? <p className="rounded-panel border border-dashed p-10 text-center text-sm text-slate-500">You have not submitted a report.</p> : <div className="space-y-3">{query.data.map((item: any) => <article key={item.id} className="rounded-card border bg-white p-4"><p className="text-sm font-extrabold capitalize">{item.type} · {item.reason}</p><p className="mt-1 text-[11px] text-slate-500">{item.id} · {item.status}</p></article>)}</div>}
  </DashboardLayout>;
}

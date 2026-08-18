import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { SellerEmptyState, SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { notificationApi } from '../../services/apiClient';

/** Seller notification center (§49–50) — inquiries, listing states, promotions, reviews, inventory. */
export default function SellerNotificationsPage() {
  useDocumentTitle('Notifications');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['seller-notifications'], queryFn: async () => (await notificationApi.list()).data, staleTime: 15_000 });
  const readAll = useMutation({ mutationFn: () => notificationApi.readAll(), onSuccess: () => client.invalidateQueries({ queryKey: ['seller-notifications'] }) });
  const read = useMutation({ mutationFn: (id: string) => notificationApi.read(id), onSuccess: () => client.invalidateQueries({ queryKey: ['seller-notifications'] }) });
  const data = query.data;

  return <DashboardLayout role="seller">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Stay current</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Bell className="text-violet-600" size={28} aria-hidden="true" /> Notifications</h1>
        <p className="mt-2 text-sm text-slate-500">Inquiries, listing decisions, promotions, payments, reviews, and low inventory — as they happen.</p>
      </div>
      <button type="button" onClick={() => readAll.mutate()} disabled={readAll.isPending || !data?.unread} className="inline-flex h-10 items-center gap-2 rounded-control border bg-white px-4 text-xs font-extrabold disabled:opacity-40"><CheckCheck size={14} aria-hidden="true" /> Mark all as read</button>
    </header>

    <div className="mt-6">
      {query.isLoading ? <SellerLoadingState rows={5} /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : data && (data.notifications.length === 0
        ? <SellerEmptyState icon={Bell} title="No notifications yet" description="Seller events will land here as your business grows." />
        : <ul className="space-y-2" role="list" aria-label="Your notifications">
          {data.notifications.map((notification: any) => (
            <li key={notification.id} role="listitem" className={`flex items-start gap-3 rounded-card border p-4 ${notification.read ? 'bg-white' : 'border-violet-200 bg-violet-50/60'}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700" aria-hidden="true"><Bell size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold">{notification.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-600">{notification.body}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{notification.type.replace('_', ' ')} · {new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              {!notification.read && <button type="button" onClick={() => read.mutate(notification.id)} className="h-8 shrink-0 rounded-control border px-2.5 text-[9px] font-extrabold">Mark read</button>}
            </li>
          ))}
        </ul>)}
    </div>
  </DashboardLayout>;
}

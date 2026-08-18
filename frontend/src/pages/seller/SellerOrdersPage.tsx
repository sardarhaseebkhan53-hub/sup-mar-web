import { useQuery } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { useState } from 'react';
import PaymentStatus from '../../components/payments/PaymentStatus';
import { SellerEmptyState, SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';
import { formatPrice } from '../../utils/formatters';

/** Orders (§27–28) — the seller's marketplace orders with status timelines, no credentials. */
export default function SellerOrdersPage() {
  useDocumentTitle('Orders');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: '20', ...(type !== 'all' && { type }) }).toString();
  const query = useQuery({ queryKey: ['seller-orders', params], queryFn: async () => (await sellerCenterApi.orders(params)).data, staleTime: 30_000 });
  const detail = useQuery({ queryKey: ['seller-order', selectedId], enabled: Boolean(selectedId), queryFn: async () => (await sellerCenterApi.order(selectedId!)).data });
  const data = query.data;

  return <DashboardLayout role="seller">
    <header>
      <p className="eyebrow">Commerce</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><PackageCheck className="text-violet-600" size={28} aria-hidden="true" /> Orders</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{data?.note || 'Your marketplace transactions with status and timeline.'}</p>
    </header>

    <div className="mt-6 rounded-card border bg-white p-3">
      <label className="sr-only" htmlFor="order-type">Order type</label>
      <select id="order-type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="h-10 rounded-control border px-3 text-xs font-bold">
        <option value="all">All order types</option>
        <option value="listing_fee">Listing fees</option>
        <option value="promotion">Promotions</option>
        <option value="package">Packages</option>
      </select>
    </div>

    <div className="mt-5">
      {query.isLoading ? <SellerLoadingState /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : data && (data.orders.length === 0
        ? <SellerEmptyState title="No orders in this view" description="Listing-fee, promotion, and package orders will appear here with payment status." />
        : <div className="overflow-x-auto rounded-card border bg-white">
          <table className="w-full min-w-[720px] text-left">
            <caption className="sr-only">Your marketplace orders</caption>
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>{['Order ID', 'Type', 'Listing', 'Amount', 'Status', 'Date', ''].map((head) => <th key={head} scope="col" className="px-4 py-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {data.orders.map((order: any) => <tr key={order.id} className="border-t">
                <th scope="row" className="px-4 py-3 text-xs font-extrabold">{order.reference}</th>
                <td className="px-4 py-3 text-[11px] font-bold capitalize text-slate-600">{String(order.type).replace('_', ' ')}</td>
                <td className="max-w-48 truncate px-4 py-3 text-[11px] font-semibold text-slate-600">{order.listingTitle || '—'}</td>
                <td className="px-4 py-3 text-xs font-extrabold">{formatPrice(order.amount, order.currency)}</td>
                <td className="px-4 py-3"><PaymentStatus status={order.status} /></td>
                <td className="px-4 py-3 text-[10px] text-slate-500">{new Date(order.date).toLocaleDateString()}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => setSelectedId(order.id)} className="h-8 rounded-control border px-2.5 text-[10px] font-extrabold">Details</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>)}
    </div>

    {selectedId && <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/40 p-4" role="dialog" aria-modal="true" aria-label="Order details">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-panel border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-extrabold">Order {detail.data?.payment?.reference || 'details'}</h2>
          <button type="button" onClick={() => setSelectedId(null)} className="grid h-9 w-9 place-items-center rounded-control border text-slate-500" aria-label="Close order details">✕</button>
        </div>
        {detail.isLoading && <p role="status" className="mt-4 text-xs font-bold text-slate-500">Loading order…</p>}
        {detail.data && <>
          <dl className="mt-4 space-y-2 text-xs">
            {[['Type', detail.data.payment.type], ['Amount', formatPrice(detail.data.payment.amount, detail.data.payment.currency)], ['Status', detail.data.payment.status], ['Created', new Date(detail.data.payment.createdAt).toLocaleString()]].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 rounded-control bg-slate-50 px-3 py-2"><dt className="font-bold text-slate-500">{label}</dt><dd className="font-extrabold capitalize">{String(value)}</dd></div>
            ))}
          </dl>
          <div className="mt-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Timeline</p>
            <ol className="mt-2 space-y-2">
              {detail.data.timeline.map((entry: any) => (
                <li key={`${entry.status}-${entry.at}`} className="flex items-center gap-3 text-xs font-bold"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-[9px] font-extrabold text-violet-700" aria-hidden="true">✓</span><span className="capitalize">{entry.status}</span><span className="ml-auto text-[10px] text-slate-400">{new Date(entry.at).toLocaleString()}</span></li>
              ))}
            </ol>
          </div>
          <p className="mt-4 text-[10px] font-semibold text-slate-400">{detail.data.privacy}</p>
        </>}
      </div>
    </div>}
  </DashboardLayout>;
}

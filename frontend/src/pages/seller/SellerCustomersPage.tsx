import { useQuery } from '@tanstack/react-query';
import { Search, UserRound, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomerCard, { type Customer } from '../../components/seller/CustomerCard';
import { SellerEmptyState, SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

/** Customers (§21–23) — buyers who legitimately interacted with THIS seller only. */
export default function SellerCustomersPage() {
  useDocumentTitle('Customers');
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [selected, setSelected] = useState<Customer | null>(null);
  const detail = useQuery({ queryKey: ['seller-customer', selected?.buyerId], enabled: Boolean(selected), queryFn: async () => (await sellerCenterApi.customer(selected!.buyerId)).data });

  const queryParams = new URLSearchParams({ page: '1', limit: '24', ...(q.trim() && { q: q.trim() }) }).toString();
  const query = useQuery({ queryKey: ['seller-customers', queryParams], queryFn: async () => (await sellerCenterApi.customers(queryParams)).data, staleTime: 30_000 });
  const data = query.data;

  return <DashboardLayout role="seller">
    <header>
      <p className="eyebrow">Relationships</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><UsersRound className="text-violet-600" size={28} aria-hidden="true" /> Customers</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">Buyers who contacted your listings. {data?.note || 'Private account details are never shown to sellers.'}</p>
    </header>

    <div className="mt-6 rounded-card border bg-white p-3">
      <label className="relative flex-1">
        <Search className="absolute start-3 top-3 text-slate-400" size={15} aria-hidden="true" />
        <span className="sr-only">Search customers</span>
        <input id="customer-search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search buyer name or listing" className="input-base !h-10 ps-9 text-xs" maxLength={80} />
      </label>
    </div>

    <div className="mt-5">
      {query.isLoading ? <SellerLoadingState /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : data && (data.customers.length === 0
        ? <SellerEmptyState icon={UserRound} title="No customers yet" description="When buyers message your listings, they will appear here with your shared interaction history." />
        : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.customers.map((customer: Customer) => <CustomerCard key={customer.buyerId} customer={customer} onOpen={setSelected} />)}</div>)}
    </div>

    {selected && <div className="fixed inset-0 z-modal grid place-items-center bg-ink-950/40 p-4" role="dialog" aria-modal="true" aria-label={`Customer profile: ${selected.name}`}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-panel border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold">{selected.name}</h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">{selected.conversationCount} conversation(s){selected.lastInteraction && ` · last ${new Date(selected.lastInteraction).toLocaleDateString()}`}</p>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-control border text-slate-500" aria-label="Close customer profile">✕</button>
        </div>
        {detail.isLoading && <p role="status" className="mt-4 text-xs font-bold text-slate-500">Loading profile…</p>}
        {detail.data && <>
          {detail.data.listingsContacted?.length > 0 && <div className="mt-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Listings contacted about</p><ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">{detail.data.listingsContacted.map((title: string) => <li key={title}>· {title}</li>)}</ul></div>}
          {detail.data.leads?.length > 0 && <div className="mt-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pipeline</p><ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">{detail.data.leads.map((lead: any) => <li key={lead.id} className="capitalize">· {lead.status}{lead.listingTitle ? ` — ${lead.listingTitle}` : ''}</li>)}</ul></div>}
          <p className="mt-5 rounded-card bg-slate-50 p-3 text-[10px] font-semibold leading-4 text-slate-500">{detail.data.privacy}</p>
        </>}
      </div>
    </div>}
  </DashboardLayout>;
}

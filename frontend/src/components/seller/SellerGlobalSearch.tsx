import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sellerCenterApi } from '../../services/apiClient';

type SearchData = {
  results: {
    listings: Array<{ publicId: string; title: string; status: string; href: string }>;
    leads: Array<{ id: string; buyerName: string; status: string }>;
    customers: Array<{ buyerId: string; name: string }>;
    orders: Array<{ id: string; reference: string; status: string }>;
  };
};

/**
 * SellerGlobalSearch (§57) — server-side, debounced search across listings, customers,
 * leads, and orders. Never loads the seller's whole dataset at once.
 */
export default function SellerGlobalSearch() {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!boxRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const query = useQuery({
    queryKey: ['seller-global-search', debounced],
    enabled: open && debounced.length >= 2,
    staleTime: 15_000,
    queryFn: async () => (await sellerCenterApi.search(debounced)).data as SearchData,
  });

  const results = query.data?.results;
  const total = results ? results.listings.length + results.leads.length + results.customers.length + results.orders.length : 0;

  return (
    <div ref={boxRef} className="relative hidden min-w-0 flex-1 md:block" role="search" aria-label="Search your business">
      <label htmlFor="seller-global-search" className="sr-only">Search listings, leads, customers, orders</label>
      <input
        id="seller-global-search"
        value={term}
        onChange={(event) => { setTerm(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search your listings, leads, customers, orders…"
        className="h-10 w-full rounded-control border border-slate-200 bg-slate-50 px-4 text-xs font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
        maxLength={80}
      />
      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-panel border bg-white shadow-floating" role="listbox" aria-label="Search results">
          {query.isLoading && <p role="status" className="px-4 py-3 text-xs font-bold text-slate-500">Searching your business…</p>}
          {query.isError && <p role="alert" className="px-4 py-3 text-xs font-bold text-rose-600">Search is unavailable right now.</p>}
          {results && total === 0 && <p className="px-4 py-3 text-xs font-semibold text-slate-500">No matches in your business for “{debounced}”.</p>}
          {results && total > 0 && <div className="max-h-80 overflow-y-auto divide-y text-left">
            {results.listings.length > 0 && <Group title="Listings">{results.listings.map((item) => <Link key={item.publicId} to={item.href} onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-xs font-bold hover:bg-violet-50"><span className="truncate">{item.title}</span><span className="text-[9px] capitalize text-slate-400">{item.status}</span></Link>)}</Group>}
            {results.leads.length > 0 && <Group title="Leads">{results.leads.map((lead) => <Link key={lead.id} to={`/seller/leads?q=${encodeURIComponent(lead.buyerName)}`} onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-xs font-bold hover:bg-violet-50"><span className="truncate">{lead.buyerName}</span><span className="text-[9px] capitalize text-slate-400">{lead.status}</span></Link>)}</Group>}
            {results.customers.length > 0 && <Group title="Customers">{results.customers.map((customer) => <Link key={customer.buyerId} to={`/seller/customers?q=${encodeURIComponent(customer.name)}`} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-xs font-bold hover:bg-violet-50">{customer.name}</Link>)}</Group>}
            {results.orders.length > 0 && <Group title="Orders">{results.orders.map((order) => <Link key={order.id} to="/seller/orders" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-xs font-bold hover:bg-violet-50"><span className="truncate">{order.reference}</span><span className="text-[9px] capitalize text-slate-400">{order.status}</span></Link>)}</Group>}
          </div>}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="bg-slate-50 px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{title}</p>{children}</div>;
}

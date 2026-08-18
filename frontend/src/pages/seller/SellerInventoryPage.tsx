import { useQuery } from '@tanstack/react-query';
import { Boxes } from 'lucide-react';
import { useState } from 'react';
import InventoryTable from '../../components/seller/InventoryTable';
import SellerStatCard from '../../components/seller/SellerStatCard';
import { SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

/** Inventory (§10–13) — simple for individuals, SKU + quantity tracking for business sellers. */
export default function SellerInventoryPage() {
  useDocumentTitle('Inventory');
  const [q, setQ] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20', stockStatus, ...(q.trim() && { q: q.trim() }) }).toString();
  const query = useQuery({ queryKey: ['seller-inventory', params], queryFn: async () => (await sellerCenterApi.inventory(params)).data, staleTime: 30_000 });
  const data = query.data;

  return <DashboardLayout role="seller">
    <header>
      <p className="eyebrow">Stock room</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Boxes className="text-violet-600" size={28} aria-hidden="true" /> Inventory</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{data?.modes?.note || 'Your listings with live stock status.'}</p>
    </header>

    {data && <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Inventory summary">
      <SellerStatCard icon={Boxes} label="Listings" value={data.summary.total} />
      <SellerStatCard icon={Boxes} label="Tracked (business)" value={data.summary.tracked} tone="cyan" />
      <SellerStatCard icon={Boxes} label="Low stock" value={data.summary.lowStock} tone="amber" hint="At or below your threshold" />
      <SellerStatCard icon={Boxes} label="Out of stock" value={data.summary.outOfStock} tone="rose" />
    </section>}

    <div className="mt-6 flex flex-wrap gap-2 rounded-card border bg-white p-3">
      <label className="sr-only" htmlFor="inventory-search">Search inventory</label>
      <input id="inventory-search" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Search title, SKU, or listing ID" className="input-base !h-10 min-w-[220px] flex-1 text-xs" maxLength={80} />
      <label className="sr-only" htmlFor="inventory-stock">Stock status</label>
      <select id="inventory-stock" value={stockStatus} onChange={(event) => { setStockStatus(event.target.value); setPage(1); }} className="h-10 rounded-control border px-3 text-xs font-bold">
        <option value="all">All stock states</option>
        <option value="in_stock">In stock</option>
        <option value="low_stock">Low stock</option>
        <option value="out_of_stock">Out of stock</option>
        <option value="not_tracked">Simple listings</option>
      </select>
    </div>

    <div className="mt-5">
      {query.isLoading ? <SellerLoadingState /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : data && <>
        <InventoryTable rows={data.inventory} quantityTracking={data.modes.quantityTracking} />
        {data.pagination.totalPages > 1 && <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Inventory pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="h-9 rounded-control border px-3 text-[10px] font-extrabold disabled:opacity-30">Previous</button>
          <span className="text-[10px] font-bold text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="h-9 rounded-control border px-3 text-[10px] font-extrabold disabled:opacity-30">Next</button>
        </nav>}
      </>}
    </div>
  </DashboardLayout>;
}

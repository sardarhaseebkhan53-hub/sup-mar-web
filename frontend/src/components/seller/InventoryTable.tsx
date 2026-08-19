import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageSearch } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sellerCenterApi } from '../../services/apiClient';
import { formatPrice } from '../../utils/formatters';
import ListingStatusBadge from '../listing/ListingStatusBadge';
import { SellerEmptyState } from './SellerStates';

export type InventoryRow = {
  publicId: string;
  slug: string;
  title: string;
  sku: string;
  categorySlug: string;
  price: number;
  currency: string;
  listingStatus: string;
  availability: string;
  stock: { tracked: boolean; quantity: number; lowStockThreshold: number; stayVisibleWhenOutOfStock: boolean };
  stockStatus: string;
  stockLabel: string;
  viewCount: number;
  updatedAt: string;
};

const STOCK_TONE: Record<string, string> = {
  in_stock: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  low_stock: 'bg-amber-50 text-amber-800 ring-amber-200',
  out_of_stock: 'bg-rose-50 text-rose-700 ring-rose-200',
  not_tracked: 'bg-slate-50 text-slate-500 ring-slate-200',
};

/**
 * InventoryTable (§10–13, §69) — SKU + quantity for business sellers, simple rows for
 * individuals. Stock edits save honestly (availability mirrors the real stock state).
 */
export default function InventoryTable({ rows, quantityTracking }: { rows: InventoryRow[]; quantityTracking: boolean }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ['seller-inventory'] });

  const duplicate = useMutation({
    mutationFn: (id: string) => sellerCenterApi.duplicateListing(id),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['seller-listings'] }); await refresh(); },
  });

  if (!rows.length) return <SellerEmptyState icon={PackageSearch} title="No listings in this view" description="Publish a listing and it will appear in your inventory with live stock status." />;

  return <>
    <div className="hidden overflow-x-auto rounded-card border bg-white md:block">
      <table className="w-full min-w-[760px] text-start">
        <caption className="sr-only">Your listing inventory</caption>
        <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
          <tr>{['Product / listing', 'SKU / reference', 'Stock', 'Price', 'Status', 'Last updated', 'Actions'].map((head) => <th key={head} scope="col" className="px-4 py-3">{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => <tr key={row.publicId} className="border-t align-middle">
            <th scope="row" className="max-w-64 truncate px-4 py-3 text-xs font-extrabold"><Link to={`/seller/listings/${row.publicId}`} className="hover:text-violet-700">{row.title || 'Untitled draft'}</Link></th>
            <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{row.sku || '—'}</td>
            <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ring-1 ${STOCK_TONE[row.stockStatus] || STOCK_TONE.not_tracked}`}>{row.stockLabel}{row.stock.tracked ? ` · ${row.stock.quantity}` : ''}</span></td>
            <td className="px-4 py-3 text-xs font-extrabold">{formatPrice(row.price, row.currency)}</td>
            <td className="px-4 py-3"><ListingStatusBadge status={row.listingStatus} /></td>
            <td className="px-4 py-3 text-[10px] text-slate-500">{new Date(row.updatedAt).toLocaleDateString()}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {quantityTracking && <button type="button" onClick={() => setEditing(row)} className="h-8 rounded-control border px-2.5 text-[10px] font-extrabold">Edit stock</button>}
                <button type="button" onClick={() => duplicate.mutate(row.publicId)} disabled={duplicate.isPending} className="h-8 rounded-control border px-2.5 text-[10px] font-bold text-violet-700 disabled:opacity-50">Duplicate</button>
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="space-y-3 md:hidden">
      {rows.map((row) => <article key={row.publicId} className="rounded-card border bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/seller/listings/${row.publicId}`} className="min-w-0 text-sm font-extrabold">{row.title || 'Untitled draft'}</Link>
          <ListingStatusBadge status={row.listingStatus} />
        </div>
        <p className="mt-1 text-xs font-extrabold">{formatPrice(row.price, row.currency)} <span className="font-semibold text-slate-400">· {row.sku || 'no SKU'}</span></p>
        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ring-1 ${STOCK_TONE[row.stockStatus] || STOCK_TONE.not_tracked}`}>{row.stockLabel}{row.stock.tracked ? ` · ${row.stock.quantity}` : ''}</span>
        <div className="mt-3 flex gap-2 border-t pt-3">
          {quantityTracking && <button type="button" onClick={() => setEditing(row)} className="h-8 rounded-control border px-3 text-[10px] font-extrabold">Edit stock</button>}
          <button type="button" onClick={() => duplicate.mutate(row.publicId)} disabled={duplicate.isPending} className="h-8 rounded-control border px-3 text-[10px] font-bold text-violet-700 disabled:opacity-50">Duplicate</button>
        </div>
      </article>)}
    </div>
    {editing && <StockEditor row={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}
  </>;
}

function StockEditor({ row, onClose, onSaved }: { row: InventoryRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const [sku, setSku] = useState(row.sku);
  const [tracked, setTracked] = useState(row.stock.tracked);
  const [quantity, setQuantity] = useState(row.stock.quantity);
  const [threshold, setThreshold] = useState(row.stock.lowStockThreshold);
  const [stayVisible, setStayVisible] = useState(row.stock.stayVisibleWhenOutOfStock);
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => sellerCenterApi.updateInventory(row.publicId, {
      sku: sku.trim() || undefined,
      stock: tracked ? { tracked, quantity, lowStockThreshold: threshold, stayVisibleWhenOutOfStock: stayVisible } : { tracked: false },
    }),
    onSuccess: () => void onSaved(),
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not save stock settings'),
  });

  return <div className="fixed inset-0 z-modal grid place-items-center bg-ink-950/40 p-4" role="dialog" aria-modal="true" aria-label={`Stock settings for ${row.title}`}>
    <form className="w-full max-w-md rounded-panel border bg-white p-5" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <h2 className="text-sm font-extrabold">Stock settings — {row.title}</h2>
      <label className="mt-4 block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">SKU / reference
        <input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={40} className="input-base mt-1 !h-10 text-xs" placeholder="e.g. LAP-MBp-13" />
      </label>
      <label className="mt-3 flex items-center justify-between py-2 text-xs font-bold"><span>Track quantity</span><input type="checkbox" checked={tracked} onChange={(event) => setTracked(event.target.checked)} className="h-5 w-5 accent-violet-600" /></label>
      {tracked && <>
        <label className="mt-2 block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Quantity
          <input type="number" min={0} max={1000000} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="input-base mt-1 !h-10 text-xs" />
        </label>
        <label className="mt-2 block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Low stock threshold
          <input type="number" min={0} max={100000} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="input-base mt-1 !h-10 text-xs" />
        </label>
        <label className="mt-3 flex items-center justify-between py-2 text-xs font-bold"><span>Keep listing visible when out of stock<br /><span className="text-[9px] font-semibold text-slate-400">It will display “Out of stock” honestly.</span></span><input type="checkbox" checked={stayVisible} onChange={(event) => setStayVisible(event.target.checked)} className="h-5 w-5 accent-violet-600" /></label>
      </>}
      {error && <p role="alert" className="mt-3 text-[11px] font-bold text-rose-600">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={save.isPending} className="h-10 flex-1 rounded-control bg-violet-600 text-xs font-extrabold text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save stock settings'}</button>
        <button type="button" onClick={onClose} className="h-10 rounded-control border px-4 text-xs font-bold">Cancel</button>
      </div>
    </form>
  </div>;
}

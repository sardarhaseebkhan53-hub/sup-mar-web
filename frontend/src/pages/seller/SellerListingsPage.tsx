import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Copy, Eye, MoreHorizontal, PackageOpen, Pencil, Play, Plus, Rocket, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ListingStatusBadge from '../../components/listing/ListingStatusBadge';
import { listingApi, sellerCenterApi } from '../../services/apiClient';
import DashboardLayout from '../../layouts/DashboardLayout';
import { formatPrice } from '../../utils/formatters';
import { Pagination } from '../../components/ui/Pagination';
import { useCategories } from '../../hooks/useCategories';
import type { Category } from '../../types/marketplace';

interface Item { publicId: string; title: string; price: number; currency: 'PKR'; status: string; viewCount: number; favoriteCount: number; createdAt: string; media?: Array<{ url: string; thumbnailUrl?: string }>; }

const TABS = [
  { id: '', label: 'All' },
  { id: 'published', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'sold', label: 'Sold' },
  { id: 'expired', label: 'Expired' },
  { id: 'draft', label: 'Draft' },
];

export default function SellerListingsPage({ forcedStatus }: { forcedStatus?: string }) {
  const [params, setParams] = useSearchParams();
  const categories = useCategories() as Category[];
  const client = useQueryClient();
  const [confirm, setConfirm] = useState<{ item: Item; action: 'pause'|'resume'|'sold'|'remove' }>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'pause' | 'activate' | 'archive' | null>(null);
  const [bulkResult, setBulkResult] = useState('');
  const activeTab = forcedStatus || params.get('status') || '';
  const queryString = new URLSearchParams({ page: params.get('page') || '1', limit: '20', sort: params.get('sort') || 'newest', ...(params.get('q') && { q: params.get('q')! }), ...(params.get('category') && { category: params.get('category')! }), ...(params.get('date') && { date: params.get('date')! }), ...(params.get('minPrice') && { minPrice: params.get('minPrice')! }), ...(params.get('maxPrice') && { maxPrice: params.get('maxPrice')! }), ...((activeTab) && { status: activeTab }) }).toString();
  const query = useQuery({ queryKey: ['seller-listings', queryString], queryFn: async () => (await listingApi.sellerListings(queryString)).data });
  const mutation = useMutation({ mutationFn: async ({ item, action }: NonNullable<typeof confirm>) => action === 'remove' ? listingApi.remove(item.publicId) : listingApi.transition(item.publicId, action), onSuccess: async () => { setConfirm(undefined); await client.invalidateQueries({ queryKey: ['seller-listings'] }); } });
  const duplicate = useMutation({
    mutationFn: (publicId: string) => sellerCenterApi.duplicateListing(publicId),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['seller-listings'] }); await client.invalidateQueries({ queryKey: ['seller-inventory'] }); },
  });
  const bulk = useMutation({
    mutationFn: (action: 'pause' | 'activate' | 'archive') => sellerCenterApi.bulkListings({ listingIds: [...selected], action, confirm: action === 'archive' }),
    onSuccess: async (response) => { setBulkAction(null); setSelected(new Set()); setBulkResult(`${response.data.updated} listing(s) updated${response.data.failed ? `, ${response.data.failed} skipped` : ''}.`); await client.invalidateQueries({ queryKey: ['seller-listings'] }); },
  });

  const data = query.data;
  const update = (key: string, value: string) => setParams((current) => { const next = new URLSearchParams(current); value ? next.set(key, value) : next.delete(key); if (key !== 'page') next.delete('page'); return next; });
  const toggleAll = () => setSelected((current) => current.size === (data?.listings || []).length ? new Set() : new Set((data?.listings || []).map((item: Item) => item.publicId)));
  const toggleOne = (publicId: string) => setSelected((current) => { const next = new Set(current); next.has(publicId) ? next.delete(publicId) : next.add(publicId); return next; });

  return <DashboardLayout role="seller"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Inventory</p><h1 className="mt-1 text-3xl font-extrabold">{forcedStatus === 'draft' ? 'Drafts' : forcedStatus === 'sold' ? 'Sold items' : 'My listings'}</h1><p className="mt-2 text-sm text-slate-500">Manage, update and understand your marketplace inventory.</p></div><Link to="/seller/listings/new" className="inline-flex h-11 items-center gap-2 rounded-control bg-gold-300 px-5 text-xs font-extrabold text-ink-950"><Plus size={16} /> Add listing</Link></div>

    {!forcedStatus && <nav className="mt-6 flex gap-1 overflow-x-auto rounded-card border bg-white p-1.5" aria-label="Listing status tabs">
      {TABS.map((tab) => <button key={tab.id} type="button" onClick={() => update('status', tab.id)} aria-pressed={activeTab === tab.id} className={`shrink-0 rounded-control px-3.5 py-2 text-[11px] font-extrabold ${activeTab === tab.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{tab.label}</button>)}
    </nav>}

    {!forcedStatus && data?.summary && <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{[['Active',data.summary.active],['Pending',data.summary.pending],['Sold',data.summary.sold],['Total views',data.summary.views]].map(([label,value]) => <div key={label} className="rounded-card border bg-white p-4 shadow-sm"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-extrabold">{Number(value).toLocaleString()}</p></div>)}</div>}

    <div className="mt-6 flex flex-wrap gap-2 rounded-card border bg-white p-3"><label className="relative min-w-[220px] flex-1"><Search className="absolute start-3 top-3 text-slate-400" size={16} /><span className="sr-only">Search your listings</span><input className="input-base !h-10 ps-9" value={params.get('q') || ''} onChange={(e) => update('q', e.target.value)} placeholder="Search title or listing ID" /></label>{!forcedStatus && <select aria-label="Filter category" className="h-10 rounded-control border px-3 text-xs font-bold" value={params.get('category') || ''} onChange={(e) => update('category', e.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.shortName || category.name}</option>)}</select>}<select aria-label="Filter date" className="h-10 rounded-control border px-3 text-xs font-bold" value={params.get('date') || ''} onChange={(e) => update('date', e.target.value)}><option value="">Any date</option><option value="today">Today</option><option value="7days">Last 7 days</option><option value="30days">Last 30 days</option></select><input aria-label="Minimum price" type="number" min="0" placeholder="Min price" className="h-10 w-28 rounded-control border px-3 text-xs" value={params.get('minPrice') || ''} onChange={(e) => update('minPrice', e.target.value)} /><input aria-label="Maximum price" type="number" min="0" placeholder="Max price" className="h-10 w-28 rounded-control border px-3 text-xs" value={params.get('maxPrice') || ''} onChange={(e) => update('maxPrice', e.target.value)} /><select aria-label="Sort listings" className="h-10 rounded-control border px-3 text-xs font-bold" value={params.get('sort') || 'newest'} onChange={(e) => update('sort', e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="most-viewed">Most viewed</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option></select></div>

    {selected.size > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-violet-200 bg-violet-50 p-3" role="group" aria-label={`Bulk actions for ${selected.size} listings`}>
      <p className="text-xs font-extrabold text-violet-900">{selected.size} selected</p>
      <button type="button" onClick={() => setBulkAction('pause')} className="h-9 rounded-control border bg-white px-3 text-[10px] font-extrabold">Pause</button>
      <button type="button" onClick={() => setBulkAction('activate')} className="h-9 rounded-control border bg-white px-3 text-[10px] font-extrabold">Activate</button>
      <button type="button" onClick={() => setBulkAction('archive')} className="h-9 rounded-control border border-rose-200 bg-white px-3 text-[10px] font-extrabold text-rose-600">Archive</button>
      <button type="button" onClick={() => setSelected(new Set())} className="ms-auto h-9 rounded-control px-3 text-[10px] font-bold text-slate-500">Clear selection</button>
    </div>}
    {bulkResult && <p role="status" className="mt-3 rounded-card bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{bulkResult}</p>}

    {query.isLoading ? <div className="mt-5 h-64 animate-pulse rounded-card bg-slate-200" /> : !data?.listings?.length ? <div className="mt-5 rounded-panel border border-dashed bg-white px-5 py-16 text-center"><PackageOpen className="mx-auto text-violet-500" size={38} /><h2 className="mt-4 text-xl font-extrabold">Your marketplace is waiting for its first listing.</h2><p className="mt-2 text-sm text-slate-500">Create your first listing and start connecting with buyers.</p><Link to="/seller/listings/new" className="mt-5 inline-flex rounded-control bg-violet-600 px-5 py-3 text-xs font-extrabold text-white">Create listing</Link></div> : <><div className="mt-5 hidden overflow-hidden rounded-card border bg-white md:block"><table className="w-full text-start"><thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><tr><th scope="col" className="px-4 py-3"><input type="checkbox" checked={selected.size === data.listings.length && data.listings.length > 0} onChange={toggleAll} aria-label="Select all listings on this page" className="h-4 w-4 accent-violet-600" /></th>{['Listing','Price','Status','Views','Favorites','Created','Actions'].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{data.listings.map((item: Item) => <tr key={item.publicId} className={`border-t ${selected.has(item.publicId) ? 'bg-violet-50/40' : ''}`}><td className="px-4"><input type="checkbox" checked={selected.has(item.publicId)} onChange={() => toggleOne(item.publicId)} aria-label={`Select ${item.title}`} className="h-4 w-4 accent-violet-600" /></td><ListingRow item={item} act={(action) => setConfirm({ item, action })} onDuplicate={() => duplicate.mutate(item.publicId)} duplicateBusy={duplicate.isPending} /></tr>)}</tbody></table></div><div className="mt-5 space-y-3 md:hidden">{data.listings.map((item: Item) => <ListingMobile key={item.publicId} item={item} act={(action) => setConfirm({ item, action })} onDuplicate={() => duplicate.mutate(item.publicId)} />)}</div></>}

    {data?.pagination?.totalPages > 1 && <div className="mt-7"><Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={(page) => update('page', String(page))} /></div>}

    <ConfirmDialog confirmationLabel={undefined} confirmationValue="" onConfirmationChange={() => undefined} children={null} open={Boolean(confirm)} title={confirm?.action === 'remove' ? 'Delete this listing?' : confirm?.action === 'sold' ? 'Is this item sold?' : `${confirm?.action === 'pause' ? 'Pause' : 'Resume'} this listing?`} description={confirm?.action === 'remove' ? 'The listing will be removed from your dashboard and marketplace. This action cannot be undone.' : 'QAVLIO will update its marketplace visibility immediately.'} confirmText={confirm?.action === 'remove' ? 'Delete listing' : `Confirm ${confirm?.action || ''}`} busy={mutation.isPending} onCancel={() => setConfirm(undefined)} onConfirm={() => confirm && mutation.mutate(confirm)} />

    <ConfirmDialog confirmationLabel={undefined} confirmationValue="" onConfirmationChange={() => undefined} children={null} open={Boolean(bulkAction)} title={bulkAction === 'archive' ? 'Archive selected listings?' : `${bulkAction === 'pause' ? 'Pause' : 'Activate'} selected listings?`} description={bulkAction === 'archive' ? 'Archiving removes the selected listings from the marketplace. This action cannot be undone.' : `This will update ${selected.size} listing(s) immediately.`} confirmText={bulkAction === 'archive' ? 'Archive permanently' : `Yes, ${bulkAction || ''}`} busy={bulk.isPending} onCancel={() => setBulkAction(null)} onConfirm={() => bulkAction && bulk.mutate(bulkAction)} />
  </DashboardLayout>;
}
function ListingRow({ item, act, onDuplicate, duplicateBusy }: { item: Item; act: (action: 'pause'|'resume'|'sold'|'remove') => void; onDuplicate: () => void; duplicateBusy?: boolean }) { return <>
  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-12 w-16 overflow-hidden rounded-lg bg-slate-100">{item.media?.[0] && <img src={item.media[0].thumbnailUrl || item.media[0].url} className="h-full w-full object-cover" alt="" />}</div><div><Link to={`/seller/listings/${item.publicId}`} className="line-clamp-1 max-w-60 text-xs font-extrabold hover:text-violet-700">{item.title || 'Untitled draft'}</Link><span className="text-[9px] text-slate-400">{item.publicId}</span></div></div></td>
  <td className="px-4 text-xs font-extrabold">{formatPrice(Number(item.price || 0), 'PKR')}</td>
  <td className="px-4"><ListingStatusBadge status={item.status} /></td>
  <td className="px-4 text-xs">{item.viewCount || 0}</td>
  <td className="px-4 text-xs">{item.favoriteCount || 0}</td>
  <td className="px-4 text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
  <td className="px-4"><Actions item={item} act={act} onDuplicate={onDuplicate} duplicateBusy={duplicateBusy} compact /></td>
</>; }
function ListingMobile({ item, act, onDuplicate }: { item: Item; act: (action: 'pause'|'resume'|'sold'|'remove') => void; onDuplicate: () => void }) { return <article className="rounded-card border bg-white p-4"><div className="flex gap-3"><div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">{item.media?.[0] && <img src={item.media[0].url} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><ListingStatusBadge status={item.status} /><h2 className="mt-2 line-clamp-2 text-sm font-extrabold">{item.title || 'Untitled draft'}</h2><p className="mt-1 text-xs font-bold">{formatPrice(Number(item.price || 0), 'PKR')}</p></div></div><div className="mt-4 flex items-center justify-between border-t pt-3 text-[10px] text-slate-500"><span><Eye size={12} className="inline" /> {item.viewCount || 0} views</span><Actions item={item} act={act} onDuplicate={onDuplicate} /></div></article>; }
function Actions({ item, act, onDuplicate, duplicateBusy, compact }: { item: Item; act: (action: 'pause'|'resume'|'sold'|'remove') => void; onDuplicate: () => void; duplicateBusy?: boolean; compact?: boolean }) { return <div className={`flex items-center gap-1 ${compact ? '' : 'flex-wrap'}`}><Link to={`/seller/listings/${item.publicId}`} className="tap-target grid place-items-center rounded-lg hover:bg-slate-100" aria-label={`View ${item.title}`}><Eye size={15} /></Link><Link to={`/seller/listings/${item.publicId}/edit`} className="tap-target grid place-items-center rounded-lg hover:bg-slate-100" aria-label={`Edit ${item.title}`}><Pencil size={15} /></Link><button onClick={onDuplicate} disabled={duplicateBusy} className="tap-target grid place-items-center rounded-lg text-violet-700 hover:bg-violet-50 disabled:opacity-40" aria-label={`Duplicate ${item.title}`} title="Duplicate as draft"><Copy size={15} /></button>{item.status === 'published' && <Link to={`/seller/listings/${item.publicId}/promote`} className="tap-target grid place-items-center rounded-lg text-violet-700 hover:bg-violet-50" aria-label={`Promote ${item.title}`}><Rocket size={15}/></Link>}{item.status === 'published' && <button onClick={() => act('pause')} className="h-9 rounded-lg px-2 text-[10px] font-bold">Pause</button>}{item.status === 'paused' && <button onClick={() => act('resume')} className="h-9 rounded-lg px-2 text-[10px] font-bold inline-flex items-center gap-1"><Play size={11}/>Resume</button>}{['published','paused'].includes(item.status) && <button onClick={() => act('sold')} className="h-9 rounded-lg px-2 text-[10px] font-bold">Sold</button>}<button onClick={() => act('remove')} className="tap-target grid place-items-center text-red-600" aria-label={`Delete ${item.title}`} title="Archive"><Archive size={15} /></button>{!compact && <button onClick={() => act('remove')} className="tap-target grid place-items-center text-red-600" aria-hidden="true" tabIndex={-1}><MoreHorizontal size={16} /></button>}</div>; }

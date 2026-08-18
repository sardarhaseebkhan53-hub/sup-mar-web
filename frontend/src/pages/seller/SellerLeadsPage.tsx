import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LeadPipeline from '../../components/seller/LeadPipeline';
import { SellerEmptyState, SellerErrorState, SellerLoadingState } from '../../components/seller/SellerStates';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { sellerCenterApi } from '../../services/apiClient';

const SOURCES = ['all', 'message', 'inquiry', 'call_request', 'contact', 'manual'];

/** Leads (§15–20) — the seller's own pipeline with search, filters, and manual capture. */
export default function SellerLeadsPage() {
  useDocumentTitle('Leads');
  const [params] = useSearchParams();
  const client = useQueryClient();
  const [q, setQ] = useState(params.get('q') || '');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const queryParams = new URLSearchParams({ page: String(page), limit: '60', ...(q.trim() && { q: q.trim() }), ...(source !== 'all' && { source }) }).toString();
  const query = useQuery({ queryKey: ['seller-leads', queryParams], queryFn: async () => (await sellerCenterApi.leads(queryParams)).data, staleTime: 20_000 });
  const data = query.data;

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => sellerCenterApi.createLead(payload),
    onSuccess: async () => { setFormOpen(false); await client.invalidateQueries({ queryKey: ['seller-leads'] }); },
  });

  return <DashboardLayout role="seller">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Pipeline</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><UsersRound className="text-violet-600" size={28} aria-hidden="true" /> Leads</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Move buyers through New → Contacted → Interested → Negotiating → Won. Notes stay private to your business.</p>
      </div>
      <button type="button" onClick={() => setFormOpen((open) => !open)} className="inline-flex h-11 items-center gap-2 rounded-control bg-violet-600 px-5 text-xs font-extrabold text-white" aria-expanded={formOpen}><Plus size={15} aria-hidden="true" /> Add lead</button>
    </header>

    {formOpen && <form className="mt-5 rounded-panel border bg-white p-5" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); create.mutate({ buyerName: String(form.get('buyerName') || ''), listingPublicId: String(form.get('listingPublicId') || '') || undefined, source: String(form.get('source') || 'manual'), note: String(form.get('note') || '') || undefined }); }} aria-label="Add a lead manually">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Buyer name<input name="buyerName" required maxLength={120} className="input-base mt-1 !h-10 text-xs" placeholder="Ayesha Khan" /></label>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Listing ID (optional)<input name="listingPublicId" maxLength={40} className="input-base mt-1 !h-10 text-xs" placeholder="QV-…" /></label>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Source
          <select name="source" defaultValue="manual" className="input-base mt-1 !h-10 text-xs"><option value="manual">Manual</option><option value="message">Message</option><option value="inquiry">Listing inquiry</option><option value="call_request">Call request</option><option value="contact">Contact request</option></select>
        </label>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">First note (optional)<input name="note" maxLength={500} className="input-base mt-1 !h-10 text-xs" placeholder="Customer asked for delivery." /></label>
      </div>
      {create.isError && <p role="alert" className="mt-3 text-[11px] font-bold text-rose-600">{create.error instanceof Error ? create.error.message : 'Could not add lead.'}</p>}
      <button type="submit" disabled={create.isPending} className="mt-4 h-10 rounded-control bg-violet-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{create.isPending ? 'Adding…' : 'Add to pipeline'}</button>
    </form>}

    <div className="mt-6 flex flex-wrap gap-2 rounded-card border bg-white p-3">
      <label className="sr-only" htmlFor="lead-search">Search leads</label>
      <input id="lead-search" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Search buyer, listing, or note" className="input-base !h-10 min-w-[220px] flex-1 text-xs" maxLength={80} />
      <label className="sr-only" htmlFor="lead-source">Source filter</label>
      <select id="lead-source" value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} className="h-10 rounded-control border px-3 text-xs font-bold">
        {SOURCES.map((item) => <option key={item} value={item}>{item === 'all' ? 'All sources' : item.replace('_', ' ')}</option>)}
      </select>
    </div>

    <div className="mt-5">
      {query.isLoading ? <SellerLoadingState /> : query.isError ? <SellerErrorState retry={() => void query.refetch()} /> : data && (data.leads.length === 0
        ? <SellerEmptyState title="No leads yet" description="Leads appear when buyers message you, or add them yourself to track every deal." />
        : <LeadPipeline leads={data.leads} counts={data.counts} />)}
    </div>

    {data?.pagination?.totalPages > 1 && <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Lead pages">
      <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="h-9 rounded-control border px-3 text-[10px] font-extrabold disabled:opacity-30">Previous</button>
      <span className="text-[10px] font-bold text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages}</span>
      <button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="h-9 rounded-control border px-3 text-[10px] font-extrabold disabled:opacity-30">Next</button>
    </nav>}
  </DashboardLayout>;
}

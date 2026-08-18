import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MessageCircle, StickyNote } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sellerCenterApi } from '../../services/apiClient';

export const LEAD_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interested', label: 'Interested' },
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
] as const;

export type Lead = {
  id: string;
  buyerId: string | null;
  buyerName: string;
  listingPublicId: string;
  listingTitle: string;
  source: string;
  status: string;
  value: number | null;
  notes: Array<{ id: string; body: string; createdAt: string }>;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * LeadPipeline (§16, §69) — kanban-style stage columns. Sellers move leads between
 * stages; every change is saved against the seller's own pipeline.
 */
export default function LeadPipeline({ leads, counts }: { leads: Lead[]; counts?: Record<string, number> }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" role="list" aria-label="Lead pipeline stages">
    {LEAD_STAGES.map((stage) => {
      const stageLeads = leads.filter((lead) => lead.status === stage.id);
      return (
        <section key={stage.id} aria-label={`${stage.label} leads`} className="rounded-card border bg-slate-50/80 p-3" role="list">
          <header className="flex items-center justify-between px-1 pb-2">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{stage.label}</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-extrabold text-slate-500 ring-1 ring-slate-200">{counts?.[stage.id] ?? stageLeads.length}</span>
          </header>
          <div className="space-y-2">
            {stageLeads.length === 0 && <p className="rounded-control border border-dashed bg-white/60 px-2 py-4 text-center text-[10px] font-semibold text-slate-400">No leads</p>}
            {stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        </section>
      );
    })}
  </div>;
}

export function LeadCard({ lead }: { lead: Lead }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [note, setNote] = useState('');

  const move = async (direction: 1 | -1) => {
    const currentIndex = LEAD_STAGES.findIndex((stage) => stage.id === lead.status);
    const next = LEAD_STAGES[currentIndex + direction];
    if (!next || busy) return;
    setBusy(true);
    try {
      await sellerCenterApi.updateLead(lead.id, { status: next.id });
      await client.invalidateQueries({ queryKey: ['seller-leads'] });
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!note.trim() || busy) return;
    setBusy(true);
    try {
      await sellerCenterApi.updateLead(lead.id, { note: note.trim() });
      setNote('');
      await client.invalidateQueries({ queryKey: ['seller-leads'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article role="listitem" className="rounded-card border bg-white p-3 shadow-sm" aria-label={`Lead: ${lead.buyerName || 'Unnamed buyer'}, stage ${lead.status}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold">{lead.buyerName || 'Unnamed buyer'}</p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">{lead.listingTitle || lead.listingPublicId || 'No listing'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-violet-700">{lead.source.replace('_', ' ')}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[9px] font-semibold text-slate-400">
        <span>Added {new Date(lead.createdAt).toLocaleDateString()}</span>
        {lead.lastContactedAt && <span aria-hidden="true">·</span>}
        {lead.lastContactedAt && <span>Contacted {new Date(lead.lastContactedAt).toLocaleDateString()}</span>}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <button type="button" onClick={() => void move(-1)} disabled={busy || lead.status === 'new'} aria-label={`Move ${lead.buyerName} to previous stage`} className="grid h-7 w-7 place-items-center rounded-lg border text-slate-500 disabled:opacity-30"><ArrowRight size={12} className="rotate-180" aria-hidden="true" /></button>
        <button type="button" onClick={() => void move(1)} disabled={busy || lead.status === 'won' || lead.status === 'lost'} aria-label={`Move ${lead.buyerName} to next stage`} className="grid h-7 w-7 place-items-center rounded-lg border text-slate-500 disabled:opacity-30"><ArrowRight size={12} aria-hidden="true" /></button>
        <button type="button" onClick={() => setNotesOpen((open) => !open)} aria-expanded={notesOpen} aria-label={`Notes for ${lead.buyerName}`} className="grid h-7 w-7 place-items-center rounded-lg border text-slate-500"><StickyNote size={12} aria-hidden="true" /></button>
        {lead.buyerId && <Link to="/messages" className="ml-auto grid h-7 w-7 place-items-center rounded-lg border text-violet-700" aria-label={`Open messages with ${lead.buyerName}`}><MessageCircle size={12} aria-hidden="true" /></Link>}
      </div>
      {lead.notes.length > 0 && !notesOpen && <p className="mt-2 line-clamp-2 rounded-control bg-slate-50 p-2 text-[10px] font-semibold text-slate-600">{lead.notes[0].body}</p>}
      {notesOpen && <div className="mt-2 space-y-2" aria-live="polite">
        {lead.notes.map((entry) => <p key={entry.id} className="rounded-control bg-slate-50 p-2 text-[10px] font-semibold text-slate-600">{entry.body}<span className="mt-1 block text-[8px] text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span></p>)}
        <div className="flex gap-1">
          <label className="sr-only" htmlFor={`note-${lead.id}`}>Add a private note</label>
          <input id={`note-${lead.id}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Customer asked for delivery…" className="h-8 min-w-0 flex-1 rounded-control border px-2 text-[10px] font-semibold" />
          <button type="button" onClick={() => void saveNote()} disabled={busy || !note.trim()} className="h-8 rounded-control bg-violet-600 px-2 text-[9px] font-extrabold text-white disabled:opacity-40">Save</button>
        </div>
        <p className="text-[8px] font-semibold text-slate-400">Notes stay private to your business team.</p>
      </div>}
    </article>
  );
}

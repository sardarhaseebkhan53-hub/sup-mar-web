import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import AIUsageIndicator from './AIUsageIndicator';

/**
 * Shared accept/reject control (§58): every AI-generated seller field offers
 * Apply, Edit, and Dismiss — AI never silently replaces seller content.
 */
export function SuggestionControls({ value, onApply, onDismiss, applyLabel = 'Apply' }: { value: string; onApply: (value: string) => void; onDismiss: () => void; applyLabel?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`edit-${applyLabel}`}>Edit suggestion before applying</label>
        <input id={`edit-${applyLabel}`} value={draft} onChange={(event) => setDraft(event.target.value)} className="input-base min-w-0 flex-1 !h-9 text-xs" maxLength={4000} />
        <button type="button" onClick={() => { onApply(draft.trim() || value); setEditing(false); }} className="inline-flex h-9 items-center gap-1 rounded-control bg-violet-600 px-3 text-[10px] font-extrabold text-white"><Check size={12} aria-hidden="true" /> Apply edit</button>
        <button type="button" onClick={() => { setDraft(value); setEditing(false); }} className="h-9 rounded-control border px-3 text-[10px] font-bold">Cancel</button>
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" onClick={() => onApply(value)} className="inline-flex h-9 items-center gap-1 rounded-control bg-violet-600 px-3 text-[10px] font-extrabold text-white"><Check size={12} aria-hidden="true" /> {applyLabel}</button>
      <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1 rounded-control border border-violet-200 bg-white px-3 text-[10px] font-extrabold text-violet-800"><Pencil size={12} aria-hidden="true" /> Edit</button>
      <button type="button" onClick={onDismiss} className="inline-flex h-9 items-center gap-1 rounded-control border px-3 text-[10px] font-bold text-slate-500"><X size={12} aria-hidden="true" /> Dismiss</button>
    </div>
  );
}

export function SuggestionFrame({ title, tone = 'suggestion', note, children }: { title: string; tone?: 'suggestion' | 'data' | 'draft'; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-white p-3 ring-1 ring-ink-900/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{title}</p>
        <AIUsageIndicator tone={tone} />
      </div>
      {children}
      {note && <p className="mt-2 text-[10px] font-semibold text-slate-400">{note}</p>}
    </div>
  );
}

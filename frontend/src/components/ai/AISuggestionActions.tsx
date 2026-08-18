import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
  value: string;
  label: string;
  note?: string;
  multiline?: boolean;
  onApply: (value: string) => void;
  onDismiss?: () => void;
}

/**
 * Shared Apply / Edit / Dismiss control for every seller-facing AI suggestion.
 * A suggestion is never written into the seller's listing until Apply is pressed.
 */
export default function AISuggestionActions({ value, label, note, multiline, onApply, onDismiss }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<'idle' | 'applied' | 'dismissed'>('idle');

  if (state === 'dismissed') return null;

  const apply = (next: string) => {
    onApply(next);
    setState('applied');
    setEditing(false);
  };

  return (
    <div className="mt-3 rounded-card border border-violet-100 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-violet-700">AI suggestion</span>
      </div>

      {editing ? (
        <>
          <label className="sr-only" htmlFor={`edit-${label}`}>Edit the {label} suggestion before applying it</label>
          {multiline ? (
            <textarea id={`edit-${label}`} value={draft} onChange={(event) => setDraft(event.target.value)} className="input-base mt-2 min-h-32 resize-y py-2 text-xs" />
          ) : (
            <input id={`edit-${label}`} value={draft} onChange={(event) => setDraft(event.target.value)} className="input-base mt-2 text-xs" maxLength={120} />
          )}
        </>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-ink-800">{value}</p>
      )}

      {note && <p className="mt-2 text-[10px] text-slate-400">{note}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {state === 'applied' ? (
          <p className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700"><Check size={12} aria-hidden="true" /> Applied to your listing</p>
        ) : (
          <>
            <button type="button" onClick={() => apply(editing ? draft : value)} className="inline-flex h-8 items-center gap-1 rounded-control bg-violet-600 px-3 text-[11px] font-extrabold text-white transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1">
              <Check size={12} aria-hidden="true" /> Apply
            </button>
            <button type="button" onClick={() => { setDraft(value); setEditing((current) => !current); }} aria-pressed={editing} className="inline-flex h-8 items-center gap-1 rounded-control border border-slate-200 px-3 text-[11px] font-extrabold text-ink-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <Pencil size={12} aria-hidden="true" /> {editing ? 'Cancel edit' : 'Edit'}
            </button>
            <button type="button" onClick={() => { setState('dismissed'); onDismiss?.(); }} className="inline-flex h-8 items-center gap-1 rounded-control px-3 text-[11px] font-extrabold text-slate-500 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <X size={12} aria-hidden="true" /> Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

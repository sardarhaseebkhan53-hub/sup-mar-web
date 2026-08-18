import { useMutation } from '@tanstack/react-query';
import { Check, LoaderCircle, Tags, X } from 'lucide-react';
import { useState } from 'react';
import { aiApi } from '../../services/apiClient';
import type { AiAttributeSuggestion } from '../../types/ai';

interface Props {
  title: string;
  description: string;
  category?: string;
  attributes?: Record<string, string | number | boolean>;
  onApply: (key: string, value: string | number | boolean) => void;
}

/** Attribute extraction. Each row is applied individually — nothing is bulk-written. */
export default function AIAttributeSuggestionPanel({ title, description, category, attributes, onApply }: Props) {
  const [resolved, setResolved] = useState<Record<string, 'applied' | 'dismissed'>>({});
  const run = useMutation({
    mutationFn: async () => (await aiApi.listingAttributes({ title, description, category, attributes })).data as AiAttributeSuggestion,
    onSuccess: () => setResolved({}),
  });

  const pending = (run.data?.attributes || []).filter((item) => !resolved[item.key]);

  return (
    <div>
      <button
        type="button"
        onClick={() => run.mutate()}
        disabled={run.isPending || !description.trim()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-50 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {run.isPending ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <Tags size={13} aria-hidden="true" />} Extract attributes
      </button>

      <span className="sr-only" role="status" aria-live="polite">{run.isPending ? 'Reading attributes from your text' : run.data ? `${run.data.attributes.length} attributes found` : ''}</span>

      {run.isError && <p role="alert" className="mt-2 text-[11px] font-semibold text-amber-800">Attribute extraction is unavailable right now.</p>}

      {run.data && (
        <div className="mt-3 rounded-card border border-violet-100 bg-white p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Found in your own text</p>
          {pending.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">{run.data.attributes.length ? 'All suggestions handled.' : run.data.note}</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {pending.map((item) => (
                <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-ink-900">{item.label}: <span className="font-semibold">{String(item.value)}</span></p>
                    <p className="text-[10px] text-slate-400">{item.source}{item.alreadySet ? ' · replaces your current value' : ''}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => { onApply(item.key, item.value); setResolved((current) => ({ ...current, [item.key]: 'applied' })); }} aria-label={`Apply ${item.label} ${item.value}`} className="inline-flex h-8 items-center gap-1 rounded-control bg-violet-600 px-2.5 text-[11px] font-extrabold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                      <Check size={11} aria-hidden="true" /> Apply
                    </button>
                    <button type="button" onClick={() => setResolved((current) => ({ ...current, [item.key]: 'dismissed' }))} aria-label={`Dismiss ${item.label}`} className="inline-flex h-8 items-center gap-1 rounded-control px-2.5 text-[11px] font-extrabold text-slate-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                      <X size={11} aria-hidden="true" /> Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {run.data.missing?.length > 0 && <p className="mt-2 text-[10px] text-slate-400">Still missing: {run.data.missing.join(', ')}. Add these manually.</p>}
          <p className="mt-2 text-[10px] text-slate-400">{run.data.note}</p>
        </div>
      )}
    </div>
  );
}

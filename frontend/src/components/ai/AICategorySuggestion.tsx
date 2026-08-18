import { useMutation } from '@tanstack/react-query';
import { Check, FolderTree, LoaderCircle, X } from 'lucide-react';
import { useState } from 'react';
import { aiApi } from '../../services/apiClient';
import type { AiCategorySuggestion } from '../../types/ai';

interface Props {
  title: string;
  description: string;
  attributes?: Record<string, string | number | boolean>;
  onApply: (category: string, subcategory?: string) => void;
}

export default function AICategorySuggestionPanel({ title, description, attributes, onApply }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const run = useMutation({
    mutationFn: async () => (await aiApi.listingCategory({ title, description, attributes })).data as AiCategorySuggestion,
    onSuccess: () => setDismissed(false),
  });
  const data = run.data;

  return (
    <div>
      <button
        type="button"
        onClick={() => run.mutate()}
        disabled={run.isPending || (!title.trim() && !description.trim())}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-50 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {run.isPending ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <FolderTree size={13} aria-hidden="true" />} Suggest category
      </button>

      <span className="sr-only" role="status" aria-live="polite">{run.isPending ? 'Finding the best category' : data ? `Suggested category ${data.path.join(' then ')}` : ''}</span>

      {run.isError && <p role="alert" className="mt-2 text-[11px] font-semibold text-amber-800">Category suggestion is unavailable right now.</p>}

      {data && !dismissed && (
        <div className="mt-3 rounded-card border border-violet-100 bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Suggested category</p>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-extrabold text-violet-700">{Math.round(data.confidence * 100)}% confidence</span>
          </div>
          <p className="mt-1 text-xs font-extrabold text-ink-900">{data.path.join(' → ')}</p>
          <p className="mt-1 text-[10px] text-slate-400">{data.note}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { onApply(data.category.slug, data.subcategory?.slug); setDismissed(true); }} className="inline-flex h-8 items-center gap-1 rounded-control bg-violet-600 px-3 text-[11px] font-extrabold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <Check size={12} aria-hidden="true" /> Confirm category
            </button>
            <button type="button" onClick={() => setDismissed(true)} className="inline-flex h-8 items-center gap-1 rounded-control px-3 text-[11px] font-extrabold text-slate-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <X size={12} aria-hidden="true" /> Dismiss
            </button>
          </div>

          {data.alternatives?.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Or choose another</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {data.alternatives.map((item) => (
                  <button key={item.slug} type="button" onClick={() => { onApply(item.slug); setDismissed(true); }} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold text-ink-800 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

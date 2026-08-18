import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { GitCompareArrows, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { aiApi } from '../../services/apiClient';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import type { CompareResponse } from '../../types/ai';
import AIUsageIndicator from './AIUsageIndicator';

const MAX_COMPARE = 3;

const label = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());

/**
 * CompareListings (§17–18) — floating tray for the AI assistant's compare selection.
 * Up to MAX_COMPARE listings; only attributes that actually exist are shown; the AI
 * summary cites the compared values instead of claiming superiority.
 */
export default function CompareListings() {
  const { compareIds, toggleCompare } = useAiAssistant();
  const compare = useMutation({ mutationFn: async (ids: string[]) => (await aiApi.compare(ids)).data as CompareResponse });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compareIds.length && !compare.data) return;
  }, [compareIds, compare.data]);

  if (!compareIds.length && !compare.data) return null;
  const data = compare.data;

  return (
    <AnimatePresence>
      <motion.aside
        ref={panelRef}
        role="region"
        aria-label="Compare listings"
        className="fixed inset-x-3 bottom-3 z-[75] mx-auto max-w-3xl overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-floating sm:bottom-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b bg-ink-950 px-4 py-3 text-white">
          <GitCompareArrows size={16} aria-hidden="true" />
          <p className="text-xs font-extrabold">Compare ({compareIds.length}/{MAX_COMPARE})</p>
          <p className="hidden text-[10px] text-white/60 sm:block">Select up to {MAX_COMPARE} listings, then compare real values side by side.</p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => compareIds.length >= 2 && compare.mutate(compareIds)}
              disabled={compareIds.length < 2 || compare.isPending}
              className="h-9 rounded-control bg-violet-600 px-3 text-[11px] font-extrabold text-white disabled:bg-white/20"
            >
              {compare.isPending ? <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : `Compare ${compareIds.length >= 2 ? 'now' : 'needs 2+'}`}
            </button>
            {data && <button type="button" onClick={() => compare.reset()} className="h-9 rounded-control bg-white/10 px-3 text-[11px] font-bold text-white">Clear</button>}
          </div>
        </div>

        {compare.isError && <p role="alert" className="px-4 py-3 text-xs font-bold text-red-600">Comparison is temporarily unavailable — try again shortly.</p>}

        {data && (
          <div className="max-h-[60vh] overflow-auto p-4">
            <AIUsageIndicator tone="data" className="mb-3" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <caption className="sr-only">Side-by-side comparison of {data.listings.length} QAVLIO listings</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-28 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Attribute</th>
                    {data.listings.map((listing) => (
                      <th key={listing.publicId} scope="col" className="pb-2 pl-3 align-bottom">
                        <Link to={`/listing/${listing.publicId.toLowerCase()}`} className="line-clamp-2 text-[11px] font-extrabold text-ink-900 hover:text-violet-700">{listing.title}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.comparison.map((row) => (
                    <tr key={row.field} className="border-t border-slate-100">
                      <th scope="row" className="py-2 pr-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label(row.field)}</th>
                      {row.values.map((value, index) => (
                        <td key={`${row.field}-${index}`} className="py-2 pl-3 font-semibold text-ink-800">
                          {row.field === 'price' && typeof value === 'number' ? `Rs. ${value.toLocaleString('en-PK')}` : String(value ?? 'Not listed')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.aiSummary?.length ? (
              <div className="mt-4 rounded-card bg-violet-50 p-3">
                <AIUsageIndicator tone="suggestion" className="mb-2" />
                <ul className="space-y-1 text-[11px] font-semibold text-violet-900">{data.aiSummary.map((line) => <li key={line}>· {line}</li>)}</ul>
              </div>
            ) : null}
            <p className="mt-3 text-[10px] font-semibold text-slate-400">{data.note} {data.source}</p>
          </div>
        )}

        {compareIds.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t bg-slate-50 px-4 py-3">
            {compareIds.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-ink-800 ring-1 ring-ink-900/10">
                {id}
                <button type="button" onClick={() => toggleCompare(id)} aria-label={`Remove ${id} from comparison`} className="grid h-4 w-4 place-items-center rounded-full text-slate-400 hover:text-ink-900"><X size={11} aria-hidden="true" /></button>
              </span>
            ))}
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}

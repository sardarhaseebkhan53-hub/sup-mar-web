import { useQuery } from '@tanstack/react-query';
import { GitCompare, Info } from 'lucide-react';
import { aiApi } from '../../services/apiClient';
import type { AiComparisonResult } from '../../types/ai';

interface Props {
  listingIds: string[];
  onRemove?: (publicId: string) => void;
}

/**
 * Side-by-side comparison of real QAVLIO listings.
 * Attributes a listing does not declare are shown as "Not listed" — never filled in.
 */
export default function CompareListings({ listingIds, onRemove }: Props) {
  const ids = listingIds.slice(0, 4);
  const query = useQuery({
    queryKey: ['ai-compare', ids.join(',')],
    enabled: ids.length >= 2,
    staleTime: 60_000,
    queryFn: async () => (await aiApi.compare(ids)).data as AiComparisonResult,
  });

  if (ids.length < 2) {
    return <p className="rounded-card border border-dashed border-slate-300 p-4 text-xs text-slate-500">Select at least 2 listings to compare (up to 4).</p>;
  }

  const data = query.data;

  return (
    <section className="rounded-panel border border-ink-900/10 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="compare-heading">
      <h2 id="compare-heading" className="flex items-center gap-2 text-sm font-extrabold text-ink-900">
        <GitCompare size={15} className="text-violet-600" aria-hidden="true" /> Compare listings
      </h2>

      {query.isLoading && <p className="mt-3 text-xs text-slate-500">Loading comparison…</p>}
      {query.isError && <p role="alert" className="mt-3 text-xs font-semibold text-amber-800">I couldn&apos;t verify that from the available QAVLIO listings.</p>}

      {data && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-xs">
              <caption className="sr-only">Attribute comparison across {data.listings.length} QAVLIO listings</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-32 border-b border-slate-200 p-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Attribute</th>
                  {data.listings.map((listing) => (
                    <th key={String(listing.publicId)} scope="col" className="border-b border-slate-200 p-2 text-left align-top">
                      <span className="line-clamp-2 text-[11px] font-extrabold text-ink-900">{String(listing.title)}</span>
                      {onRemove && (
                        <button type="button" onClick={() => onRemove(String(listing.publicId))} className="mt-1 text-[10px] font-bold text-slate-400 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                          Remove
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.comparison.map((row) => (
                  <tr key={row.field} className="even:bg-slate-50/60">
                    <th scope="row" className="p-2 text-left text-[11px] font-bold text-slate-500">{row.label}</th>
                    {row.values.map((value, index) => (
                      <td key={`${row.field}-${index}`} className={`p-2 text-[11px] ${value === 'Not listed' ? 'italic text-slate-400' : 'font-semibold text-ink-800'}`}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.observations.length > 0 && (
            <div className="mt-4 rounded-card bg-violet-50 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">What the data shows</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[11px] text-ink-800">
                {data.observations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[10px] font-semibold text-slate-400">
            <Info size={11} className="mt-0.5 shrink-0" aria-hidden="true" /> {data.source} {data.note}
          </p>
        </>
      )}
    </section>
  );
}

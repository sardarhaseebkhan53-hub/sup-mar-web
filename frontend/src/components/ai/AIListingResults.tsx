import { PackageSearch } from 'lucide-react';
import type { AiListing } from '../../types/ai';
import RecommendationCard from './RecommendationCard';

interface Props {
  listings: AiListing[];
  loading?: boolean;
  total?: number;
  source?: string;
  emptyMessage?: string;
  columns?: 2 | 3 | 4;
  limit?: number;
  showReasons?: boolean;
}

/**
 * Renders AI-surfaced listings. Every card is a real QAVLIO listing returned by
 * the backend — the model never fabricates entries, so an empty array stays empty.
 */
export default function AIListingResults({ listings, loading, total, source, emptyMessage, columns = 4, limit, showReasons = true }: Props) {
  const visible = limit ? listings.slice(0, limit) : listings;
  const grid = columns === 2 ? 'grid-cols-1 min-[420px]:grid-cols-2' : columns === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';

  if (loading) {
    return (
      <div className={`grid gap-3 ${grid}`} aria-hidden="true">
        {Array.from({ length: columns }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-card bg-slate-200" />)}
      </div>
    );
  }

  if (!visible.length) {
    return (
      <div className="rounded-card border border-dashed border-slate-300 p-5 text-center">
        <PackageSearch size={20} className="mx-auto text-slate-300" aria-hidden="true" />
        <p className="mt-2 text-xs font-semibold text-slate-500">{emptyMessage || 'I couldn\'t verify that from the available QAVLIO listings.'}</p>
      </div>
    );
  }

  return (
    <div>
      {typeof total === 'number' && (
        <p className="mb-2 text-[11px] font-bold text-slate-500">
          Showing {visible.length} of {total} matching {total === 1 ? 'listing' : 'listings'}
        </p>
      )}
      <ul className={`grid gap-3 ${grid}`}>
        {visible.map((listing) => (
          <li key={listing.publicId}><RecommendationCard listing={listing} showReason={showReasons} /></li>
        ))}
      </ul>
      {source && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-violet-600/80">{source}</p>}
      <span className="sr-only" role="status" aria-live="polite">{visible.length} listings displayed</span>
    </div>
  );
}

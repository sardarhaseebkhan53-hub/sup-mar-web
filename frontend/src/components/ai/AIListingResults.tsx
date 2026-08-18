import type { AiListing } from '../../types/ai';
import AiListingCard from './AiListingCard';

/** AIListingResults — real QAVLIO listing cards inside assistant replies (never fabricated). */
export default function AIListingResults({ listings, max = 4 }: { listings: AiListing[]; max?: number }) {
  if (!listings?.length) return null;
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2" role="list" aria-label="Matching QAVLIO listings">
      {listings.slice(0, max).map((listing) => (
        <div role="listitem" key={listing.publicId}><AiListingCard listing={listing} /></div>
      ))}
    </div>
  );
}

import type { AiListing } from '../../types/ai';
import AiListingCard from './AiListingCard';

/** RecommendationCard — matches the standard QAVLIO listing card design (§55). */
export default function RecommendationCard({ listing }: { listing: AiListing }) {
  return <AiListingCard listing={listing} />;
}

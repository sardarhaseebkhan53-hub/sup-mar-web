import { useQuery } from '@tanstack/react-query';
import { recommendationApi } from '../../services/apiClient';
import type { AiRecommendationFeed } from '../../types/ai';
import RecommendationSection from './RecommendationSection';

/** Session-scoped signals so guests get relevant discovery without an account. */
function guestSignals() {
  try {
    const listings = JSON.parse(localStorage.getItem('qavlio-recently-viewed') || '[]');
    const searches = JSON.parse(localStorage.getItem('qavlio-recent-searches') || '[]');
    return {
      recentListingIds: Array.isArray(listings) ? listings.map((item: any) => String(item?.publicId || item)).filter(Boolean).slice(0, 12) : [],
      recentSearches: Array.isArray(searches) ? searches.map((item: any) => String(item?.query || item)).filter(Boolean).slice(0, 6) : [],
      city: localStorage.getItem('qavlio-city') || undefined,
    };
  } catch {
    return { recentListingIds: [], recentSearches: [] };
  }
}

/**
 * Homepage recommendation rows: Recommended for You, Because You Viewed,
 * Based on Your Searches, Similar to Your Favorites, Trending Near You.
 * Sections with no real listings are simply not rendered.
 */
export default function HomeRecommendations({ limit = 4 }: { limit?: number }) {
  const signals = guestSignals();
  const query = useQuery({
    queryKey: ['recommendation-feed', signals.recentListingIds.join(','), signals.recentSearches.join(','), signals.city],
    staleTime: 60_000,
    queryFn: async () => (await recommendationApi.feed({ ...signals, limit })).data as AiRecommendationFeed,
  });

  if (query.isError) return null;

  if (query.isLoading) {
    return (
      <div className="container-shell pb-12 sm:pb-16">
        <RecommendationSection title="Recommended for You" listings={[]} loading limit={limit} eyebrow="For you" />
      </div>
    );
  }

  const sections = query.data?.sections || [];
  if (!sections.length) return null;

  return (
    <div className="container-shell space-y-10 pb-12 sm:pb-16">
      {sections.map((section) => (
        <RecommendationSection
          key={section.id}
          eyebrow={section.personalized ? 'For you' : 'Discover'}
          title={section.title}
          basis={section.basis}
          listings={section.listings}
          personalized={section.personalized}
          limit={limit}
        />
      ))}
    </div>
  );
}

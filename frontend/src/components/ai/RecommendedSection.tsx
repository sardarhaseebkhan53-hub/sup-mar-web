import { useQuery } from '@tanstack/react-query';
import { recommendationApi } from '../../services/apiClient';
import { useAuth } from '../../auth/AuthProvider';
import type { RecommendationSectionsResponse } from '../../types/ai';
import RecommendationSection from './RecommendationSection';

function guestKey() {
  const existing = sessionStorage.getItem('qavlio-ai-guest');
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem('qavlio-ai-guest', next);
  return next;
}

/** Non-account session signals for guest recommendations (§21) — no login required. */
function guestSignals() {
  try {
    const viewed = JSON.parse(localStorage.getItem('qavlio-recently-viewed') || '[]') as string[];
    const searches = JSON.parse(localStorage.getItem('qavlio-recent-searches') || '[]') as string[];
    const categories = JSON.parse(localStorage.getItem('qavlio-viewed-categories') || '[]') as string[];
    return {
      viewed: viewed.filter((item) => typeof item === 'string').slice(-6),
      searches: searches.filter((item) => typeof item === 'string').slice(0, 5),
      categories: categories.filter((item) => typeof item === 'string').slice(0, 6),
    };
  } catch {
    return { viewed: [], searches: [], categories: [] };
  }
}

/**
 * Homepage AI recommendations: Recommended for You / Because You Viewed / Based on Your
 * Searches / Similar to Your Favorites / Trending Near You — guests included, honestly labeled.
 */
export default function RecommendedSection() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['ai-recommendation-sections', user ? 'user' : 'guest'],
    queryFn: async () => (await recommendationApi.sections(user ? {} : { guestKey: guestKey(), guestSignals: guestSignals() })).data as RecommendationSectionsResponse,
    staleTime: 60_000,
  });

  const sections = query.data?.sections || [];
  if (query.isError || (!query.isLoading && !sections.length)) return null;

  return <>
    {query.isLoading
      ? <section className="container-shell pb-12 sm:pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-card bg-slate-200" />)}</div>
      </section>
      : sections.map((section) => <RecommendationSection key={section.id} section={section} />)}
  </>;
}

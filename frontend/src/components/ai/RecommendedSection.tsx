import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { aiApi } from '../../services/apiClient';
import type { AiListing } from '../../types/ai';
import SectionHeading from '../ui/SectionHeading';
import AiListingCard from './AiListingCard';

export default function RecommendedSection() {
  const query = useQuery({ queryKey: ['ai-recommendations'], queryFn: async () => (await aiApi.recommendations({})).data, staleTime: 60_000 });
  const listings = (query.data?.listings || []) as AiListing[];
  if (query.isError || (!query.isLoading && !listings.length)) return null;
  return <section className="container-shell pb-12 sm:pb-16">
    <SectionHeading eyebrow="For you" title="Recommended for you" description={query.data?.coldStart ? 'Popular QAVLIO listings while we learn what you like.' : 'Based on your QAVLIO activity — never invented.'} actionLabel="Ask QAVLIO" actionTo="/ai-assistant" />
    {query.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-card bg-slate-200" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.slice(0, 4).map((listing) => <AiListingCard key={listing.publicId} listing={listing} />)}</div>}
    <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Sparkles size={12} /> {query.data?.coldStart ? 'Cold start: popular listings' : 'Personalized from favorites and recently viewed'}</p>
  </section>;
}

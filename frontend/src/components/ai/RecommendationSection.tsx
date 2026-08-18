import { Sparkles } from 'lucide-react';
import type { RecommendationSectionData } from '../../types/ai';
import SectionHeading from '../ui/SectionHeading';
import RecommendationCard from './RecommendationCard';

/**
 * RecommendationSection (§55) — reusable, visually calm recommendation strip.
 * Honest labeling: cold-start sections say so instead of claiming personalization.
 */
export default function RecommendationSection({ section, actionLabel = 'Ask QAVLIO', actionTo = '/ai-assistant' }: { section: RecommendationSectionData; actionLabel?: string; actionTo?: string }) {
  if (!section.listings?.length) return null;
  return (
    <section className="container-shell pb-10 sm:pb-14" aria-labelledby={`rec-${section.id}`}>
      <SectionHeading
        eyebrow={section.personalized ? 'For you' : 'Discover'}
        title={section.title}
        description={section.subtitle}
        actionLabel={actionLabel}
        actionTo={actionTo}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {section.listings.slice(0, 4).map((listing) => <RecommendationCard key={listing.publicId} listing={listing} />)}
      </div>
      <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <Sparkles size={12} aria-hidden="true" />
        {section.personalized ? 'Personalized from your QAVLIO activity — never invented' : 'Not personalized — based on live QAVLIO activity'}
        {section.basis ? ` · ${section.basis}` : ''}
      </p>
    </section>
  );
}

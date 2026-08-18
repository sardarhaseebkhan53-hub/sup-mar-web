import { MapPin, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AiListing } from '../../types/ai';
import { formatPrice } from '../../utils/formatters';

/**
 * A single recommended listing. The "reason" is always a factual statement about
 * the match (category, location, price band) — never an invented endorsement.
 */
export default function RecommendationCard({ listing, showReason = true }: { listing: AiListing; showReason?: boolean }) {
  const href = `/listing/${listing.slug || 'listing'}-${listing.publicId.toLowerCase()}`;
  const location = [listing.location?.area, listing.location?.city].filter(Boolean).join(', ');

  return (
    <article className="group overflow-hidden rounded-card border border-ink-900/10 bg-white shadow-sm transition hover:shadow-card">
      <Link to={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-violet-100 via-slate-100 to-gold-100">
          {listing.coverImage
            ? <img src={listing.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <div className="grid h-full place-items-center text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-700">QAVLIO</div>}
          {listing.condition && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-extrabold capitalize">{listing.condition.replace('-', ' ')}</span>}
          {listing.isPromoted && <span className="absolute right-2 top-2 rounded-full bg-gold-100 px-2 py-0.5 text-[9px] font-extrabold text-gold-900">Promoted</span>}
        </div>
        <div className="p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-violet-600">{listing.categorySlug?.replace(/-/g, ' ') || 'Listing'}</p>
          <h3 className="mt-1 line-clamp-2 text-xs font-extrabold leading-4 text-ink-900">{listing.title}</h3>
          <p className="mt-2 text-sm font-extrabold">{formatPrice(listing.price, listing.currency || 'PKR')}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500"><MapPin size={11} aria-hidden="true" />{location || 'Pakistan'}</p>
          {showReason && listing.reason && (
            <p className="mt-2 flex items-start gap-1 text-[10px] font-semibold text-slate-400">
              <Sparkles size={10} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{listing.reason}</span>
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

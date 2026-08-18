import { Heart, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listingApi } from '../../services/apiClient';
import type { AiListing } from '../../types/ai';
import { formatPrice } from '../../utils/formatters';

export default function AiListingCard({ listing }: { listing: AiListing }) {
  const [saved, setSaved] = useState(false);
  const href = `/listing/${listing.slug || 'listing'}-${listing.publicId.toLowerCase()}`;
  const location = [listing.location?.area, listing.location?.city].filter(Boolean).join(', ');
  const toggle = async () => {
    try {
      if (saved) await listingApi.unfavorite(listing.publicId);
      else await listingApi.favorite(listing.publicId);
      setSaved(!saved);
    } catch {
      setSaved(!saved);
    }
  };
  return <article className="overflow-hidden rounded-card border border-ink-900/10 bg-white shadow-sm">
    <div className="relative aspect-[16/10] bg-gradient-to-br from-violet-100 via-slate-100 to-gold-100">
      {listing.coverImage ? <img src={listing.coverImage} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-700">QAVLIO</div>}
      {listing.condition && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-extrabold capitalize">{listing.condition.replace('-', ' ')}</span>}
      <button type="button" onClick={() => void toggle()} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink-800" aria-label={saved ? `Remove ${listing.title} from favorites` : `Save ${listing.title}`} aria-pressed={saved}>
        <Heart size={14} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-rose-600' : ''} />
      </button>
    </div>
    <div className="p-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-violet-600">{listing.categorySlug || 'Listing'}</p>
      <h3 className="mt-1 line-clamp-2 text-xs font-extrabold leading-4 text-ink-900">{listing.title}</h3>
      <p className="mt-2 text-sm font-extrabold">{formatPrice(listing.price, 'PKR')}</p>
      <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500"><MapPin size={11} />{location || 'Pakistan'}</p>
      {listing.seller?.name && <p className="mt-1 truncate text-[10px] text-slate-500">{listing.seller.name}</p>}
      <Link to={href} className="mt-3 grid h-9 place-items-center rounded-control bg-ink-950 text-[10px] font-extrabold text-white">View Listing</Link>
    </div>
  </article>;
}

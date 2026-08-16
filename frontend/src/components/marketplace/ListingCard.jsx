import { BadgeCheck, Heart, MapPin } from 'lucide-react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/formatters';
import Badge from '../ui/Badge';
import { useAuth } from '../../auth/AuthProvider';

export default function ListingCard({ listing, horizontal = false }) {
  const saved = false;
  const { user } = useAuth();
  const navigate = useNavigate();
  const listingPath = `/listing/${listing.id}/${listing.slug}`;

  return (
    <article className={`group overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-card ${horizontal ? 'flex' : ''}`}>
      <div className={`relative overflow-hidden bg-slate-100 ${horizontal ? 'w-40 shrink-0 sm:w-52' : 'aspect-[4/3]'}`}>
        <Link to={listingPath} aria-label={listing.title}><img src={listing.image} alt={listing.title} width="640" height="480" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></Link>
        <div className="absolute left-3 top-3 flex gap-1.5">{listing.featured && <Badge variant="featured">Featured</Badge>}<Badge variant="neutral" className="hidden bg-white/90 sm:inline-flex">{listing.condition}</Badge></div>
        <button type="button" onClick={() => user ? navigate(`/saved?listing=${listing.id}`) : navigate(`/login?returnTo=${encodeURIComponent(`/saved?listing=${listing.id}`)}`, { state: { protectedAction: true } })} aria-label={saved ? `Remove ${listing.title} from favorites` : `Save ${listing.title} to favorites`} aria-pressed={saved} className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-md transition hover:scale-105 ${saved ? 'text-rose-600' : 'text-ink-800'}`}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="min-w-0 flex-1 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-violet-600">{listing.category}</p>
        <p className="mt-1 text-base font-extrabold text-ink-900">{formatPrice(listing.price, listing.currency)}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-ink-800"><Link to={listingPath} className="hover:text-violet-700">{listing.title}</Link></h3>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500">
          <span className="flex min-w-0 items-center gap-1"><MapPin size={12} className="shrink-0" /><span className="truncate">{listing.location}</span></span>
          <span className="shrink-0">{listing.postedAt}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-[8px] text-violet-700">{listing.seller.initials}</span><span className="truncate">{listing.seller.name}</span>{listing.verified && <BadgeCheck size={13} className="shrink-0 fill-violet-600 text-white" aria-label="Verified seller" />}</div>
      </div>
    </article>
  );
}

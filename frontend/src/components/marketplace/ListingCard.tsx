import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Heart, MapPin } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useFavorite } from '../../hooks/useFavorite';
import { useTranslation } from '../../i18n';
import type { Listing, ListingCardVariant } from '../../types/marketplace';
import { promotionAnalyticsApi } from '../../services/apiClient';
import PromotionBadge from '../monetization/PromotionBadge';
import { cn } from '../../utils/cn';
import { formatPrice } from '../../utils/formatters';
import Badge from '../ui/Badge';
import { ImageWithFallback } from '../ui/ImageWithFallback';

interface ListingCardProps {
  listing: Listing;
  variant?: ListingCardVariant;
  horizontal?: boolean;
  onFavoriteChange?: (listingId: string, saved: boolean) => void;
}

export default function ListingCard({ listing, variant, horizontal = false, onFavoriteChange }: ListingCardProps) {
  const { t } = useTranslation();
  const favorite = useFavorite(listing.id, listing.title);
  const saved = favorite.saved;
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!listing.sponsored || !cardRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) { void promotionAnalyticsApi.track(listing.id, 'listing_impression', listing.promotionPlacement || 'search').catch(() => undefined); observer.disconnect(); } }, { threshold: 0.5 });
    observer.observe(cardRef.current); return () => observer.disconnect();
  }, [listing.id, listing.sponsored, listing.promotionPlacement]);
  const promotedClick = () => { if (listing.sponsored) void promotionAnalyticsApi.track(listing.id, 'listing_click', listing.promotionPlacement || 'search').catch(() => undefined); };
  const resolvedVariant: ListingCardVariant = horizontal ? 'horizontal' : variant ?? (listing.sold ? 'sold' : listing.sponsored ? 'sponsored' : listing.featured ? 'featured' : 'default');
  const isHorizontal = resolvedVariant === 'horizontal';
  const isCompact = resolvedVariant === 'compact';
  const listingPath = `/listing/${listing.slug}-${listing.id.toLowerCase()}`;

  const toggleFavorite = (event: MouseEvent) => {
    favorite.toggle(event);
    onFavoriteChange?.(listing.id, !saved);
  };

  return <motion.article
    ref={cardRef}
    className={cn(
      'group relative overflow-hidden rounded-card border bg-white shadow-sm transition duration-200 hover:border-violet-200 hover:shadow-card',
      listing.sponsored ? 'border-violet-200' : 'border-ink-900/10',
      isHorizontal && 'flex',
    )}
    whileHover={reduceMotion ? undefined : { y: -3 }}
    transition={{ duration: 0.2 }}
  >
    <div className={cn('relative overflow-hidden bg-slate-100', isHorizontal ? 'w-40 shrink-0 sm:w-52' : isCompact ? 'aspect-[16/10]' : 'aspect-[4/3]')}>
      <Link to={listingPath} aria-label={`View ${listing.title}`} onClick={promotedClick}>
        <ImageWithFallback src={listing.image} srcSet={listing.imageSrcSet} alt={listing.imageAlt} width={640} height={480} loading="lazy" sizes={isHorizontal ? '(max-width: 640px) 160px, 208px' : '(max-width: 640px) 82vw, (max-width: 1024px) 50vw, 25vw'} wrapperClassName="h-full w-full" className="transition duration-400 group-hover:scale-[1.025]" />
      </Link>
      <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
        {resolvedVariant === 'sponsored' && <PromotionBadge label={listing.promotionLabel || 'Sponsored'} urgent={listing.urgent} />}
        {resolvedVariant === 'featured' && <Badge variant="featured">{t('listing.featured')}</Badge>}
        {!isCompact && <Badge variant="neutral" className="bg-white/95">{listing.condition}</Badge>}
      </div>
      {resolvedVariant === 'sold' && <div className="absolute inset-0 grid place-items-center bg-ink-950/48"><Badge variant="sponsored" className="px-4 py-2 text-xs">Sold</Badge></div>}
      <button type="button" onClick={toggleFavorite} aria-label={saved ? `Remove ${listing.title} from favorites` : `Save ${listing.title} to favorites`} aria-pressed={saved} className={cn('absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink-800 shadow-card transition duration-200 hover:scale-105 hover:text-rose-600', saved && 'text-rose-600')}>
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </div>

    <div className={cn('min-w-0 flex-1', isCompact ? 'p-3.5' : 'p-4')}>
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-violet-600">{listing.category}</p>
      <h3 className={cn('mt-1 line-clamp-2 font-bold leading-5 text-ink-800', isCompact ? 'min-h-10 text-[13px]' : 'min-h-10 text-sm')}><Link to={listingPath} onClick={promotedClick} className="hover:text-violet-700">{listing.title}</Link></h3>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <p className={cn('font-extrabold text-ink-900', isCompact ? 'text-sm' : 'text-base')}>{formatPrice(listing.price, listing.currency)}</p>
        {listing.previousPrice && <p className="text-[10px] font-semibold text-slate-400 line-through">{formatPrice(listing.previousPrice, listing.currency)}</p>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500">
        <span className="flex min-w-0 items-center gap-1"><MapPin size={12} className="shrink-0" /><span className="truncate">{listing.location}</span></span><span className="shrink-0">{listing.postedAt}</span>
      </div>
      {!isCompact && <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-[8px] text-violet-700">{listing.seller.initials}</span><span className="truncate">{listing.seller.name}</span>{listing.verified && <BadgeCheck size={14} className="shrink-0 fill-violet-600 text-white" aria-label="Verified seller" />}</div>}
    </div>
  </motion.article>;
}

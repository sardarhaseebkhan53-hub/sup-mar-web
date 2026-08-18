import { BadgeCheck, ShieldCheck, Star, Zap } from 'lucide-react';
import type { TrustBadgeItem } from '../../types/trust';

export function VerificationBadge({ verified, listing }: { verified?: boolean; listing?: boolean }) {
  if (!verified) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 ring-1 ring-emerald-600/15">
    <BadgeCheck size={13} aria-hidden="true" /> {listing ? 'Verified Listing' : 'Verified Seller'}
    <span className="sr-only">Verified by QAVLIO</span>
  </span>;
}

export function RatingBadge({ rating, count }: { rating?: number; count?: number }) {
  if (!count) return <span className="text-[11px] font-semibold text-slate-400">No reviews yet</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-extrabold text-ink-900" aria-label={`${rating} out of 5 from ${count} reviews`}>
    <Star size={13} className="fill-gold-300 text-gold-500" aria-hidden="true" /> {Number(rating || 0).toFixed(1)} <span className="font-semibold text-slate-500">({count})</span>
  </span>;
}

export function ResponseBadge({ label }: { label?: string | null }) {
  if (!label) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-extrabold text-cyan-800"><Zap size={12} aria-hidden="true" /> {label}</span>;
}

export function TrustBadgeList({ badges }: { badges?: TrustBadgeItem[] }) {
  if (!badges?.length) return null;
  return <div className="flex flex-wrap gap-1.5">{badges.map((badge) => <span key={badge.key} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-800">
    {badge.key === 'verified' ? <ShieldCheck size={12} /> : badge.key === 'fast' ? <Zap size={12} /> : <Star size={12} />}
    {badge.label}
  </span>)}</div>;
}

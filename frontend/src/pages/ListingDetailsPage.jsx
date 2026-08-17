import { BadgeCheck, CalendarDays, ChevronLeft, Flag, Heart, MapPin, MessageCircle, Phone, Share2, ShieldCheck, Star } from 'lucide-react';
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdSlot from '../components/marketplace/AdSlot';
import ListingCard from '../components/marketplace/ListingCard';
import Badge from '../components/ui/Badge';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import SectionHeading from '../components/ui/SectionHeading';
import { AD_SLOT_IDS } from '../constants/adSlots';
import { listings } from '../data/listings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice } from '../utils/formatters';
import { useAuth } from '../auth/AuthProvider';

export default function ListingDetailsPage() {
  const { listingId } = useParams();
  const listing = listings.find((item) => item.id === listingId) || listings[0];
  const saved = false;
  const { user } = useAuth();
  const navigate = useNavigate();
  const listingPath = `/listing/${listing.id}/${listing.slug}`;
  function beginProtectedAction(intent) {
    const destinations = { report: `/dashboard/reports?listing=${listing.id}`, save: '/saved', chat: `/messages?listing=${listing.id}&intent=chat`, call: `/messages?listing=${listing.id}&intent=call` };
    if (user) navigate(destinations[intent] || listingPath);
    else navigate(`/login?returnTo=${encodeURIComponent(destinations[intent] || listingPath)}`, { state: { protectedAction: true } });
  }
  useDocumentTitle(listing.title);

  return (
    <div className="container-shell py-7">
      <Breadcrumbs items={[{ label: listing.category, to: '/browse' }, { label: listing.title }]} />
      <Link to="/browse" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-violet-700"><ChevronLeft size={15} /> Back to results</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-3xl border border-ink-900/10 bg-white shadow-sm">
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[16/9]"><img src={listing.image} alt={listing.title} className="h-full w-full object-cover" /><div className="absolute left-4 top-4">{listing.featured && <Badge variant="featured">Featured listing</Badge>}</div><div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">{[0,1,2,3].map((value) => <span key={value} className={`h-1.5 rounded-full ${value === 0 ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />)}</div></div>
            <div className="grid grid-cols-4 gap-2 p-3">{[listing.image, ...listings.slice(1,4).map((item) => item.image)].map((image, index) => <button key={index} className={`aspect-[4/3] overflow-hidden rounded-xl border-2 ${index === 0 ? 'border-violet-600' : 'border-transparent'}`} aria-label={`View image ${index + 1}`}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>
          </section>
          <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap gap-2"><Badge variant="violet">{listing.category}</Badge><Badge>{listing.condition}</Badge></div><h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{listing.title}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1.5"><MapPin size={14} />{listing.location}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />Posted {listing.postedAt}</span><span>Ad ID: {listing.id}</span></div><div className="my-6 h-px bg-slate-100" /><h2 className="text-base font-extrabold">Description</h2><p className="mt-3 text-sm leading-7 text-slate-600">{listing.description || 'A quality item in excellent condition, offered by a local QAVLIO seller. Contact the seller through secure chat to request complete details and arrange an inspection.'}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Condition', listing.condition], ['Category', listing.category], ['Location', listing.location.split(',')[0]], ['Listed by', 'Owner']].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-bold text-slate-400">{label}</span><strong className="mt-1 block truncate text-xs">{value}</strong></div>)}</div></section>
          <AdSlot slotId={AD_SLOT_IDS.LISTING_BANNER} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-card"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-violet-600">Asking price</p><p className="mt-1 text-2xl font-extrabold sm:text-3xl">{formatPrice(listing.price, listing.currency)}</p><p className="mt-2 text-xs font-semibold text-slate-400">Price is negotiable</p><div className="mt-5 grid gap-2"><Button onClick={() => beginProtectedAction('chat')} className="w-full"><MessageCircle size={17} /> Chat with seller</Button><Button onClick={() => beginProtectedAction('call')} variant="gold" className="w-full"><Phone size={17} /> Contact seller</Button></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => beginProtectedAction('save')} aria-pressed={saved} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold"><Heart size={15} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-rose-600' : ''} /> Save</button><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold"><Share2 size={15} /> Share</button></div></section>
          <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">{listing.seller.initials}</span><div className="min-w-0"><p className="flex items-center gap-1 truncate text-sm font-extrabold">{listing.seller.name}{listing.verified && <BadgeCheck size={15} className="fill-violet-600 text-white" />}</p><p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Star size={11} className="fill-gold-300 text-gold-300" />{listing.seller.rating} · Member since {listing.seller.since}</p></div></div><Link to="/seller" className="mt-4 block rounded-lg border border-violet-200 py-2.5 text-center text-xs font-extrabold text-violet-700 hover:bg-violet-50">View seller profile</Link></section>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-xs font-extrabold text-emerald-900"><ShieldCheck size={17} /> Deal safely</p><p className="mt-2 text-[11px] leading-5 text-emerald-800/70">Meet in public, inspect before paying, and never share OTP or banking credentials.</p></section>
          <AdSlot slotId={AD_SLOT_IDS.LISTING_SIDEBAR} variant="rectangle" />
          <button onClick={() => beginProtectedAction('report')} className="inline-flex w-full items-center justify-center gap-2 py-2 text-xs font-bold text-slate-500 hover:text-red-600"><Flag size={14} /> Report this listing</button>
        </aside>
      </div>
      <section className="mt-14"><SectionHeading title="You may also like" description="More deals selected from similar categories." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.slice(1,5).map((item) => <ListingCard key={item.id} listing={item} />)}</div></section>
    </div>
  );
}

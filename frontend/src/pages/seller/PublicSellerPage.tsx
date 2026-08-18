import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Flag, MapPin, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FollowButton from '../../components/discovery/FollowButton';
import { PublicListingGrid } from '../../components/listing-detail/PublicListingGrid';
import ReportSellerDialog from '../../components/trust/ReportDialog';
import ReviewCard, { ReviewReportDialog } from '../../components/trust/ReviewCard';
import ReviewForm from '../../components/trust/ReviewForm';
import ReviewSummary from '../../components/trust/ReviewSummary';
import { ResponseBadge, TrustBadgeList, VerificationBadge } from '../../components/trust/TrustBadges';
import TrustIndicators from '../../components/trust/TrustIndicators';
import { useAuth } from '../../auth/AuthProvider';
import { listingApi, trustApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function PublicSellerPage() {
  const { username = '' } = useParams();
  const { user } = useAuth();
  const [sort, setSort] = useState('newest');
  const [reviewSort, setReviewSort] = useState('newest');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReview, setReportReview] = useState('');
  const seller = useQuery({ queryKey: ['public-seller', username], queryFn: async () => (await listingApi.publicSeller(username)).data });
  const listings = useQuery({ queryKey: ['public-seller-listings', username, sort], queryFn: async () => (await listingApi.publicSellerListings(username, sort)).data });
  const reviews = useQuery({ queryKey: ['seller-reviews', username, reviewSort], queryFn: async () => (await trustApi.reviews(username, `sort=${reviewSort}`)).data });
  const eligibility = useQuery({ queryKey: ['review-eligibility', username], enabled: Boolean(user), queryFn: async () => (await trustApi.eligibility(username)).data });
  useDocumentTitle(seller.data ? `${seller.data.displayName} — QAVLIO Seller` : 'Seller profile');
  if (seller.isLoading) return <div className="container-shell py-10"><div className="h-64 animate-pulse rounded-panel bg-slate-200" /></div>;
  if (!seller.data) return <div className="container-shell py-20 text-center"><h1 className="text-3xl font-extrabold">Seller not found</h1></div>;
  const item = seller.data;
  return <main className="container-shell py-8">
    <header className="overflow-hidden rounded-panel border bg-white shadow-sm">
      <div className="h-24 bg-gradient-to-r from-violet-700 via-violet-500 to-cyan-500" />
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="-mt-16 grid h-24 w-24 place-items-center overflow-hidden rounded-panel border-4 border-white bg-violet-100 text-2xl font-extrabold text-violet-700">{item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : item.displayName.split(' ').map((part: string) => part[0]).slice(0, 2).join('')}</div>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">{item.displayName}<VerificationBadge verified={item.verified || item.verificationStatus === 'verified'} /></h1>
            <p className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin size={13} />{item.location.city || 'Pakistan'}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={13} />Member since {item.memberSince ? new Date(item.memberSince).getFullYear() : '—'}</span>
            </p>
            <div className="mt-3"><TrustBadgeList badges={item.badges} /></div>
            <div className="mt-2"><ResponseBadge label={item.responseLabel} /></div><div className="mt-3"><TrustIndicators seller={item}/></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['Active', item.activeListings], ['Sold', item.soldListings], ['Reviews', item.reviewCount]].map(([label, value]) => <div key={label} className="rounded-card bg-slate-50 p-3 text-center"><strong className="block">{value}</strong><span className="text-[9px] text-slate-400">{label}</span></div>)}
          </div>
        </div>
        {item.description && <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">{item.description}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <FollowButton sellerId={username} />
          {listings.data?.[0] && <Link to={`/listing/${listings.data[0].slug}-${String(listings.data[0].publicId).toLowerCase()}`} className="inline-flex h-10 items-center gap-2 rounded-control bg-violet-600 px-4 text-xs font-extrabold text-white"><MessageCircle size={14} /> Chat</Link>}
          <a href="#listings" className="grid h-10 place-items-center rounded-control border px-4 text-xs font-extrabold">View Listings</a>
          <button type="button" onClick={() => setReportOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-control px-4 text-xs font-bold text-slate-500"><Flag size={14} /> Report Seller</button>
        </div>
      </div>
    </header>

    <section id="listings" className="mt-10">
      <div className="mb-5 flex items-end justify-between">
        <div><p className="eyebrow">Marketplace inventory</p><h2 className="mt-1 text-2xl font-extrabold">Active listings</h2></div>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-control border bg-white px-3 text-xs font-bold"><option value="newest">Newest</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option></select>
      </div>
      {listings.isLoading ? <div className="h-48 animate-pulse rounded-panel bg-slate-200" /> : <PublicListingGrid listings={listings.data || []} empty="This seller has no active listings." />}
    </section>

    <section className="mt-12 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <ReviewSummary summary={reviews.data?.summary} />
        <label className="mt-3 block text-[11px] font-bold text-slate-500">Sort
          <select value={reviewSort} onChange={(event) => setReviewSort(event.target.value)} className="input-base mt-1 !h-10 text-xs">
            <option value="newest">Newest</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </label>
      </div>
      <div className="space-y-4">
        {eligibility.data?.eligible && <ReviewForm username={username} listingId={eligibility.data.listingId} onDone={() => void reviews.refetch()} />}
        {(reviews.data?.reviews || []).map((review: any) => <ReviewCard key={review.id} review={review} onReport={() => setReportReview(review.id)} />)}
        {!reviews.data?.reviews?.length && <p className="rounded-card border border-dashed p-8 text-center text-sm text-slate-500">No published reviews yet.</p>}
      </div>
    </section>
    <ReportSellerDialog open={reportOpen} onClose={() => setReportOpen(false)} targetId={username} blockId={item.id} />
    <ReviewReportDialog open={Boolean(reportReview)} onClose={() => setReportReview('')} reviewId={reportReview} />
  </main>;
}

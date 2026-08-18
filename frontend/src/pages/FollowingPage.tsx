import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import FollowButton from '../components/discovery/FollowButton';
import { PublicListingGrid } from '../components/listing-detail/PublicListingGrid';
import { VerificationBadge } from '../components/trust/TrustBadges';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buyerApi } from '../services/apiClient';

export default function FollowingPage() {
  useDocumentTitle('Following');
  const query = useQuery({ queryKey: ['following'], queryFn: async () => (await buyerApi.following()).data });
  const sellers = query.data?.sellers || [];
  return <main className="container-shell py-10">
    <header><p className="eyebrow">Sellers you chose</p><h1 className="mt-2 text-3xl font-extrabold">Following</h1></header>
    {query.isLoading ? <div className="mt-7 h-48 animate-pulse rounded-panel bg-slate-200" /> : !sellers.length ? <div className="mt-7 rounded-panel border border-dashed bg-white p-12 text-center"><Users className="mx-auto text-violet-600" /><h2 className="mt-4 text-xl font-extrabold">You are not following anyone yet.</h2><Link to="/marketplace" className="mt-5 inline-flex rounded-control bg-violet-600 px-4 py-2 text-xs font-extrabold text-white">Explore listings</Link></div>
      : <div className="mt-7 space-y-6">{sellers.map((seller: any) => <article key={seller.username} className="rounded-panel border bg-white p-5"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><h2 className="flex items-center gap-2 text-lg font-extrabold">{seller.displayName}<VerificationBadge verified={seller.verified} /></h2><p className="mt-1 text-xs text-slate-500">{seller.rating ? `${seller.rating} rating` : 'New seller'} · {seller.reviewCount} reviews</p></div><div className="flex gap-2"><FollowButton sellerId={seller.username} /><Link to={`/seller/${seller.username}`} className="grid h-10 place-items-center rounded-control border px-3 text-xs font-extrabold">View Seller</Link></div></div>{seller.recentListings?.length > 0 && <div className="mt-4"><PublicListingGrid listings={seller.recentListings} /></div>}</article>)}</div>}
  </main>;
}

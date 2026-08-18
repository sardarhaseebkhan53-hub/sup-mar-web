import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMarketplaceLocation } from '../../hooks/useMarketplaceLocation';
import { buyerApi } from '../../services/apiClient';
import { PublicListingGrid } from '../listing-detail/PublicListingGrid';
import FollowButton from './FollowButton';

export default function PersonalizedHome() {
  const { user } = useAuth();
  const { city } = useMarketplaceLocation();
  const query = useQuery({ queryKey: ['discovery-home', user?.id, city], queryFn: async () => (await buyerApi.home(city)).data, staleTime: 30_000 });
  const sections = query.data?.sections || [];
  if (!sections.length) return null;
  return <div className="container-shell space-y-10 pb-8">
    {sections.map((section: any) => {
      if (section.sellers?.length) {
        return <section key={section.id}><p className="eyebrow">Your marketplace</p><h2 className="mt-1 text-2xl font-extrabold">{section.title}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{section.sellers.map((seller: any) => <article key={seller.username} className="rounded-card border bg-white p-4"><h3 className="font-extrabold">{seller.displayName}</h3><p className="mt-1 text-[11px] text-slate-500">{seller.location?.city || 'Pakistan'} · {seller.reviewCount} reviews</p><div className="mt-3 flex gap-2"><FollowButton sellerId={seller.username} /><Link to={`/seller/${seller.username}`} className="grid h-10 place-items-center rounded-control border px-3 text-xs font-extrabold">View Seller</Link></div></article>)}</div></section>;
      }
      if (section.listings?.length) return <section key={section.id}><p className="eyebrow">Your marketplace</p><h2 className="mt-1 text-2xl font-extrabold">{section.title}</h2><div className="mt-4"><PublicListingGrid listings={section.listings} /></div></section>;
      return null;
    })}
  </div>;
}

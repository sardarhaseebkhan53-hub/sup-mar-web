import AdSlot from '../components/marketplace/AdSlot';
import CategoryExplorer from '../components/home/CategoryExplorer';
import DiscoverGrid from '../components/home/DiscoverGrid';
import Hero from '../components/home/Hero';
import HowItWorks from '../components/home/HowItWorks';
import PromotedListings from '../components/home/PromotedListings';
import ListingSection from '../components/home/ListingSection';
import PersonalizedHome from '../components/discovery/PersonalizedHome';
import RecommendedSection from '../components/ai/RecommendedSection';
import SellerCallout from '../components/home/SellerCallout';
import TrustSafety from '../components/home/TrustSafety';
import { AD_SLOT_IDS } from '../constants/adSlots';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { featuredListings } from '../data/listings';
import { useQuery } from '@tanstack/react-query';
import { campaignApi, couponApi } from '../services/apiClient';
import CampaignBanner from '../components/growth/CampaignBanner';
import CouponCard from '../components/growth/CouponCard';

export default function HomePage() {
  useDocumentTitle();
  const campaigns = useQuery({ queryKey: ['home-campaigns'], queryFn: async () => (await campaignApi.list('?limit=3')).data });
  const coupons = useQuery({ queryKey: ['home-coupons'], queryFn: async () => (await couponApi.public('?limit=4')).data });

  return <>
    <Hero />
    <section className="container-shell pt-6"><AdSlot placement={AD_SLOT_IDS.HOME_TOP} /></section>
    <CategoryExplorer />
    {/* Phase 18 Growth: Featured Offers */}
    {campaigns.data?.campaigns?.length ? (
      <section className="container-shell pt-6">
        <div className="flex items-end justify-between"><h2 className="text-lg font-extrabold">Featured Offers</h2><a href="/coupons" className="text-xs font-bold text-violet-600">View all</a></div>
        <div className="mt-3 grid gap-3">
          {campaigns.data.campaigns.slice(0,2).map((c:any)=><CampaignBanner key={c._id} campaign={c}/>)}
        </div>
      </section>
    ) : null}
    {coupons.data?.coupons?.length ? (
      <section className="container-shell pt-6">
        <div className="flex items-end justify-between"><h2 className="text-lg font-extrabold">Popular Deals</h2><a href="/coupons" className="text-xs font-bold text-violet-600">View coupons</a></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {coupons.data.coupons.slice(0,4).map((c:any)=><CouponCard key={c._id || c.code} coupon={c}/>)}
        </div>
      </section>
    ) : null}
    {!import.meta.env.PROD && <ListingSection eyebrow="Development preview" title="Local preview listings" description="Demo inventory is shown only outside production." listings={featuredListings} />}
    <PromotedListings placement="featured" eyebrow="Marketplace spotlight" title="Featured on QAVLIO" description="Active featured placements from real QAVLIO listings." />
    <PromotedListings placement="homepage" eyebrow="Paid visibility" title="Promoted near you" description="Relevant active homepage promotions, always transparently labelled." />
    <section className="container-shell py-10"><AdSlot slotId={AD_SLOT_IDS.HOME_MIDDLE} /><div className="mt-4 md:hidden"><AdSlot slotId={AD_SLOT_IDS.MOBILE_HOME} /></div></section>
    <PersonalizedHome />
    <RecommendedSection />
    <DiscoverGrid />
    <SellerCallout />
    <HowItWorks />
    <TrustSafety />
    <section className="container-shell pb-12"><AdSlot placement={AD_SLOT_IDS.HOME_BOTTOM} /></section>
  </>;
}

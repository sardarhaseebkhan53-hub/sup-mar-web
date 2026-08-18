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

export default function HomePage() {
  useDocumentTitle();
  return <>
    <Hero />
    <section className="container-shell pt-6"><AdSlot placement={AD_SLOT_IDS.HOME_TOP} /></section>
    <CategoryExplorer />
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

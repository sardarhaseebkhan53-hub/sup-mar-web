import AdSlot from '../components/marketplace/AdSlot';
import CategoryExplorer from '../components/home/CategoryExplorer';
import DiscoverGrid from '../components/home/DiscoverGrid';
import Hero from '../components/home/Hero';
import HowItWorks from '../components/home/HowItWorks';
import ListingSection from '../components/home/ListingSection';
import SellerCallout from '../components/home/SellerCallout';
import TrustSafety from '../components/home/TrustSafety';
import { AD_SLOT_IDS } from '../constants/adSlots';
import { featuredListings, promotedListings } from '../data/listings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function HomePage() {
  useDocumentTitle();
  return <>
    <Hero />
    <section className="container-shell pt-6"><AdSlot placement={AD_SLOT_IDS.HOME_TOP} /></section>
    <CategoryExplorer />
    <ListingSection eyebrow="Curated marketplace finds" title="Featured on QAVLIO" description="Standout demo listings that show how trusted profiles, useful details, and strong imagery work together." listings={featuredListings} variant="featured" />
    <ListingSection eyebrow="Paid visibility" title="Promoted near you" description="Relevant seller promotions in your area, kept visually clear and transparently labeled." listings={promotedListings} variant="sponsored" promoted />
    <section className="container-shell py-10"><AdSlot slotId={AD_SLOT_IDS.HOME_MIDDLE} /><div className="mt-4 md:hidden"><AdSlot slotId={AD_SLOT_IDS.MOBILE_HOME} /></div></section>
    <DiscoverGrid />
    <SellerCallout />
    <HowItWorks />
    <TrustSafety />
    <section className="container-shell pb-12"><AdSlot placement={AD_SLOT_IDS.HOME_BOTTOM} /></section>
  </>;
}

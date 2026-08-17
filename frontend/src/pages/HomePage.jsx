import React from 'react';
import { ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdSlot from '../components/marketplace/AdSlot';
import CategoryCard from '../components/marketplace/CategoryCard';
import Hero from '../components/marketplace/Hero';
import HowItWorks from '../components/marketplace/HowItWorks';
import ListingCard from '../components/marketplace/ListingCard';
import SectionHeading from '../components/ui/SectionHeading';
import { AD_SLOT_IDS } from '../constants/adSlots';
import { listings } from '../data/listings';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function HomePage() {
  const categories = useCategories();
  useDocumentTitle();
  return (
    <>
      <Hero />
      <section className="container-shell py-12 sm:py-14">
        <SectionHeading eyebrow="Explore QAVLIO" title="Popular categories" description="Browse thousands of fresh listings across the things Pakistan searches for most." />
        <div className="hide-scrollbar flex snap-x gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8">
          {categories.slice(0, 8).map((category) => <CategoryCard key={category.id} category={category} />)}
        </div>
      </section>

      <section className="container-shell pb-8">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink-900/10 sm:p-7">
          <SectionHeading eyebrow="Handpicked near you" title="Featured listings" description="Fresh opportunities from trusted sellers, selected for visibility and value." actionLabel="See all listings" actionTo="/browse?featured=true" />
          <div className="hide-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-5">
            {listings.slice(0, 5).map((listing) => <div key={listing.id} className="min-w-[82%] snap-start sm:min-w-0"><ListingCard listing={listing} /></div>)}
          </div>
          <Link to="/browse" className="mt-2 inline-flex items-center gap-2 text-xs font-extrabold text-violet-700 sm:hidden">See all listings <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="container-shell py-8">
        <AdSlot slotId={AD_SLOT_IDS.HOME_MIDDLE} />
        <div className="mt-4 md:hidden"><AdSlot slotId={AD_SLOT_IDS.MOBILE_HOME} /></div>
      </section>

      <HowItWorks />

      <section className="container-shell pb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="card-surface p-5"><ShieldCheck className="text-emerald-600" /><h3 className="mt-4 text-sm font-extrabold">Safety comes first</h3><p className="mt-2 text-xs leading-5 text-slate-500">Practical safety guidance, reporting tools, and moderation pathways are built into the platform plan.</p></article>
          <article className="card-surface p-5"><Star className="text-gold-500" /><h3 className="mt-4 text-sm font-extrabold">Reputation you can trust</h3><p className="mt-2 text-xs leading-5 text-slate-500">Seller verification and transparent reviews will help every community member decide confidently.</p></article>
          <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white shadow-card"><div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-2 border-white/10" /><p className="text-xs font-extrabold text-gold-300">READY TO SELL?</p><h3 className="mt-3 text-xl font-extrabold">Turn unused into useful.</h3><a href="/sell" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold">Post a listing <ArrowRight size={15} /></a></article>
        </div>
      </section>
    </>
  );
}

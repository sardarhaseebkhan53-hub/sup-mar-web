import { ChevronDown, ListFilter, SlidersHorizontal } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AdSlot from '../components/marketplace/AdSlot';
import FilterPanel from '../components/marketplace/FilterPanel';
import ListingCard from '../components/marketplace/ListingCard';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import CategoryIcon from '../components/ui/CategoryIcon';
import { AD_SLOT_IDS } from '../constants/adSlots';
import { listings } from '../data/listings';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useCategories();
  const category = categories.find((item) => item.slug === categorySlug);
  const query = searchParams.get('q');
  const title = category?.name || (query ? `Results for “${query}”` : 'All listings');
  useDocumentTitle(title);

  const displayListings = useMemo(() => {
    if (!category) return listings;
    const exact = listings.filter((listing) => listing.category === category.name || listing.category === category.shortName);
    return exact.length > 1 ? exact : listings;
  }, [category]);

  return (
    <div className="container-shell py-7 sm:py-9">
      <Breadcrumbs items={[{ label: 'Browse', to: '/browse' }, ...(category ? [{ label: category.name }] : [])]} />
      <div className="mt-5 flex items-center gap-4">
        {category && <CategoryIcon name={category.icon} accent={category.accent} size={28} className="h-14 w-14 rounded-2xl" />}
        <div><p className="eyebrow">Discover great deals</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{title}</h1><p className="mt-1 text-xs font-semibold text-slate-500">{displayListings.length * 407} active listings near you</p></div>
      </div>
      <AdSlot slotId={AD_SLOT_IDS.CATEGORY_TOP} className="mt-7" />

      <div className="mt-7 flex items-center justify-between gap-3 rounded-xl border border-ink-900/10 bg-white p-3 shadow-sm lg:ml-[276px]">
        <button onClick={() => setFiltersOpen((open) => !open)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-extrabold lg:hidden"><SlidersHorizontal size={15} /> Filters</button>
        <p className="hidden text-xs font-semibold text-slate-500 sm:block"><strong className="text-ink-900">{displayListings.length * 407}</strong> results found</p>
        <button className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"><ListFilter size={15} /> Newest first <ChevronDown size={14} /></button>
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[256px_1fr]">
        <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}><FilterPanel /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{displayListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
      </div>
    </div>
  );
}

import { ChevronDown, ListFilter, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AdSlot from '../components/marketplace/AdSlot';
import FilterPanel from '../components/marketplace/FilterPanel';
import ListingCard from '../components/marketplace/ListingCard';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import CategoryIcon from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';
import { AD_SLOT_IDS } from '../constants/adSlots';
import { listings } from '../data/listings';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { Category } from '../types/marketplace';

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState('newest');
  const categories = useCategories() as Category[];
  const activeSlug = categorySlug ?? searchParams.get('category') ?? undefined;
  const category = categories.find((item) => item.slug === activeSlug);
  const query = searchParams.get('q')?.trim();
  const title = category?.name || (query ? `Results for “${query}”` : 'Browse the marketplace');
  useDocumentTitle(title);

  const displayListings = useMemo(() => listings.filter((listing) => {
    const matchesCategory = !category || listing.category === category.name || listing.category === category.shortName;
    const matchesQuery = !query || listing.title.toLowerCase().includes(query.toLowerCase()) || listing.category.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [category, query]);
  const sortedListings = useMemo(() => {
    const sorted = [...displayListings];
    if (sort === 'price-low') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') sorted.sort((a, b) => b.price - a.price);
    if (sort === 'oldest') sorted.reverse();
    return sorted;
  }, [displayListings, sort]);

  return <div className="container-shell py-7 sm:py-10">
    <Breadcrumbs items={[{ label: 'Marketplace', to: '/marketplace' }, ...(category ? [{ label: category.name }] : [])]} />
    <header className="mt-5 flex items-center gap-4">{category && <CategoryIcon name={category.icon} accent={category.accent} size={27} className="h-14 w-14 rounded-card" />}<div><p className="eyebrow">Buy. Sell. Discover.</p><h1 className="mt-1 text-h1 text-ink-950">{title}</h1><p className="mt-1 text-xs font-semibold text-slate-500">{displayListings.length} realistic Phase 1 demo {displayListings.length === 1 ? 'listing' : 'listings'}</p></div></header>
    <AdSlot slotId={AD_SLOT_IDS.CATEGORY_TOP} className="mt-7" />

    <div className="mt-7 flex items-center justify-between gap-3 rounded-card border border-ink-900/10 bg-white p-3 shadow-sm lg:ml-[276px]">
      <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex h-10 items-center gap-2 rounded-control border border-slate-200 px-3 text-xs font-extrabold lg:hidden"><SlidersHorizontal size={15} /> Filters</button>
      <p className="hidden text-xs font-semibold text-slate-500 sm:block"><strong className="text-ink-900">{displayListings.length}</strong> results found</p>
      <label className="relative ml-auto inline-flex h-10 items-center gap-2 rounded-control px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"><ListFilter size={15} /><span className="sr-only">Sort listings</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="appearance-none bg-transparent pr-5 outline-none"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={14} className="pointer-events-none absolute right-2" /></label>
    </div>

    <div className="mt-4 grid items-start gap-5 lg:grid-cols-[256px_1fr]">
      <aside className={`${filtersOpen ? 'fixed inset-0 z-[70] overflow-y-auto bg-white p-4' : 'hidden'} lg:static lg:block lg:overflow-visible lg:bg-transparent lg:p-0`} aria-label="Marketplace filters"><div className="mb-3 flex items-center justify-between lg:hidden"><strong>Filters</strong><button type="button" onClick={() => setFiltersOpen(false)} className="tap-target grid place-items-center rounded-control" aria-label="Close filters"><X size={20} /></button></div><FilterPanel /></aside>
      {displayListings.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sortedListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <EmptyState title="No matching demo listings" description="Try another search or browse all categories. Real backend search arrives in Phase 3." actionLabel="Browse all listings" actionTo="/marketplace" />}
    </div>
  </div>;
}

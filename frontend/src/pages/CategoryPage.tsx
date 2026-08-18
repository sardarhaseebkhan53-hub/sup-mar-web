import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Grid2X2, List, RotateCcw, Share2, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import SavedSearchModal from '../components/discovery/SavedSearchModal';
import SearchIntelligence from '../components/ai/SearchIntelligence';
import FilterPanel, { type FilterDefinition } from '../components/marketplace/FilterPanel';
import ListingCard from '../components/marketplace/ListingCard';
import SearchSkeleton from '../components/marketplace/SearchSkeleton';
import AdSlot from '../components/marketplace/AdSlot';
import { AD_SLOT_IDS } from '../constants/adSlots';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { Pagination } from '../components/ui/Pagination';
import { listings as fixtures } from '../data/listings';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buyerApi, marketplaceApi, promotionApi } from '../services/apiClient';
import type { Category, Listing } from '../types/marketplace';

interface ApiListing { publicId?: string; _id?: string; slug: string; title: string; price: number | { $numberDecimal?: string }; currency?: string; condition: string; location?: { city?: string; area?: string }; categorySlug?: string; viewCount?: number; isPromoted?: boolean; promotion?: { status?: string; label?: 'Sponsored'|'Promoted'|'Featured'|'Urgent'; placements?: string[]; types?: string[] }; createdAt?: string; }
interface SearchData { listings: ApiListing[]; pagination: { page: number; limit: number; total: number; totalPages: number }; filters: FilterDefinition[]; }
interface CategoryData { name: string; slug: string; description?: string; seoTitle?: string; seoDescription?: string; }
interface Subcategory { id?: string; _id?: string; name: string; slug: string; count?: number; }
const categoryLabels: Record<string, string> = { cars: 'Cars for Sale', property: 'Property for Sale & Rent', jobs: 'Jobs in Pakistan', services: 'Services near you' };

function normalizeListing(item: ApiListing, index: number, categories: Category[]): Listing {
  const exact = fixtures.find((fixture) => fixture.id === item.publicId);
  const category = categories.find((entry) => entry.slug === item.categorySlug);
  const visual = exact || fixtures.find((fixture) => fixture.category === category?.name) || fixtures[index % fixtures.length];
  const price = typeof item.price === 'number' ? item.price : Number(item.price?.$numberDecimal || 0);
  return { ...visual, id: item.publicId || item._id || visual.id, slug: item.slug, title: item.title, price, currency: 'PKR', condition: item.condition.replace('-', ' '), location: [item.location?.area, item.location?.city].filter(Boolean).join(', ') || visual.location, category: category?.name || visual.category, postedAt: item.createdAt ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.max(0, Math.floor((Date.now() - +new Date(item.createdAt)) / 86400000)), 'day') : visual.postedAt, sponsored: item.isPromoted || item.promotion?.status === 'active' || false, promotionLabel: item.promotion?.label, promotionPlacement: item.promotion?.placements?.includes('search')?'search':item.promotion?.placements?.[0], urgent: item.promotion?.types?.includes('URGENT'), featured: item.promotion?.types?.includes('FEATURED')||false };
}

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const categories = useCategories() as Category[];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>(() => localStorage.getItem('qavlio-view') === 'list' ? 'list' : 'grid');
  const [saved, setSaved] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeSlug = categorySlug || params.get('category') || undefined;
  const activeCategory = categories.find((item) => item.slug === activeSlug);
  const queryText = params.get('q')?.trim();

  const apiParams = useMemo(() => {
    const next = new URLSearchParams(params);
    if (activeSlug) next.set('category', activeSlug);
    if (!next.get('sort')) next.set('sort', 'recommended');
    if (!next.get('page')) next.set('page', '1');
    next.set('limit', '24');
    return next;
  }, [params, activeSlug]);
  const searchQuery = useQuery({ queryKey: ['search', apiParams.toString()], queryFn: async ({ signal }) => (await marketplaceApi.search(apiParams, signal)).data as SearchData, placeholderData: (previous) => previous });
  const categoryQuery = useQuery({ queryKey: ['category', activeSlug], enabled: Boolean(activeSlug), queryFn: async () => (await marketplaceApi.getCategory(activeSlug!)).data as CategoryData });
  const spotlightQuery = useQuery({ queryKey: ['category-spotlight', activeSlug], enabled: Boolean(activeSlug), queryFn: async () => (await promotionApi.placement('category', activeSlug)).data as ApiListing[] });
  const subcategoryQuery = useQuery({ queryKey: ['subcategories', activeSlug], enabled: Boolean(activeSlug), queryFn: async () => (await marketplaceApi.getSubcategories(activeSlug!)).data as Subcategory[] });
  const result = searchQuery.data && !Array.isArray(searchQuery.data) && searchQuery.data.pagination ? searchQuery.data : undefined;
  const categoryRecord = categoryQuery.data && !Array.isArray(categoryQuery.data) && categoryQuery.data.slug ? categoryQuery.data : undefined;
  const title = location.pathname.startsWith('/category/') && activeCategory ? activeCategory.name : categoryRecord ? (categoryLabels[categoryRecord.slug] || categoryRecord.name) : activeCategory ? (categoryLabels[activeCategory.slug] || activeCategory.name) : queryText ? `Results for “${queryText}”` : 'Browse the marketplace';
  useDocumentTitle(categoryRecord?.seoTitle || (queryText ? `Search: ${queryText}` : 'Marketplace'));
  useEffect(() => { if (categoryRecord?.seoDescription) { let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]'); if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); } meta.content = categoryRecord.seoDescription; } }, [categoryRecord]);
  useEffect(() => { if (filtersOpen) closeRef.current?.focus(); }, [filtersOpen]);

  const update = (key: string, value?: string) => setParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); return next; });
  const clearFilters = () => setParams((current) => { const next = new URLSearchParams(); if (current.get('q')) next.set('q', current.get('q')!); if (!categorySlug && current.get('category')) next.set('category', current.get('category')!); return next; });
  const activeEntries = [...params.entries()].filter(([key, value]) => value && !['q', 'category', 'sort', 'page', 'limit'].includes(key));
  const rows = (result?.listings || []).map((item, index) => normalizeListing(item, index, categories));
  const canonical = activeSlug ? `${window.location.origin}/marketplace/${activeSlug}` : `${window.location.origin}${location.pathname}`;

  const saveSearch = () => {
    if (!user) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    setSaveOpen(true);
  };
  const share = async () => { try { if (navigator.share) await navigator.share({ title, url: window.location.href }); else await navigator.clipboard.writeText(window.location.href); } catch { /* user cancelled */ } };
  const selectView = (next: 'grid' | 'list') => { setView(next); localStorage.setItem('qavlio-view', next); };

  return <main className="min-h-screen bg-slate-50/60 pb-16">
    <link rel="canonical" href={canonical} />
    <div className="container-shell py-6 sm:py-9">
      <Breadcrumbs items={[{ label: 'Marketplace', to: '/marketplace' }, ...(activeCategory ? [{ label: activeCategory.name }] : [])]} />
      <header className="mt-5 max-w-3xl"><p className="eyebrow">QAVLIO marketplace</p><h1 className="mt-1 text-h1 text-ink-950">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{categoryRecord?.description || 'Search trusted local listings, compare your options and find the right match—without the noise.'}</p></header>

      {activeSlug && <nav className="hide-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Subcategories"><Link to={`/marketplace/${activeSlug}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${!params.get('subcategory') ? 'bg-ink-950 text-white' : 'border bg-white text-slate-700'}`}>All {activeCategory?.shortName || activeCategory?.name}</Link>{subCategoryLinks(subcategoryQuery.data || [], activeSlug, params)}</nav>}

      {queryText && <div className="mt-6"><SearchIntelligence query={queryText} /></div>}
      <AdSlot placement={location.pathname==='/search'?AD_SLOT_IDS.SEARCH_TOP:AD_SLOT_IDS.CATEGORY_TOP} category={activeSlug} city={params.get('location')||''} className="mt-6" />
      {spotlightQuery.data?.length ? <section className="mt-6 rounded-panel border border-violet-100 bg-violet-50/60 p-4 sm:p-5" aria-labelledby="category-spotlight"><div className="flex items-center justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-violet-600">Paid visibility</p><h2 id="category-spotlight" className="mt-1 font-extrabold">Featured in {activeCategory?.shortName || activeCategory?.name || activeSlug}</h2></div><span className="text-[9px] font-bold text-slate-500">Sponsored placements</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{spotlightQuery.data.slice(0,3).map((item,index)=><ListingCard key={item.publicId||item._id} listing={normalizeListing(item,index,categories)} variant="sponsored" />)}</div></section> : null}
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="sticky top-24 hidden lg:block"><FilterPanel params={params} dynamicFilters={result?.filters} onChange={update} onClear={clearFilters} /></aside>
        <section className="min-w-0" aria-labelledby="result-count">
          <div className="rounded-card border border-ink-900/10 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-control border border-slate-200 px-3 text-xs font-extrabold lg:hidden"><SlidersHorizontal size={15} /> Filters {activeEntries.length ? `(${activeEntries.length})` : ''}</button><p id="result-count" className="mr-auto text-sm font-semibold text-slate-500"><strong className="text-ink-900">{result?.pagination.total.toLocaleString() ?? '—'}</strong> results</p><button type="button" onClick={saveSearch} className="inline-flex h-10 items-center gap-1.5 rounded-control px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /> <span className="hidden sm:inline">{saved ? 'Search saved' : 'Save search'}</span></button><button type="button" onClick={() => void share()} className="grid h-10 w-10 place-items-center rounded-control text-slate-600 hover:bg-slate-100" aria-label="Share this search"><Share2 size={16} /></button>
              <label className="h-10"><span className="sr-only">Sort results</span><select value={params.get('sort') || 'recommended'} onChange={(event) => update('sort', event.target.value)} className="h-full rounded-control border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 sm:px-3"><option value="recommended">Recommended · organic</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="most-viewed">Most viewed</option><option value="nearest">Nearest</option></select></label>
              <div className="hidden rounded-control border border-slate-200 p-1 sm:flex" role="group" aria-label="Result view"><button type="button" onClick={() => selectView('grid')} className={`grid h-8 w-8 place-items-center rounded-lg ${view === 'grid' ? 'bg-violet-100 text-violet-700' : 'text-slate-500'}`} aria-label="Grid view" aria-pressed={view === 'grid'}><Grid2X2 size={15} /></button><button type="button" onClick={() => selectView('list')} className={`grid h-8 w-8 place-items-center rounded-lg ${view === 'list' ? 'bg-violet-100 text-violet-700' : 'text-slate-500'}`} aria-label="List view" aria-pressed={view === 'list'}><List size={16} /></button></div>
            </div>
            {activeEntries.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3" aria-label="Active filters">{activeEntries.map(([key, value]) => <button key={key} type="button" onClick={() => update(key)} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-800">{filterLabel(key, value)} <X size={12} /></button>)}<button type="button" onClick={clearFilters} className="text-[11px] font-extrabold text-slate-500 underline">Clear all</button></div>}
          </div>

          <div className="mt-4">{searchQuery.isLoading ? <SearchSkeleton /> : searchQuery.isError ? <State title="We couldn't load these results." text="Check your connection and try again." action="Try again" onClick={() => void searchQuery.refetch()} /> : rows.length === 0 ? <State title="Nothing found yet" text="Try changing your search or removing a filter." action="Clear filters" onClick={clearFilters} secondary /> : <div className={view === 'grid' ? 'grid gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-4'}>{rows.map((listing) => <ListingCard key={listing.id} listing={listing} horizontal={view === 'list'} />)}</div>}</div>
          <AdSlot placement={location.pathname==='/search'?AD_SLOT_IDS.SEARCH_MIDDLE:AD_SLOT_IDS.CATEGORY_MIDDLE} category={activeSlug} city={params.get('location')||''} className="mt-8" />
          {result && result.pagination.totalPages > 1 && <div className="mt-9"><Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} onPageChange={(page) => { update('page', String(page)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /></div>}
        </section>
      </div>
    </div>

    <AnimatePresence>{filtersOpen && <><motion.button className="fixed inset-0 z-[70] bg-ink-950/45 lg:hidden" onClick={() => setFiltersOpen(false)} aria-label="Close filters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.div role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title" className="fixed inset-0 z-[71] overflow-y-auto bg-white p-4 safe-bottom sm:left-auto sm:w-[420px] lg:hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white py-3"><div><h2 id="filter-drawer-title" className="font-extrabold">Filters {activeEntries.length ? `(${activeEntries.length})` : ''}</h2><button type="button" onClick={clearFilters} className="text-xs font-bold text-violet-700">Clear all</button></div><button ref={closeRef} type="button" onClick={() => setFiltersOpen(false)} className="tap-target grid place-items-center rounded-control" aria-label="Close filters"><X /></button></div><FilterPanel mobile params={params} dynamicFilters={result?.filters} onChange={update} onClear={clearFilters} onApply={() => setFiltersOpen(false)} /></motion.div></>}</AnimatePresence>
    <SavedSearchModal open={saveOpen} onClose={() => setSaveOpen(false)} initial={{ name: queryText ? `${queryText}${params.get('maxPrice') ? ` under ${params.get('maxPrice')}` : ''}${params.get('location') ? ` in ${params.get('location')}` : ''}` : title }} onSave={async (input) => { await buyerApi.createSavedSearch({ ...input, query: queryText || '', categoryId: activeSlug || '', location: params.get('location') || '', minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : null, maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : null, condition: params.get('condition') || '', sort: params.get('sort') || 'recommended' }); setSaved(true); }} />
  </main>;
}

function subCategoryLinks(items: Subcategory[], activeSlug: string, params: URLSearchParams) { return items.map((item) => { const next = new URLSearchParams(params); next.set('subcategory', item.slug); next.delete('page'); return <Link key={item.id || item._id || item.slug} to={`/marketplace/${activeSlug}?${next}`} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${params.get('subcategory') === item.slug ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}>{item.name}{item.count ? ` · ${item.count}` : ''}</Link>; }); }
function filterLabel(key: string, value: string) { if (key === 'minPrice') return `From Rs. ${Number(value).toLocaleString()}`; if (key === 'maxPrice') return `To Rs. ${Number(value).toLocaleString()}`; if (key === 'condition') return value.split(',').map((item) => item.replace('-', ' ')).join(', '); return value; }
function State({ title, text, action, onClick, secondary }: { title: string; text: string; action: string; onClick: () => void; secondary?: boolean }) { return <div className="rounded-panel border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600"><RotateCcw /></div><h2 className="mt-4 text-xl font-extrabold text-ink-900">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={onClick} className="rounded-control bg-violet-600 px-4 py-2.5 text-xs font-extrabold text-white">{action}</button>{secondary && <Link to="/categories" className="rounded-control border border-slate-200 px-4 py-2.5 text-xs font-extrabold">Browse categories</Link>}</div></div>; }

import { MapPin, Search } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';

export default function SearchBar({ compact = false }) {
  const navigate = useNavigate();
  const categories = useCategories();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  function handleSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'all') params.set('category', category);
    navigate(`/browse${params.size ? `?${params.toString()}` : ''}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={`flex w-full items-center rounded-xl border border-ink-900/15 bg-white shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 ${compact ? 'h-11' : 'h-12'}`}>
      <label className="sr-only" htmlFor={`category-search-${compact}`}>Category</label>
      <select id={`category-search-${compact}`} value={category} onChange={(event) => setCategory(event.target.value)} className="hidden h-full max-w-[155px] rounded-l-xl border-0 bg-transparent px-3 text-xs font-bold text-ink-800 outline-none md:block">
        <option value="all">All categories</option>
        {categories.slice(0, 10).map((item) => <option key={item.id} value={item.slug}>{item.shortName || item.name}</option>)}
      </select>
      <span className="hidden h-6 w-px bg-slate-200 md:block" />
      <Search size={18} className="ml-3 shrink-0 text-slate-400" aria-hidden="true" />
      <label className="sr-only" htmlFor={`marketplace-search-${compact}`}>Search DealHub</label>
      <input id={`marketplace-search-${compact}`} value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="What are you looking for?" className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-ink-900 outline-none placeholder:text-slate-400" />
      <button type="button" className="hidden h-full items-center gap-1.5 border-l border-slate-200 px-3 text-xs font-bold text-slate-600 hover:text-violet-700 xl:flex" aria-label="Choose location">
        <MapPin size={15} /> Rawalpindi
      </button>
      <button type="submit" className="mr-1.5 inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 px-4 text-xs font-extrabold text-white transition hover:bg-violet-700">
        <span className="hidden sm:inline">Search</span><Search size={17} className="sm:hidden" />
      </button>
    </form>
  );
}

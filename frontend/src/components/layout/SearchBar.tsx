import { MapPin, Search, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useCategories } from '../../hooks/useCategories';
import type { Category } from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { useAuth } from '../../auth/AuthProvider';
import { buyerApi } from '../../services/apiClient';
import { LocationSelector } from '../ui/LocationSelector';
import SearchAutocomplete from '../marketplace/SearchAutocomplete';

function rememberGuestSearch(term: string) {
  try {
    const current: string[] = JSON.parse(localStorage.getItem('qavlio-recent-searches') || '[]');
    localStorage.setItem('qavlio-recent-searches', JSON.stringify([term, ...current.filter((item) => item !== term)].slice(0, 8)));
  } catch { /* storage unavailable */ }
}

interface SearchBarProps {
  variant?: 'header' | 'hero';
  compact?: boolean;
  className?: string;
}

export default function SearchBar({ variant = 'header', compact = false, className }: SearchBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const categories = useCategories() as Category[];
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [aiMode, setAiMode] = useState(false);
  const [location, setLocation] = useState('Rawalpindi');
  const containerRef = useRef<HTMLFormElement | null>(null);
  const isHero = variant === 'hero';
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query), 220); return () => window.clearTimeout(timer); }, [query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'all') params.set('category', category);
    if (location !== 'All Pakistan') params.set('location', location);
    if (aiMode && query.trim()) params.set('ai', '1');
    setSuggestionsOpen(false);
    if (user && query.trim()) void buyerApi.recordSearch({ query: query.trim(), filters: { category, location } }).catch(() => undefined);
    if (query.trim()) rememberGuestSearch(query.trim());
    navigate(`/search${params.size ? `?${params.toString()}` : ''}`);
  }

  if (isHero) {
    return (
      <form
        ref={containerRef}
        onSubmit={handleSubmit}
        role="search"
        className={cn('relative grid gap-2 rounded-panel border border-ink-900/10 bg-white p-2 shadow-lg transition duration-200 focus-within:border-violet-300 focus-within:shadow-floating sm:grid-cols-[minmax(0,1fr)_180px_180px_auto]', className)}
      >
        <label className="relative flex min-w-0 items-center rounded-control bg-slate-50 sm:bg-transparent">
          <Search size={19} className="pointer-events-none absolute start-3.5 text-violet-600" aria-hidden="true" />
          <span className="sr-only">{t('search.placeholder')}</span>
          <input
            value={query}
            onFocus={() => setSuggestionsOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setSuggestionsOpen(true); }}
            autoComplete="off"
            aria-autocomplete="list"
            type="search"
            placeholder={t('common.searchAnything')}
            className="h-12 w-full min-w-0 bg-transparent ps-11 pe-3 text-sm font-semibold text-ink-900 outline-none placeholder:font-medium placeholder:text-slate-400"
          />
        </label>
        <div className="border-ink-900/10 sm:border-s">
          <LocationSelector value={location} onChange={setLocation} />
        </div>
        <label className="relative flex items-center border-ink-900/10 sm:border-s">
          <span className="sr-only">{t('common.category')}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-12 w-full appearance-none bg-transparent px-4 text-sm font-bold text-ink-800 outline-none"
          >
            <option value="all">{t('common.allCategories')}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setAiMode((value) => !value)}
          aria-pressed={aiMode}
          title={aiMode ? 'AI natural language search is on' : 'Turn on AI natural language search'}
          className={`inline-flex h-12 items-center justify-center gap-1.5 rounded-control px-3 text-xs font-extrabold ring-1 transition ${aiMode ? 'bg-violet-600 text-white ring-violet-600' : 'bg-violet-50 text-violet-700 ring-violet-200'}`}
        >
          <Sparkles size={15} aria-hidden="true" />
          <span className="hidden xl:inline">AI</span>
        </button>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-violet-600 px-6 text-sm font-extrabold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700"
        >
          <Search size={18} /> {aiMode ? 'Ask AI' : t('common.search')}
        </button>
        {suggestionsOpen && (
          <SearchAutocomplete query={debouncedQuery} category={category} anchor={containerRef.current} onSelect={() => setSuggestionsOpen(false)} />
        )}
      </form>
    );
  }

  return (
    <form
      ref={containerRef}
      onSubmit={handleSubmit}
      role="search"
      className={cn('relative flex w-full items-center rounded-control border border-ink-900/15 bg-white shadow-sm transition duration-200 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10', compact ? 'h-11' : 'h-12', className)}
    >
      <Search size={18} className="ms-3.5 shrink-0 text-violet-600" aria-hidden="true" />
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t('search.placeholder')}</span>
        <input
          value={query}
          onFocus={() => setSuggestionsOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setSuggestionsOpen(true); }}
          autoComplete="off"
          aria-autocomplete="list"
          type="search"
          placeholder={t('search.placeholder')}
          className="h-full w-full min-w-0 border-0 bg-transparent px-3 text-sm font-semibold text-ink-900 outline-none placeholder:font-medium placeholder:text-slate-400"
        />
      </label>
      <label className="hidden h-6 border-s border-slate-200 ps-2 xl:block">
        <span className="sr-only">{t('common.category')}</span>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-6 max-w-36 bg-transparent px-2 text-xs font-bold text-slate-600 outline-none"
        >
          <option value="all">{t('common.allCategories')}</option>
          {categories.slice(0, 12).map((item) => (
            <option key={item.id} value={item.slug}>{item.shortName || item.name}</option>
          ))}
        </select>
      </label>
      <label className="hidden h-full items-center border-s border-slate-200 px-3 2xl:flex">
        <MapPin size={14} className="text-slate-400" />
        <span className="sr-only">{t('common.location')}</span>
        <select
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="max-w-28 bg-transparent text-xs font-bold text-slate-600 outline-none"
        >
          <option>Rawalpindi</option>
          <option>Islamabad</option>
          <option>Lahore</option>
          <option>Karachi</option>
          <option>All Pakistan</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => setAiMode((value) => !value)}
        aria-pressed={aiMode}
        aria-label={aiMode ? 'AI natural language search is on. Switch to normal search.' : 'Turn on AI natural language search'}
        className={`me-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 transition ${aiMode ? 'bg-violet-600 text-white ring-violet-600' : 'bg-violet-50 text-violet-700 ring-violet-200'}`}
      >
        <Sparkles size={14} aria-hidden="true" />
      </button>
      <button
        type="submit"
        className="me-1.5 inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 px-4 text-xs font-extrabold text-white transition duration-200 hover:bg-violet-700"
      >
        <span className="hidden sm:inline">{aiMode ? 'Ask AI' : t('common.search')}</span>
        <Search size={17} className="sm:hidden" />
      </button>
      {suggestionsOpen && (
        <SearchAutocomplete query={debouncedQuery} category={category} anchor={containerRef.current} onSelect={() => setSuggestionsOpen(false)} />
      )}
    </form>
  );
}

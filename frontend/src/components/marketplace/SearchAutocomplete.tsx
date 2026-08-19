import { Clock3, LayoutGrid, Search, Smartphone, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

interface Props {
  query: string;
  category?: string;
  anchor?: HTMLElement | null;
  onSelect?: () => void;
}

const popular = ['iPhone 15 Pro', 'iPhone 14', 'Toyota Corolla', 'Gaming PC'];
const urduPopular = ['موبائل', 'گاڑی', 'لیپ ٹاپ', 'فرنیچر'];
const categoryLabels: Record<string, { en: string; ur: string; slug: string }[]> = {
  mobile: [
    { en: 'Mobiles', ur: 'موبائلز', slug: 'mobiles' },
    { en: 'Mobile Phones', ur: 'موبائل فونز', slug: 'mobile-phones' },
    { en: 'Mobile Accessories', ur: 'موبائل کے لوازمات', slug: 'mobile-accessories' },
  ],
  گاڑی: [
    { en: 'Cars', ur: 'گاڑیاں', slug: 'cars' },
    { en: 'Motorcycles', ur: 'موٹر سائیکلیں', slug: 'motorcycles' },
  ],
  لیپ: [
    { en: 'Computers & Laptops', ur: 'کمپیوٹرز', slug: 'computers-laptops' },
  ],
  فرنیچر: [
    { en: 'Furniture', ur: 'فرنیچر', slug: 'furniture' },
  ],
};

function detectCategoryBilingual(q: string) {
  const lower = q.toLowerCase();
  const urduKeys = Object.keys(categoryLabels);
  if (lower.startsWith('iphone') || lower.includes('mob') || urduKeys.some((k) => q.includes(k))) {
    if (lower.startsWith('iphone')) return 'mobile';
    for (const k of urduKeys) if (q.includes(k)) return k;
  }
  return null;
}

export default function SearchAutocomplete({ query, category, anchor, onSelect }: Props) {
  const q = query.trim();
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lang = typeof document !== 'undefined' ? (document.documentElement.lang === 'ur' ? 'ur' : 'en') : 'en';

  useLayoutEffect(() => {
    function update() {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setPosition({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchor, q]);

  useEffect(() => {
    if (q.length < 2) return;
    setLoading(true);
    setError(false);
    const id = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    function handle(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onSelect?.();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [anchor, onSelect]);

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (event.key === 'Escape') onSelect?.();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onSelect]);

  if (q.length < 2 || !position) return null;

  const target = `/search?q=${encodeURIComponent(q)}${category && category !== 'all' ? `&category=${category}` : ''}`;
  const matches = popular.filter((item) => item.toLowerCase().includes(q.toLowerCase())).slice(0, 3);
  const matchKey = detectCategoryBilingual(q);
  const categoryResults = matchKey ? categoryLabels[matchKey] : null;

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'absolute', top: position.top, left: position.left, width: position.width, zIndex: 9999 }}
      className="overflow-hidden rounded-card border border-slate-200 bg-white text-left shadow-floating"
      role="listbox"
      aria-label="Search suggestions"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        <span>{lang === 'ur' ? `«${q}» کے نتائج` : `Results for "${q}"`}</span>
        <button type="button" onClick={onSelect} className="text-slate-400 hover:text-ink-900" aria-label="Close suggestions">
          <X size={13} />
        </button>
      </div>
      <Link to={target} onClick={onSelect} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-ink-900 hover:bg-violet-50">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-violet-700">
          <Search size={15} />
        </span>
        <span className="truncate">{lang === 'ur' ? `«${q}» تلاش کریں` : `Search “${q}”`}</span>
      </Link>
      {categoryResults && (
        <div className="border-t border-slate-100 px-4 pb-2 pt-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {lang === 'ur' ? 'زمرے' : 'Categories'}
          </p>
          {categoryResults.map((item) => (
            <Link
              key={item.slug}
              to={`${target}&category=${item.slug}`}
              onClick={onSelect}
              className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-700 hover:text-violet-700"
            >
              <Smartphone size={14} className="text-violet-600" />
              <span className="font-bold text-ink-900">{lang === 'ur' ? item.ur : item.en}</span>
              {lang === 'ur' && <span className="text-[10px] text-slate-400">{item.en}</span>}
            </Link>
          ))}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs font-bold text-slate-500">
          <span className="grid h-4 w-4 animate-spin place-items-center rounded-full border-2 border-violet-300 border-t-violet-600" />
          {lang === 'ur' ? 'تلاش ہو رہی ہے…' : 'Searching…'}
        </div>
      )}
      {error && (
        <div className="border-t border-slate-100 px-4 py-3 text-xs font-bold text-red-600">
          {lang === 'ur' ? 'تلاش دستیاب نہیں' : 'Search is unavailable right now.'}
        </div>
      )}
      {matches.length > 0 && !loading && (
        <div className="border-t border-slate-100 px-4 pt-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {lang === 'ur' ? 'مقبول تلاش' : 'Popular searches'}
          </p>
          {matches.map((item) => (
            <Link
              key={item}
              to={`/search?q=${encodeURIComponent(item)}`}
              onClick={onSelect}
              className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-700 hover:text-violet-700"
            >
              <Clock3 size={13} />
              {item}
            </Link>
          ))}
          {lang === 'ur' && urduPopular.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {urduPopular.slice(0, 3).map((item) => (
                <Link
                  key={item}
                  to={`/search?q=${encodeURIComponent(item)}`}
                  onClick={onSelect}
                  className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700 hover:bg-violet-100"
                >
                  {item}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="border-t border-slate-100 px-4 pb-3 pt-2">
        <Link
          to="/marketplace/mobiles"
          onClick={onSelect}
          className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-violet-700"
        >
          <LayoutGrid size={12} /> {lang === 'ur' ? 'تمام زمرے' : 'Browse all categories'}
        </Link>
      </div>
    </div>,
    document.body,
  );
}

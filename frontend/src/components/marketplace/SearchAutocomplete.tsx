import { Clock3, LayoutGrid, Search, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props { query: string; category?: string; onSelect?: () => void; }
const popular = ['iPhone 15 Pro', 'iPhone 14', 'Toyota Corolla', 'Gaming PC'];
export default function SearchAutocomplete({ query, category, onSelect }: Props) {
  const q = query.trim();
  if (q.length < 2) return null;
  const matches = popular.filter((item) => item.toLowerCase().includes(q.toLowerCase())).slice(0, 3);
  const target = `/search?q=${encodeURIComponent(q)}${category && category !== 'all' ? `&category=${category}` : ''}`;
  return <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-card border border-slate-200 bg-white p-2 text-left shadow-floating" role="listbox" aria-label="Search suggestions">
    <Link to={target} onClick={onSelect} className="flex items-center gap-3 rounded-control px-3 py-3 text-sm font-bold text-ink-900 hover:bg-violet-50"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-violet-700"><Search size={15} /></span><span>Search “{q}”</span></Link>
    {q.toLowerCase().startsWith('iphone') && <Link to={`${target}&category=mobiles`} onClick={onSelect} className="flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-slate-50"><Smartphone size={17} className="text-violet-600" /><span><strong className="block text-xs">Mobiles</strong><span className="text-[11px] text-slate-500">iPhone</span></span></Link>}
    {matches.length > 0 && <div className="mt-1 border-t border-slate-100 px-3 pt-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Popular searches</p>{matches.map((item) => <Link key={item} to={`/search?q=${encodeURIComponent(item)}`} onClick={onSelect} className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-700 hover:text-violet-700"><Clock3 size={13} />{item}</Link>)}</div>}
    <div className="border-t border-slate-100 px-3 pt-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Categories</p><Link to="/marketplace/mobiles" onClick={onSelect} className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-700"><LayoutGrid size={13} /> Mobile Phones</Link></div>
  </div>;
}

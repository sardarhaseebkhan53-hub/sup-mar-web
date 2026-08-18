import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { marketplaceApi } from '../../services/apiClient';
import type { Category } from '../../types/marketplace';
import CategoryIcon from '../ui/CategoryIcon';
interface Props { category: string; subcategory: string; onChange: (category: string, subcategory?: string) => void; }
export default function CategorySelector({ category, subcategory, onChange }: Props) {
  const categories = useCategories() as Category[];
  const children = useQuery({ queryKey: ['subcategories', category], enabled: Boolean(category), queryFn: async () => (await marketplaceApi.getSubcategories(category)).data as Array<{ name: string; slug: string }> });
  return <div><h2 className="text-xl font-extrabold">Choose a category</h2><p className="mt-1 text-sm text-slate-500">The right category helps buyers find your listing.</p><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{categories.map((item) => <button type="button" key={item.id} onClick={() => onChange(item.slug)} className={`relative flex min-h-24 flex-col items-center justify-center rounded-card border p-3 text-center ${category === item.slug ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/10' : 'border-slate-200 hover:border-violet-200'}`}><CategoryIcon name={item.icon} accent={item.accent} size={19} className="h-9 w-9 rounded-lg" /><span className="mt-2 text-[11px] font-extrabold">{item.shortName || item.name}</span>{category === item.slug && <Check className="absolute right-2 top-2 text-violet-600" size={14} />}</button>)}</div>{category && <fieldset className="mt-6"><legend className="text-xs font-extrabold">Subcategory</legend><div className="mt-3 flex flex-wrap gap-2">{children.isLoading ? <span className="text-xs text-slate-400">Loading options…</span> : (children.data || []).map((item) => <button type="button" key={item.slug} onClick={() => onChange(category, item.slug)} className={`rounded-full border px-4 py-2 text-xs font-bold ${subcategory === item.slug ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200'}`}>{item.name}</button>)}</div></fieldset>}</div>;
}

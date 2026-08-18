import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../../services/apiClient';
interface Field { key: string; label: string; type: string; options?: string[]; }
export default function DynamicAttributeFields({ category, values, onChange }: { category: string; values: Record<string, string | number | boolean>; onChange: (key: string, value: string | number | boolean) => void }) {
  const query = useQuery({ queryKey: ['category-fields', category], enabled: Boolean(category), queryFn: async () => (await marketplaceApi.getCategory(category)).data as { filters?: Field[] } });
  const fields = (query.data?.filters || []).filter((field) => !['condition', 'listingType'].includes(field.key));
  if (!fields.length) return null;
  return <fieldset className="mt-6"><legend className="text-sm font-extrabold">Category details</legend><div className="mt-3 grid gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="text-xs font-bold">{field.label}{field.options ? <select className="input-base mt-2" value={String(values[field.key] || '')} onChange={(e) => onChange(field.key, e.target.value)}><option value="">Select {field.label.toLowerCase()}</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : field.type === 'boolean' ? <select className="input-base mt-2" value={String(values[field.key] ?? '')} onChange={(e) => onChange(field.key, e.target.value === 'true')}><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select> : <input className="input-base mt-2" type="number" value={String(values[field.key] || '')} onChange={(e) => onChange(field.key, Number(e.target.value))} />}</label>)}</div></fieldset>;
}

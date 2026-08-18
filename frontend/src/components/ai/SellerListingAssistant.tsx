import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { aiApi } from '../../services/apiClient';

interface Props {
  title: string;
  description: string;
  category?: string;
  facts?: Record<string, string>;
  onApplyTitle?: (value: string) => void;
  onApplyDescription?: (value: string) => void;
  onApplyCategory?: (category: string, subcategory?: string) => void;
}

export default function SellerListingAssistant({ title, description, category, facts, onApplyTitle, onApplyDescription, onApplyCategory }: Props) {
  const [note, setNote] = useState('');
  const run = useMutation({
    mutationFn: async (action: string) => (await aiApi.listingAssistant({ action, title, description, category, facts })).data,
    onSuccess: (data) => setNote(data.note || data.title?.note || 'Review this suggestion before saving.'),
  });
  const data = run.data;
  return <aside className="rounded-panel border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-violet-700"><Sparkles size={14} /> AI Listing Assistant</p>
    <p className="mt-2 text-xs leading-5 text-slate-600">I only use facts you already entered. Confirm category before it is saved.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {[['title', 'Improve title'], ['description', 'Improve description'], ['category', 'Suggest category'], ['tags', 'Generate tags']].map(([action, label]) => (
        <button key={action} type="button" onClick={() => run.mutate(action)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200">{label}</button>
      ))}
    </div>
    {run.isPending && <p className="mt-3 text-xs font-bold text-violet-700">QAVLIO is thinking...</p>}
    {note && <p className="mt-3 text-[11px] font-semibold text-slate-500">{note}</p>}
    {data?.suggestion && data.action === 'title' && <Suggestion label="Title" value={data.suggestion} onApply={onApplyTitle} />}
    {data?.suggestion && data.action === 'description' && <Suggestion label="Description" value={data.suggestion} onApply={onApplyDescription} />}
    {data?.category && <div className="mt-3 rounded-card bg-white p-3 text-xs">
      <p className="font-extrabold">Suggested category</p>
      <p className="mt-1">{data.category.name}{data.subcategory ? ` → ${data.subcategory.name}` : ''}</p>
      {onApplyCategory && <button type="button" onClick={() => onApplyCategory(data.category.slug, data.subcategory?.slug)} className="mt-2 h-9 rounded-control bg-ink-950 px-3 text-[10px] font-extrabold text-white">Confirm category</button>}
    </div>}
    {data?.tags && <p className="mt-3 text-xs font-semibold text-slate-600">Tags: {data.tags.join(', ')}</p>}
    {data?.title?.suggestion && <Suggestion label="Title" value={data.title.suggestion} onApply={onApplyTitle} />}
    {data?.description?.suggestion && <Suggestion label="Description" value={data.description.suggestion} onApply={onApplyDescription} />}
  </aside>;
}

function Suggestion({ label, value, onApply }: { label: string; value: string; onApply?: (value: string) => void }) {
  return <div className="mt-3 rounded-card bg-white p-3">
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-1 whitespace-pre-wrap text-xs font-semibold text-ink-800">{value}</p>
    {onApply && <button type="button" onClick={() => onApply(value)} className="mt-2 text-[11px] font-extrabold text-violet-700">Use this</button>}
  </div>;
}

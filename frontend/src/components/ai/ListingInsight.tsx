import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import { aiApi } from '../../services/apiClient';

export default function ListingInsight({ listingId }: { listingId: string }) {
  const { openAssistant, toggleCompare, compareIds } = useAiAssistant();
  const query = useQuery({ queryKey: ['ai-listing', listingId], queryFn: async () => (await aiApi.listingAssistant({ action: 'explain', listingId })).data, staleTime: 60_000 });
  const insight = query.data;
  const selected = compareIds.includes(listingId);
  return <section className="rounded-panel border border-violet-200 bg-gradient-to-br from-white to-violet-50 p-5">
    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-violet-700"><Sparkles size={14} /> Ask QAVLIO about this listing</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {['Is this a good deal?', 'What should I ask the seller?', 'What are the important details?'].map((prompt) => (
        <button key={prompt} type="button" onClick={() => openAssistant({ listingId, prompt })} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200">{prompt}</button>
      ))}
      <button type="button" onClick={() => toggleCompare(listingId)} className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold ${selected ? 'bg-ink-950 text-white' : 'bg-white text-ink-800 ring-1 ring-slate-200'}`}>{selected ? 'Selected for compare' : 'Compare'}</button>
    </div>
    {insight?.summary && <div className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
      <p className="font-extrabold text-ink-900">Key details</p>
      <ul className="list-disc pl-4">{(insight.summary.keyDetails || []).slice(0, 6).map((item: string) => <li key={item}>{item}</li>)}</ul>
      {insight.priceInsight?.min ? <p className="font-semibold text-violet-800">Similar QAVLIO listings range from Rs. {Number(insight.priceInsight.min).toLocaleString()} to Rs. {Number(insight.priceInsight.max).toLocaleString()}.</p> : <p>{insight.priceInsight?.source}</p>}
      <p className="text-[10px] text-slate-400">{insight.summary.caution}</p>
    </div>}
  </section>;
}

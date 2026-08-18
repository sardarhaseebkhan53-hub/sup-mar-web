import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { aiApi } from '../../services/apiClient';
import AIAttributeSuggestion from './AIAttributeSuggestion';
import AICategorySuggestion from './AICategorySuggestion';
import AIDescriptionSuggestion from './AIDescriptionSuggestion';
import AIPriceInsight from './AIPriceInsight';
import AIQualityScore from './AIQualityScore';
import AITitleSuggestion from './AITitleSuggestion';
import AIUsageIndicator from './AIUsageIndicator';

export interface AIListingAssistantProps {
  title: string;
  description: string;
  category?: string;
  subcategory?: string;
  condition?: string;
  price?: number;
  imageCount?: number;
  attributes?: Record<string, string>;
  facts?: Record<string, string>;
  onApplyTitle?: (value: string) => void;
  onApplyDescription?: (value: string) => void;
  onApplyCategory?: (category: string, subcategory?: string) => void;
  onApplyAttributes?: (attributes: Record<string, string>) => void;
}

type AssistantAction = 'title' | 'description' | 'category' | 'attributes';

type AssistantResult = {
  action: string;
  suggestion?: string;
  note?: string;
  missing?: string[];
  invented?: boolean;
  category?: { name: string; slug: string };
  subcategory?: { name: string; slug: string } | null;
  tags?: string[];
  attributes?: Record<string, string>;
  confirmRequired?: boolean;
};

/**
 * AIListingAssistant (§31, §57) — the seller's "Improve with AI" panel:
 * Improve Title · Improve Description · Suggest Category · Extract Attributes ·
 * Price Insight · Listing Quality. Every output needs Apply / Edit / Dismiss.
 */
export default function AIListingAssistant(props: AIListingAssistantProps) {
  const { title, description, category, subcategory, condition, price, imageCount, attributes } = props;
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [appliedAttributes, setAppliedAttributes] = useState<Record<string, string>>({});

  const run = useMutation({
    mutationFn: async (action: AssistantAction) => {
      const payload = {
        title,
        description,
        category,
        subcategory,
        condition,
        price,
        imageCount,
        attributes,
        text: [title, description].filter(Boolean).join('\n'),
        ...(props.facts?.location ? { location: props.facts.location } : {}),
      };
      const response = action === 'title' ? await aiApi.listingTitle(payload)
        : action === 'description' ? await aiApi.listingDescription(payload)
          : action === 'category' ? await aiApi.listingCategory(payload)
            : await aiApi.listingAttributes(payload);
      return response.data as AssistantResult;
    },
  });

  const data = run.data as AssistantResult | undefined;

  const actions: Array<[AssistantAction, string]> = [
    ['title', 'Improve title'],
    ['description', 'Improve description'],
    ['category', 'Suggest category'],
    ['attributes', 'Extract attributes'],
  ];

  return (
    <aside className="rounded-panel border border-violet-200 bg-violet-50/50 p-4 sm:p-5" aria-label="AI Listing Assistant">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-violet-700"><Sparkles size={14} aria-hidden="true" /> Improve with AI</p>
        {run.isPending && <AIUsageIndicator processing />}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">I only use facts you already entered. Nothing is saved until you apply it, and I never add specifications you did not supply.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map(([action, label]) => (
          <button key={action} type="button" onClick={() => run.mutate(action)} disabled={run.isPending || (!title && !description)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100 disabled:opacity-50">{label}</button>
        ))}
        {(!title && !description) && <p className="w-full text-[10px] font-semibold text-slate-400">Start typing your title or description to enable AI help.</p>}
      </div>

      <div className="mt-4 space-y-3" aria-live="polite">
        {run.isPending && <p className="text-xs font-bold text-violet-700">QAVLIO is thinking…</p>}

        {data?.action === 'title' && data.suggestion && !dismissed.title && (
          <AITitleSuggestion suggestion={data.suggestion} note={data.note} onApply={(value) => { props.onApplyTitle?.(value); setDismissed((current) => ({ ...current, title: true })); }} onDismiss={() => setDismissed((current) => ({ ...current, title: true }))} />
        )}
        {data?.action === 'description' && data.suggestion && !dismissed.description && (
          <AIDescriptionSuggestion suggestion={data.suggestion} missing={data.missing} note={data.note} onApply={(value) => { props.onApplyDescription?.(value); setDismissed((current) => ({ ...current, description: true })); }} onDismiss={() => setDismissed((current) => ({ ...current, description: true }))} />
        )}
        {data?.action === 'category' && data.category && !dismissed.category && (
          <AICategorySuggestion category={data.category} subcategory={data.subcategory} note={data.note} onApply={(categorySlug, subcategorySlug) => { props.onApplyCategory?.(categorySlug, subcategorySlug); setDismissed((current) => ({ ...current, category: true })); }} onDismiss={() => setDismissed((current) => ({ ...current, category: true }))} />
        )}
        {data?.action === 'attributes' && !dismissed.attributes && (
          <AIAttributeSuggestion
            attributes={data.attributes || {}}
            note={data.note}
            onApply={(key, value) => {
              const next = { ...appliedAttributes, [key]: value };
              setAppliedAttributes(next);
              props.onApplyAttributes?.(next);
            }}
            onDismiss={(key) => {
              const next = { ...appliedAttributes };
              delete next[key];
              setAppliedAttributes(next);
              props.onApplyAttributes?.(next);
            }}
          />
        )}
        {Object.keys(appliedAttributes).length > 0 && (
          <p className="text-[10px] font-bold text-emerald-700">Confirmed attributes: {Object.entries(appliedAttributes).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>
        )}

        {category && <AIPriceInsight category={category} attributes={attributes} price={price} />}

        <AIQualityScore input={{ title, description, category, subcategory, condition, price, imageCount, attributes }} />
      </div>
    </aside>
  );
}

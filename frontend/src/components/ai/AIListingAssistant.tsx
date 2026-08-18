import { Sparkles } from 'lucide-react';
import AIAttributeSuggestionPanel from './AIAttributeSuggestion';
import AICategorySuggestionPanel from './AICategorySuggestion';
import AIDescriptionSuggestionPanel from './AIDescriptionSuggestion';
import AITitleSuggestionPanel from './AITitleSuggestion';

interface Props {
  title: string;
  description: string;
  category?: string;
  condition?: string;
  price?: string;
  city?: string;
  attributes?: Record<string, string | number | boolean>;
  onApplyTitle: (value: string) => void;
  onApplyDescription: (value: string) => void;
  onApplyCategory: (category: string, subcategory?: string) => void;
  onApplyAttribute: (key: string, value: string | number | boolean) => void;
}

/**
 * "Improve with AI" panel for the Create Listing flow.
 * Every suggestion here offers Apply / Edit / Dismiss and nothing is written
 * into the seller's listing without an explicit action.
 */
export default function AIListingAssistant({ title, description, category, condition, price, city, attributes, onApplyTitle, onApplyDescription, onApplyCategory, onApplyAttribute }: Props) {
  return (
    <aside className="rounded-panel border border-violet-200 bg-violet-50/50 p-4 sm:p-5" aria-labelledby="ai-listing-assistant-heading">
      <h3 id="ai-listing-assistant-heading" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-violet-700">
        <Sparkles size={14} aria-hidden="true" /> Improve with AI
      </h3>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        I only reorganise facts you have already entered. I will never add warranty, accessories, specifications or ownership history you did not supply — and nothing is saved until you press Apply.
      </p>

      <div className="mt-4 space-y-4">
        <AITitleSuggestionPanel title={title} description={description} category={category} attributes={attributes} onApply={onApplyTitle} />
        <AIDescriptionSuggestionPanel title={title} description={description} category={category} condition={condition} price={price} city={city} attributes={attributes} onApply={onApplyDescription} />
        <AIAttributeSuggestionPanel title={title} description={description} category={category} attributes={attributes} onApply={onApplyAttribute} />
        <AICategorySuggestionPanel title={title} description={description} attributes={attributes} onApply={onApplyCategory} />
      </div>
    </aside>
  );
}

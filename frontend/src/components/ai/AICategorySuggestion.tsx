import { SuggestionFrame } from './AISuggestionControls';

/** AICategorySuggestion — a suggested category path the seller can accept or change. */
export default function AICategorySuggestion({
  category,
  subcategory,
  note,
  onApply,
  onDismiss,
}: {
  category: { name: string; slug: string };
  subcategory?: { name: string; slug: string } | null;
  note?: string;
  onApply: (categorySlug: string, subcategorySlug?: string) => void;
  onDismiss: () => void;
}) {
  return (
    <SuggestionFrame title="Category" note={note || 'Confirm this category before it is saved. I will not change it automatically.'}>
      <p className="mt-2 text-xs font-semibold text-ink-800">{category.name}{subcategory ? <span className="text-slate-400"> → {subcategory.name}</span> : null}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => onApply(category.slug, subcategory?.slug)} className="h-9 rounded-control bg-violet-600 px-3 text-[10px] font-extrabold text-white">Confirm category</button>
        <button type="button" onClick={onDismiss} className="h-9 rounded-control border px-3 text-[10px] font-bold text-slate-500">Keep my choice</button>
      </div>
    </SuggestionFrame>
  );
}

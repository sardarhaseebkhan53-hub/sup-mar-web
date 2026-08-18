import { Check, X } from 'lucide-react';
import { SuggestionFrame } from './AISuggestionControls';

/** AIAttributeSuggestion — attributes read only from seller text; each is confirmed individually. */
export default function AIAttributeSuggestion({
  attributes,
  note,
  onApply,
  onDismiss,
}: {
  attributes: Record<string, string>;
  note?: string;
  onApply: (key: string, value: string) => void;
  onDismiss: (key: string) => void;
}) {
  const entries = Object.entries(attributes || {});
  if (!entries.length) {
    return <SuggestionFrame title="Attributes" note={note}><p className="mt-2 text-xs font-semibold text-slate-500">No attributes detected yet — type what you know (brand, storage, color…) and I will suggest them for you to confirm.</p></SuggestionFrame>;
  }
  return (
    <SuggestionFrame title="Attributes" note={note}>
      <ul className="mt-2 space-y-1.5" role="list">
        {entries.map(([key, value]) => (
          <li key={key} className="flex items-center justify-between gap-2 rounded-control bg-slate-50 px-2.5 py-1.5 text-xs">
            <span><span className="font-extrabold capitalize text-ink-800">{key}:</span> <span className="font-semibold text-slate-600">{value}</span></span>
            <span className="flex gap-1">
              <button type="button" onClick={() => onApply(key, value)} aria-label={`Confirm ${key} ${value}`} className="grid h-7 w-7 place-items-center rounded-control bg-violet-600 text-white"><Check size={12} aria-hidden="true" /></button>
              <button type="button" onClick={() => onDismiss(key)} aria-label={`Dismiss ${key} suggestion`} className="grid h-7 w-7 place-items-center rounded-control border text-slate-400"><X size={12} aria-hidden="true" /></button>
            </span>
          </li>
        ))}
      </ul>
    </SuggestionFrame>
  );
}

import { SuggestionControls, SuggestionFrame } from './AISuggestionControls';

/** AIDescriptionSuggestion — structured description built ONLY from seller-supplied facts. */
export default function AIDescriptionSuggestion({ suggestion, missing, note, onApply, onDismiss }: { suggestion: string; missing?: string[]; note?: string; onApply: (value: string) => void; onDismiss: () => void }) {
  return (
    <SuggestionFrame title="Description" tone="draft" note={note}>
      <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-ink-800">{suggestion}</p>
      {missing?.length ? <p className="mt-2 text-[10px] font-bold text-amber-700">You could still add: {missing.join(', ')}.</p> : null}
      <SuggestionControls value={suggestion} onApply={onApply} onDismiss={onDismiss} applyLabel="Use this description" />
    </SuggestionFrame>
  );
}

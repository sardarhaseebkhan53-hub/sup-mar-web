import { SuggestionControls, SuggestionFrame } from './AISuggestionControls';

/** AITitleSuggestion — AI title draft from seller facts only; seller approves before publishing. */
export default function AITitleSuggestion({ suggestion, note, onApply, onDismiss }: { suggestion: string; note?: string; onApply: (value: string) => void; onDismiss: () => void }) {
  return (
    <SuggestionFrame title="Title" note={note}>
      <p className="mt-2 whitespace-pre-wrap text-xs font-semibold text-ink-800">{suggestion}</p>
      <SuggestionControls value={suggestion} onApply={onApply} onDismiss={onDismiss} applyLabel="Use this title" />
    </SuggestionFrame>
  );
}

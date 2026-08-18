import { useMutation } from '@tanstack/react-query';
import { LoaderCircle, Wand2 } from 'lucide-react';
import { aiApi } from '../../services/apiClient';
import type { AiTitleSuggestion } from '../../types/ai';
import AISuggestionActions from './AISuggestionActions';

interface Props {
  title: string;
  description: string;
  category?: string;
  attributes?: Record<string, string | number | boolean>;
  onApply: (value: string) => void;
}

export default function AITitleSuggestionPanel({ title, description, category, attributes, onApply }: Props) {
  const run = useMutation({
    mutationFn: async () => (await aiApi.listingTitle({ title, description, category, attributes })).data as AiTitleSuggestion,
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => run.mutate()}
        disabled={run.isPending || (!title.trim() && !description.trim())}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-50 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {run.isPending ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <Wand2 size={13} aria-hidden="true" />} Improve title with AI
      </button>

      <span className="sr-only" role="status" aria-live="polite">{run.isPending ? 'Generating a title suggestion' : run.data ? 'Title suggestion ready' : ''}</span>

      {run.isError && <p role="alert" className="mt-2 text-[11px] font-semibold text-amber-800">The title assistant is unavailable right now. Your listing is unchanged.</p>}

      {run.data?.suggestions?.map((suggestion, index) => (
        <AISuggestionActions
          key={`${suggestion}-${index}`}
          label={index === 0 ? 'Suggested title' : `Alternative ${index}`}
          value={suggestion}
          note={index === 0 ? run.data?.note : undefined}
          onApply={onApply}
        />
      ))}
    </div>
  );
}

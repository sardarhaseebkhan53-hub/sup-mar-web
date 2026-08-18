import { useMutation } from '@tanstack/react-query';
import { HelpCircle, LoaderCircle, Wand2 } from 'lucide-react';
import { aiApi } from '../../services/apiClient';
import type { AiDescriptionSuggestion } from '../../types/ai';
import AISuggestionActions from './AISuggestionActions';

interface Props {
  title: string;
  description: string;
  category?: string;
  condition?: string;
  price?: string;
  city?: string;
  attributes?: Record<string, string | number | boolean>;
  onApply: (value: string) => void;
}

export default function AIDescriptionSuggestionPanel({ title, description, category, condition, price, city, attributes, onApply }: Props) {
  const run = useMutation({
    mutationFn: async () => (await aiApi.listingDescription({
      title,
      description,
      category,
      condition,
      price: price ? Number(price) : undefined,
      location: city ? { city } : undefined,
      attributes,
    })).data as AiDescriptionSuggestion,
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => run.mutate()}
        disabled={run.isPending || (!title.trim() && !description.trim())}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-extrabold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-50 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {run.isPending ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <Wand2 size={13} aria-hidden="true" />} Improve description with AI
      </button>

      <span className="sr-only" role="status" aria-live="polite">{run.isPending ? 'Writing a description draft' : run.data ? 'Description draft ready' : ''}</span>

      {run.isError && <p role="alert" className="mt-2 text-[11px] font-semibold text-amber-800">The description assistant is unavailable right now. Your listing is unchanged.</p>}

      {run.data && (
        <>
          <AISuggestionActions label="Suggested description" value={run.data.suggestion} note={run.data.note} multiline onApply={onApply} />
          {run.data.questions?.length > 0 && (
            <div className="mt-2 rounded-card bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-900"><HelpCircle size={12} aria-hidden="true" /> Add these to make it stronger</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[11px] text-amber-900">
                {run.data.questions.map((question) => <li key={question}>{question}</li>)}
              </ul>
              <p className="mt-2 text-[10px] text-amber-800">QAVLIO will not answer these for you — only you know the real details.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

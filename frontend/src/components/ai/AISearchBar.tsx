import { useMutation } from '@tanstack/react-query';
import { LoaderCircle, Search, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../../services/apiClient';
import type { AiSearchResult } from '../../types/ai';

interface Props {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onResult?: (result: AiSearchResult) => void;
  /** When set, the bar navigates to /search with the extracted params instead of emitting a result. */
  navigateOnResult?: boolean;
}

const EXAMPLES = [
  'cheap iPhone in Lahore under 150000',
  'automatic Corolla 2018 or newer',
  'gaming laptop with 16GB RAM near Islamabad',
];

/**
 * Natural-language search entry point. The typed query is never rewritten —
 * the extracted intent is returned for the user to review.
 */
export default function AISearchBar({ initialQuery = '', placeholder = 'Describe what you are looking for…', autoFocus, onResult, navigateOnResult }: Props) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialQuery);
  const inputId = useId();
  const hintId = useId();
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => setValue(initialQuery), [initialQuery]);

  const run = useMutation({
    mutationFn: async (query: string) => {
      // Request de-duplication: a new search supersedes the one in flight.
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      const response = await aiApi.search(query);
      return response.data as AiSearchResult;
    },
    onSuccess: (data) => {
      onResult?.(data);
      if (navigateOnResult) {
        const params = new URLSearchParams({ q: value.trim(), ...(data.searchParams || {}) });
        navigate(`/search?${params.toString()}`);
      }
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (query.length < 2) return;
    run.mutate(query);
  };

  return (
    <form onSubmit={submit} role="search" className="w-full">
      <label htmlFor={inputId} className="sr-only">Search QAVLIO listings using everyday language</label>
      <div className="flex items-center gap-2 rounded-control border border-violet-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-200">
        <Sparkles size={16} className="shrink-0 text-violet-600" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          maxLength={200}
          aria-describedby={hintId}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={run.isPending || value.trim().length < 2}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-violet-600 px-4 text-xs font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          {run.isPending ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Search size={14} aria-hidden="true" />}
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      <p id={hintId} className="mt-1.5 text-[11px] text-slate-500">
        Try: {EXAMPLES.map((example, index) => (
          <span key={example}>
            {index > 0 && ' · '}
            <button type="button" onClick={() => { setValue(example); run.mutate(example); }} className="font-semibold text-violet-700 underline decoration-violet-200 underline-offset-2 hover:text-violet-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              {example}
            </button>
          </span>
        ))}
      </p>

      <span className="sr-only" role="status" aria-live="polite">
        {run.isPending ? 'Searching QAVLIO listings' : run.isError ? 'Search is unavailable, use normal search instead' : run.data ? `${run.data.total} listings found` : ''}
      </span>

      {run.isError && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-amber-800">
          QAVLIO AI is temporarily unavailable.{' '}
          <button type="button" onClick={() => navigate(`/search?q=${encodeURIComponent(value.trim())}`)} className="underline underline-offset-2">Continue with normal search</button>
        </p>
      )}
    </form>
  );
}

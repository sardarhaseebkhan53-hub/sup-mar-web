import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * AISearchBar (§53) — one bar, two modes. Natural-language search is opt-in via the
 * spark toggle; the classic keyword search stays the default and always works.
 */
export default function AISearchBar({ initialQuery = '', compact = false, autoFocus = false }: { initialQuery?: string; compact?: boolean; autoFocus?: boolean }) {
  const [value, setValue] = useState(initialQuery);
  const [aiMode, setAiMode] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(initialQuery); }, [initialQuery]);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const query = value.trim();
    if (!query) return;
    const params = new URLSearchParams({ q: query });
    if (aiMode) params.set('ai', '1');
    navigate(`/search?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} role="search" aria-label={aiMode ? 'Natural language marketplace search' : 'Search QAVLIO listings'} className="w-full">
      <div className={`flex items-center gap-2 rounded-card border bg-white shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 ${compact ? 'p-1.5' : 'p-2'}`}>
        <button
          type="button"
          onClick={() => setAiMode((current) => !current)}
          aria-pressed={aiMode}
          aria-label={aiMode ? 'AI natural language search is on. Switch to normal keyword search.' : 'Turn on AI natural language search'}
          title={aiMode ? 'AI search on — describe what you need in plain words' : 'Normal keyword search'}
          className={`grid ${compact ? 'h-8 w-8' : 'h-10 w-10'} shrink-0 place-items-center rounded-control transition ${aiMode ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}
        >
          <Sparkles size={16} aria-hidden="true" />
        </button>
        <label htmlFor="qavlio-ai-search" className="sr-only">{aiMode ? 'Describe what you are looking for' : 'Search listings'}</label>
        <input
          id="qavlio-ai-search"
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={aiMode ? 'Search anything, e.g. used iPhone under Rs. 150k in Islamabad' : 'Search cars, mobiles, furniture…'}
          className={`min-w-0 flex-1 bg-transparent ${compact ? 'py-1.5 text-sm' : 'py-2 text-sm sm:text-base'} font-semibold outline-none`}
          maxLength={200}
        />
        <button type="submit" className={`${compact ? 'h-8 px-3 text-[11px]' : 'h-10 px-4 text-xs'} shrink-0 rounded-control bg-ink-950 font-extrabold text-white`} disabled={!value.trim()}>
          {aiMode ? 'Ask AI' : 'Search'}
        </button>
      </div>
      {aiMode && <p className="mt-1.5 px-1 text-[11px] font-semibold text-violet-700">AI search reads your words and applies QAVLIO filters you can adjust — normal search stays one tap away.</p>}
    </form>
  );
}

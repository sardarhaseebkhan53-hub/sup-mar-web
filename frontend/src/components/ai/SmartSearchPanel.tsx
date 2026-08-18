import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { aiApi } from '../../services/apiClient';
import type { AiAppliedFilter, AiSearchResult } from '../../types/ai';
import AISearchExplanation from './AISearchExplanation';
import AISearchFilters from './AISearchFilters';

/**
 * Drop-in smart-search block for the search/category results page.
 * Understands the query, shows what it extracted, and lets the user undo
 * anything the AI applied. The user's typed query is never rewritten for them.
 */
export default function SmartSearchPanel({ query }: { query?: string }) {
  const [params, setParams] = useSearchParams();
  const enabled = Boolean(query && query.trim().length > 2);

  const result = useQuery({
    queryKey: ['ai-search-interpret', query],
    enabled,
    staleTime: 30_000,
    queryFn: async () => (await aiApi.search(query!)).data as AiSearchResult,
  });

  if (!enabled || result.isError) return null;
  const data = result.data;

  const patchParams = (patch: Record<string, string>) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(patch).forEach(([key, value]) => next.set(key, value));
      next.delete('page');
      return next;
    });
  };

  const removeFilter = (filter: AiAppliedFilter) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(filter.key);
      next.delete('page');
      return next;
    });
  };

  const clearAll = () => {
    setParams(() => {
      const next = new URLSearchParams();
      const q = params.get('q');
      if (q) next.set('q', q);
      return next;
    });
  };

  // Only surface filters that are actually reflected in the URL, so "remove" is truthful.
  const activeFilters = (data?.appliedFilters || []).filter((filter) => params.get(filter.key) !== null || filter.removable !== false);

  return (
    <div className="mb-4 space-y-3">
      <AISearchExplanation
        loading={result.isLoading}
        total={data?.total}
        empty={data?.empty}
        explanation={data?.explanation}
        interpreted={data?.interpreted}
        semanticApplied={data?.semanticApplied}
        relaxedFilters={data?.relaxedFilters}
        correction={data?.correction}
        recovery={data?.recovery}
        onAcceptCorrection={(suggestion) => patchParams({ q: suggestion })}
        onRecoveryAction={patchParams}
      />
      {!result.isLoading && (
        <AISearchFilters
          filters={activeFilters}
          suggestions={data?.suggestions}
          onRemove={removeFilter}
          onApplySuggestion={patchParams}
          onClearAll={clearAll}
        />
      )}
    </div>
  );
}

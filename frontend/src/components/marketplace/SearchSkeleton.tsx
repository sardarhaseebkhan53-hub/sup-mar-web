export default function SearchSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Loading results" aria-busy="true">
    {Array.from({ length: 8 }, (_, index) => <div key={index} className="overflow-hidden rounded-card border border-slate-200 bg-white"><div className="aspect-[4/3] animate-pulse bg-slate-200" /><div className="space-y-3 p-4"><div className="h-3 w-1/4 animate-pulse rounded bg-slate-200" /><div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" /><div className="h-5 w-2/5 animate-pulse rounded bg-slate-200" /><div className="h-3 w-3/5 animate-pulse rounded bg-slate-200" /></div></div>)}
  </div>;
}

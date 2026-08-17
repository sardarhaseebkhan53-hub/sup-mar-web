import { cn } from '../../utils/cn';

interface SkeletonProps { className?: string; }
export default function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-card bg-slate-200', className)} />;
}

export function ListingCardSkeleton() {
  return <div className="overflow-hidden rounded-card border border-ink-900/10 bg-white"><Skeleton className="aspect-[4/3] rounded-none" /><div className="space-y-3 p-4"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-8 w-full" /></div></div>;
}

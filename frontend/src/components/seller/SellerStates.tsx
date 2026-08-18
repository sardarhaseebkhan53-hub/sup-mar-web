import { Inbox, PackageOpen, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

/** Honest empty + error states for Seller Center (§69). */
export function SellerEmptyState({ icon: Icon = PackageOpen, title, description, action }: { icon?: typeof PackageOpen; title: string; description?: string; action?: ReactNode }) {
  return <div className="rounded-panel border border-dashed bg-white px-5 py-14 text-center">
    <Icon className="mx-auto text-violet-400" size={36} aria-hidden="true" />
    <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
    {description && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>;
}

export function SellerErrorState({ retry }: { retry?: () => void }) {
  return <div role="alert" className="rounded-panel border border-rose-200 bg-rose-50 px-5 py-10 text-center">
    <SearchX className="mx-auto text-rose-500" size={32} aria-hidden="true" />
    <h2 className="mt-3 text-base font-extrabold text-rose-900">This part of Seller Center could not load</h2>
    <p className="mt-2 text-xs font-semibold text-rose-800">Your data is safe. Retry, or reopen the page in a moment.</p>
    {retry && <button type="button" onClick={retry} className="mt-4 h-10 rounded-control bg-rose-600 px-4 text-xs font-extrabold text-white">Try again</button>}
  </div>;
}

export function SellerLoadingState({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-2" aria-busy="true" role="status" aria-label="Loading seller data">
    {Array.from({ length: rows }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-card bg-slate-200" />)}
  </div>;
}

export function SellerInboxZero() {
  return <p className="flex items-center gap-2 rounded-card bg-slate-50 p-4 text-xs font-bold text-slate-500"><Inbox size={15} aria-hidden="true" /> Nothing here yet — activity will appear as your business grows.</p>;
}

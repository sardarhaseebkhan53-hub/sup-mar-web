import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
    <button type="button" className="tap-target grid place-items-center rounded-control border border-ink-900/10 bg-white disabled:opacity-40" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={17} /></button>
    <span className="px-3 text-xs font-bold text-slate-600">Page {page} of {totalPages}</span>
    <button type="button" className="tap-target grid place-items-center rounded-control border border-ink-900/10 bg-white disabled:opacity-40" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page"><ChevronRight size={17} /></button>
  </nav>;
}

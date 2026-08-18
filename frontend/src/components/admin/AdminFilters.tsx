import type { ReactNode } from 'react';
export default function AdminFilters({children}:{children:ReactNode}){return <section className="flex flex-wrap gap-2 rounded-card border bg-white p-3" aria-label="Table filters">{children}</section>}

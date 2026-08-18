import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

/** SellerQuickActions (§58) — one-tap shortcuts from the seller dashboard. */
export default function SellerQuickActions({ actions }: { actions: Array<{ icon: LucideIcon; label: string; to: string }> }) {
  return <section aria-label="Quick actions">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {actions.map(({ icon: Icon, label, to }) => (
        <Link key={label} to={to} className="flex items-center gap-3 rounded-card border bg-white p-4 text-xs font-extrabold transition hover:border-violet-300 hover:shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600" aria-hidden="true"><Icon size={17} /></span>
          <span className="min-w-0 leading-4">{label}</span>
        </Link>
      ))}
    </div>
  </section>;
}

import { MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export type Customer = {
  buyerId: string;
  name: string;
  conversationCount: number;
  listingsContacted: string[];
  unreadMessages: number;
  lastInteraction: string | null;
  conversationId: string | null;
  leadStatus: string | null;
};

/** CustomerCard (§22–23, §69) — public interaction data only, never private account details. */
export default function CustomerCard({ customer, onOpen }: { customer: Customer; onOpen?: (customer: Customer) => void }) {
  return <article className="rounded-card border bg-white p-4 shadow-sm" aria-label={`Customer ${customer.name}`}>
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-extrabold text-violet-700" aria-hidden="true">{customer.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{customer.name}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
          {customer.conversationCount} conversation{customer.conversationCount === 1 ? '' : 's'}
          {customer.lastInteraction && ` · last ${new Date(customer.lastInteraction).toLocaleDateString()}`}
        </p>
      </div>
      {customer.leadStatus && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[8px] font-extrabold uppercase text-violet-700">{customer.leadStatus}</span>}
    </div>
    {customer.listingsContacted.length > 0 && <p className="mt-3 line-clamp-2 text-[11px] font-semibold text-slate-600">Asked about: {customer.listingsContacted.join(' · ')}</p>}
    <div className="mt-3 flex items-center gap-2 border-t pt-3">
      <button type="button" onClick={() => onOpen?.(customer)} className="h-8 rounded-control border px-3 text-[10px] font-extrabold text-ink-800">View profile</button>
      {customer.conversationId && <Link to="/messages" className="inline-flex h-8 items-center gap-1 rounded-control bg-violet-600 px-3 text-[10px] font-extrabold text-white"><MessageCircle size={11} aria-hidden="true" /> Message</Link>}
      {customer.unreadMessages > 0 && <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold text-rose-600">{customer.unreadMessages} unread</span>}
    </div>
    <p className="mt-2 flex items-center gap-1 text-[8px] font-semibold text-slate-400"><ShieldCheck size={10} aria-hidden="true" /> Seller view shows interaction history only — never private account data.</p>
  </article>;
}

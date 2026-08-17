import { BarChart3, Check, Megaphone, Plus, UsersRound } from 'lucide-react';
import { Button } from '../ui/Button';

const benefits = [
  { icon: Check, text: 'Easy listing' }, { icon: UsersRound, text: 'Reach buyers' }, { icon: Megaphone, text: 'Promote your listing' }, { icon: BarChart3, text: 'Manage everything in one dashboard' },
];

export default function SellerCallout() {
  return <section className="container-shell pb-12 sm:pb-16"><div className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14">
    <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[36px] border-violet-500/15" aria-hidden="true" />
    <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="eyebrow !text-gold-300">Sell on QAVLIO</p><h2 className="mt-3 text-h2 text-white">Have something to sell?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Turn unused things into value. Create your first QAVLIO listing in minutes.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{benefits.map(({ icon: Icon, text }) => <span key={text} className="flex items-center gap-2 text-xs font-bold text-white/75"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-gold-300"><Icon size={14} /></span>{text}</span>)}</div></div><Button to="/sell" variant="gold" size="lg" className="w-full lg:w-auto"><Plus size={18} /> Start Selling</Button></div>
  </div></section>;
}

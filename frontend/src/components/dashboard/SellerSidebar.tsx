import { BarChart3, CircleHelp, CreditCard, LayoutDashboard, ListChecks, LogOut, MessageCircle, Plus, Settings, ShieldCheck, Star, Tag, UserRound } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import Logo from '../ui/Logo';

export const sellerNavigation = [
  { label: 'Overview', icon: LayoutDashboard, to: '/seller', end: true }, { label: 'My Listings', icon: ListChecks, to: '/seller/listings' },
  { label: 'Add Listing', icon: Plus, to: '/sell' }, { label: 'Messages', icon: MessageCircle, to: '/messages' }, { label: 'Promotions', icon: Tag, to: '/seller/promotions' },
  { label: 'Analytics', icon: BarChart3, to: '/seller/analytics' }, { label: 'Reviews', icon: Star, to: '/seller/reviews' }, { label: 'Payments', icon: CreditCard, to: '/seller/payments' },
  { label: 'Profile', icon: UserRound, to: '/seller/profile' }, { label: 'Verification', icon: ShieldCheck, to: '/account/verification' }, { label: 'Settings', icon: Settings, to: '/seller/settings' },
];
export default function SellerSidebar({ logout }: { logout: () => Promise<void> }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink-950 px-4 py-6 text-white lg:flex"><Logo inverse /><div className="mt-7 rounded-xl border border-white/10 bg-white/[.06] p-3"><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-gold-300">Workspace</p><p className="mt-1 text-sm font-extrabold">Seller centre</p></div><nav className="hide-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto" aria-label="Seller centre navigation">{sellerNavigation.map(({ label, icon: Icon, to, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition ${isActive ? 'bg-violet-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Icon size={16} />{label}</NavLink>)}</nav><div className="space-y-1 border-t border-white/10 pt-3"><Link to="/help" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><CircleHelp size={17} /> Help & support</Link><button type="button" onClick={() => { void logout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><LogOut size={17} /> Log out</button></div></aside>;
}

import { ArrowLeft, BarChart3, Bell, CircleHelp, CreditCard, FileText, Heart, LayoutDashboard, ListChecks, LogOut, MessageCircle, Plus, Search, Settings, ShieldCheck, Star, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import SellerSidebar, { sellerNavigation } from '../components/dashboard/SellerSidebar';
import Logo from '../components/ui/Logo';

type DashboardRole = 'customer' | 'seller' | 'admin';
interface NavItem { label: string; icon: LucideIcon; to: string; end?: boolean; }
const navigation: Record<'customer' | 'admin', NavItem[]> = {
  customer: [
    { label: 'Overview', icon: LayoutDashboard, to: '/account', end: true }, { label: 'Profile', icon: UserRound, to: '/account/profile' }, { label: 'Favorites', icon: Heart, to: '/saved' },
    { label: 'Saved Searches', icon: Search, to: '/dashboard/saved-searches' }, { label: 'Messages', icon: MessageCircle, to: '/messages' }, { label: 'Notifications', icon: Bell, to: '/account/notifications' },
    { label: 'Recently Viewed', icon: FileText, to: '/dashboard/recent' }, { label: 'Reviews', icon: Star, to: '/dashboard/reviews' }, { label: 'Security', icon: ShieldCheck, to: '/account/security' }, { label: 'Settings', icon: Settings, to: '/account/settings' },
  ],
  admin: [
    { label: 'Overview', icon: LayoutDashboard, to: '/admin', end: true }, { label: 'Users', icon: UsersRound, to: '/admin/users' }, { label: 'Listings', icon: ListChecks, to: '/admin/listings' },
    { label: 'Moderation', icon: ShieldCheck, to: '/admin/moderation' }, { label: 'Revenue', icon: CreditCard, to: '/admin/revenue' }, { label: 'Analytics', icon: BarChart3, to: '/admin/analytics' }, { label: 'System settings', icon: Settings, to: '/admin/settings' },
  ],
};
const roleLabels = { customer: 'Customer space', seller: 'Seller centre', admin: 'Admin console' };

function StandardSidebar({ role, items, logout }: { role: 'customer' | 'admin'; items: NavItem[]; logout: () => Promise<void> }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink-950 px-4 py-6 text-white lg:flex"><Logo inverse /><div className="mt-7 rounded-xl border border-white/10 bg-white/[.06] p-3"><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-gold-300">Workspace</p><p className="mt-1 text-sm font-extrabold">{roleLabels[role]}</p></div><nav className="hide-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto" aria-label={`${roleLabels[role]} navigation`}>{items.map(({ label, icon: Icon, to, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition ${isActive ? 'bg-violet-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Icon size={16} />{label}</NavLink>)}</nav><div className="space-y-1 border-t border-white/10 pt-3"><Link to="/help" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><CircleHelp size={17} /> Help & support</Link><button type="button" onClick={() => { void logout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><LogOut size={17} /> Log out</button></div></aside>;
}

export default function DashboardLayout({ role = 'customer', children }: { role?: DashboardRole; children: ReactNode }) {
  const { user, logout } = useAuth(); const items = role === 'seller' ? sellerNavigation : navigation[role]; const initials = user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'QV';
  return <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[248px_1fr]">{role === 'seller' ? <SellerSidebar logout={logout} /> : <StandardSidebar role={role} items={items} logout={logout} />}<div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-20 border-b border-ink-900/10 bg-white/95 backdrop-blur-lg"><div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8"><Logo compact className="lg:hidden" /><Link to="/" className="hidden items-center gap-1 text-xs font-bold text-slate-500 hover:text-violet-700 lg:inline-flex"><ArrowLeft size={15} /> Marketplace</Link><div className="ml-auto flex items-center gap-2"><Link to="/account/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Notifications"><Bell size={18} /></Link>{role === 'seller' && <Link to="/sell" className="hidden h-10 items-center gap-2 rounded-xl bg-gold-300 px-4 text-xs font-extrabold text-ink-950 sm:inline-flex"><Plus size={16} /> New listing</Link>}<Link to={role === 'seller' ? '/seller/profile' : '/account/profile'} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-slate-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-[10px] font-extrabold text-violet-700">{initials}</span><span className="hidden text-left sm:block"><strong className="block max-w-28 truncate text-[11px]">{user?.name}</strong><small className="block text-[9px] font-semibold capitalize text-slate-400">{role}</small></span></Link></div></div><nav className="hide-scrollbar flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden" aria-label="Dashboard sections">{items.map(({ label, icon: Icon, to, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold ${isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-500'}`}><Icon size={14} />{label}</NavLink>)}</nav></header><main className="p-4 pb-12 sm:p-6 lg:p-8">{children}</main></div></div>;
}

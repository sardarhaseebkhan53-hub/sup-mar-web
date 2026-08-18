import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, BarChart3, Bell, CircleHelp, CreditCard, FileText, Flag, FolderTree, Heart, LayoutDashboard, ListChecks, LogOut, Menu, MessageCircle, Megaphone, Plus, Search, Settings, ShieldCheck, Star, Store, UserRound, UsersRound, X, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import AiAssistant from '../components/home/AiAssistant';
import SellerSidebar, { sellerGroups, sellerNavigation } from '../components/dashboard/SellerSidebar';
import SellerGlobalSearch from '../components/seller/SellerGlobalSearch';
import Logo from '../components/ui/Logo';
import AdminLayout from './AdminLayout';

type DashboardRole = 'customer' | 'seller' | 'admin';
interface NavItem { label: string; icon: LucideIcon; to: string; end?: boolean; }
const navigation: Record<'customer' | 'admin', NavItem[]> = {
  customer: [
    { label: 'Overview', icon: LayoutDashboard, to: '/account', end: true }, { label: 'Profile', icon: UserRound, to: '/account/profile' }, { label: 'Favorites', icon: Heart, to: '/saved' },
    { label: 'Saved Searches', icon: Search, to: '/dashboard/saved-searches' }, { label: 'Following', icon: Store, to: '/following' }, { label: 'Messages', icon: MessageCircle, to: '/messages' }, { label: 'Notifications', icon: Bell, to: '/account/notifications' },
    { label: 'Recently Viewed', icon: FileText, to: '/dashboard/recent' }, { label: 'Reviews', icon: Star, to: '/dashboard/reviews' }, { label: 'Reports', icon: Flag, to: '/dashboard/reports' }, { label: 'Appeals', icon: ShieldCheck, to: '/appeals' }, { label: 'Blocked users', icon: UsersRound, to: '/settings/blocked-users' }, { label: 'Security', icon: ShieldCheck, to: '/account/security' }, { label: 'Settings', icon: Settings, to: '/account/settings' },
  ],
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/admin', end: true }, { label: 'Users', icon: UsersRound, to: '/admin/users' }, { label: 'Sellers', icon: Store, to: '/admin/sellers' }, { label: 'Listings', icon: ListChecks, to: '/admin/listings' }, { label: 'Categories', icon: FolderTree, to: '/admin/categories' }, { label: 'Reports', icon: Flag, to: '/admin/reports' },
    { label: 'Moderation', icon: ShieldCheck, to: '/admin/moderation' }, { label: 'Reviews', icon: Star, to: '/admin/reviews' }, { label: 'Risk', icon: Flag, to: '/admin/risk' }, { label: 'Payments', icon: CreditCard, to: '/admin/payments' }, { label: 'Revenue', icon: BarChart3, to: '/admin/revenue' }, { label: 'Promotions', icon: Megaphone, to: '/admin/promotions' }, { label: 'Advertisements', icon: Megaphone, to: '/admin/advertisements' }, { label: 'Analytics', icon: BarChart3, to: '/admin/analytics' }, { label: 'Monetization', icon: CreditCard, to: '/admin/settings/monetization' }, { label: 'Settings', icon: Settings, to: '/admin/settings' }, { label: 'AI settings', icon: Search, to: '/admin/settings/ai' }, { label: 'Admin activity', icon: Activity, to: '/admin/activity' },
  ],
};
const roleLabels = { customer: 'Customer space', seller: 'Seller centre', admin: 'Admin console' };

function StandardSidebar({ role, items, logout }: { role: 'customer' | 'admin'; items: NavItem[]; logout: () => Promise<void> }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink-950 px-4 py-6 text-white lg:flex"><Logo inverse /><div className="mt-7 rounded-xl border border-white/10 bg-white/[.06] p-3"><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-gold-300">Workspace</p><p className="mt-1 text-sm font-extrabold">{roleLabels[role]}</p></div><nav className="hide-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto" aria-label={`${roleLabels[role]} navigation`}>{items.map(({ label, icon: Icon, to, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition ${isActive ? 'bg-violet-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Icon size={16} />{label}</NavLink>)}</nav><div className="space-y-1 border-t border-white/10 pt-3"><Link to="/help" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><CircleHelp size={17} /> Help & support</Link><button type="button" onClick={() => { void logout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><LogOut size={17} /> Log out</button></div></aside>;
}

export default function DashboardLayout({ role = 'customer', children }: { role?: DashboardRole; children: ReactNode }) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  if (role === 'admin') return <AdminLayout>{children}</AdminLayout>;
  const items = role === 'seller' ? sellerNavigation : navigation[role]; const initials = user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'QV';
  return <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[248px_1fr]">{role === 'seller' ? <SellerSidebar logout={logout} /> : <StandardSidebar role={role} items={items} logout={logout} />}<div className="min-w-0 lg:col-start-2"><header className="sticky top-0 z-20 border-b border-ink-900/10 bg-white/95 backdrop-blur-lg"><div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:h-[72px] lg:px-8">
    {role === 'seller' && <button type="button" onClick={() => setDrawerOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden" aria-label="Open seller menu" aria-expanded={drawerOpen}><Menu size={18} /></button>}
    <Logo compact className="lg:hidden" />
    <Link to="/" className="hidden items-center gap-1 text-xs font-bold text-slate-500 hover:text-violet-700 lg:inline-flex"><ArrowLeft size={15} /> Marketplace</Link>
    {role === 'seller' && <div className="mx-4 hidden min-w-0 flex-1 md:block"><SellerGlobalSearch /></div>}
    <div className="ml-auto flex items-center gap-2"><Link to={role === 'seller' ? '/seller/notifications' : '/notifications'} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Notifications"><Bell size={18} /></Link>{role === 'seller' && <Link to="/messages" className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:inline-flex" aria-label="Messages"><MessageCircle size={16} /></Link>}{role === 'seller' && <Link to="/seller/listings/new" className="hidden h-10 items-center gap-2 rounded-xl bg-gold-300 px-4 text-xs font-extrabold text-ink-950 sm:inline-flex"><Plus size={16} /> New listing</Link>}<Link to={role === 'seller' ? '/seller/profile' : '/account/profile'} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-slate-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-[10px] font-extrabold text-violet-700">{initials}</span><span className="hidden text-left sm:block"><strong className="block max-w-28 truncate text-[11px]">{user?.name}</strong><small className="block text-[9px] font-semibold capitalize text-slate-400">{role === 'seller' ? 'Seller' : role}</small></span></Link></div></div>
    {role !== 'seller' && <nav className="hide-scrollbar flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden" aria-label="Dashboard sections">{items.map(({ label, icon: Icon, to, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold ${isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-500'}`}><Icon size={14} />{label}</NavLink>)}</nav>}
  </header><main className="p-4 pb-12 sm:p-6 lg:p-8">{children}</main></div>
  {role === 'seller' && <AnimatePresence>
    {drawerOpen && <>
      <motion.div className="fixed inset-0 z-[60] bg-ink-950/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      <motion.nav className="fixed inset-y-0 left-0 z-[65] flex w-[280px] flex-col overflow-y-auto bg-ink-950 px-4 py-6 text-white lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ duration: 0.2 }} aria-label="Seller center navigation">
        <div className="flex items-center justify-between"><Logo inverse /><button type="button" onClick={() => setDrawerOpen(false)} className="grid h-9 w-9 place-items-center rounded-control text-white/70 hover:bg-white/10" aria-label="Close seller menu"><X size={18} /></button></div>
        <div className="mt-5 space-y-4">
          {sellerGroups.map((group) => <div key={group.title}>
            <p className="px-3 pb-1 text-[9px] font-extrabold uppercase tracking-[.18em] text-white/35">{group.title}</p>
            <div className="space-y-1">{group.items.map(({ label, icon: Icon, to, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setDrawerOpen(false)} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition ${isActive ? 'bg-violet-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Icon size={16} aria-hidden="true" />{label}</NavLink>
            ))}</div>
          </div>)}
        </div>
      </motion.nav>
    </>}
  </AnimatePresence>}
  <AiAssistant /></div>;
}

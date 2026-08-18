import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, ChevronRight, Globe2, LogOut, Menu, MessageCircle, Plus, Search, UserRound, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/Button';
import Logo from '../ui/Logo';
import SearchBar from './SearchBar';
import NotificationBell from '../notifications/NotificationBell';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

interface HeaderUser {
  name?: string;
  username?: string;
  roles?: string[];
}

const publicLinks = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/categories', label: 'Categories' },
  { to: '/safety', label: 'Safety' },
  { to: '/help', label: 'Help centre' },
  { to: '/ai-assistant', label: 'Ask QAVLIO' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const auth = useAuth() as { user: HeaderUser | null; logout: () => Promise<void> };
  const { locale, setLocale, t } = useTranslation() as { locale: string; setLocale: (value: string) => void; t: (key: string) => string };
  const user = auth.user;
  const unreadMessages = useUnreadMessages();
  const dashboard = user?.roles?.some((role: string) => ['admin', 'super_admin'].includes(role)) ? '/admin' : user?.roles?.includes('seller') ? '/seller' : '/dashboard';
  const focusMobileSearch = () => mobileSearchRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();

  return <header className="sticky top-0 z-50 border-b border-ink-900/10 bg-white/95 backdrop-blur-xl">
    <div className="container-shell">
      <div className="flex h-[66px] items-center gap-3 lg:h-[76px] lg:gap-4">
        <Logo compact className="[&>span]:hidden lg:[&>span]:block" />
        <Link to="/categories" className="hidden h-10 items-center gap-1.5 rounded-control px-3 text-xs font-extrabold text-ink-800 transition hover:bg-violet-50 hover:text-violet-700 lg:inline-flex">Categories <ChevronRight size={14} /></Link>
        <div className="hidden min-w-[280px] flex-1 lg:block"><SearchBar /></div>

        <nav className="ml-auto hidden items-center gap-0.5 xl:flex" aria-label="Account navigation">
          <button type="button" onClick={() => setLocale(locale === 'en' ? 'ur' : 'en')} className="tap-target inline-flex items-center justify-center gap-1.5 rounded-control px-2 text-xs font-bold text-ink-800 hover:bg-slate-100" aria-label="Change language"><Globe2 size={17} /> <span className="hidden 2xl:inline">{locale === 'en' ? 'اردو' : 'English'}</span></button>
          <Link to="/messages" className="tap-target relative grid place-items-center rounded-control text-ink-800 hover:bg-slate-100" aria-label={`Messages${unreadMessages?`, ${unreadMessages} unread`:''}`}><MessageCircle size={19} />{unreadMessages>0&&<span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[8px] font-extrabold text-white">{unreadMessages>9?'9+':unreadMessages}</span>}</Link>
          <NotificationBell />
          {user ? <><Link to={dashboard} className="inline-flex h-10 items-center gap-2 rounded-control px-2.5 text-xs font-bold text-ink-800 hover:bg-slate-100"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-[9px] font-extrabold text-violet-700">{user.name?.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="hidden 2xl:inline">{user.name?.split(' ')[0]}</span></Link><button type="button" onClick={() => auth.logout()} className="tap-target grid place-items-center rounded-control text-slate-500 hover:bg-slate-100" aria-label={t('common.logOut')}><LogOut size={17} /></button></> : <Link to="/login" className="inline-flex h-10 items-center gap-1.5 rounded-control px-3 text-xs font-extrabold text-ink-800 hover:bg-slate-100"><UserRound size={17} /> Login</Link>}
          <Button to="/sell" variant="gold" size="sm" className="ml-1"><Plus size={16} /> Sell</Button>
        </nav>

        <div className="ml-auto flex items-center gap-1 xl:hidden">
          <button type="button" onClick={focusMobileSearch} className="tap-target grid place-items-center rounded-control text-ink-900 hover:bg-slate-100 lg:hidden" aria-label="Focus search"><Search size={21} /></button>
          <Link to="/notifications" className="tap-target hidden place-items-center rounded-control text-ink-900 hover:bg-slate-100 lg:grid" aria-label="Notifications"><Bell size={19} /></Link>
          <Button to="/sell" variant="gold" size="sm" className="hidden lg:inline-flex"><Plus size={16} /> Sell</Button>
          <button type="button" onClick={() => setMenuOpen(true)} className="tap-target grid place-items-center rounded-control text-ink-900 hover:bg-slate-100" aria-label="Open navigation menu" aria-expanded={menuOpen}><Menu size={23} /></button>
        </div>
      </div>
      <div ref={mobileSearchRef} className="pb-3 lg:hidden"><SearchBar compact /></div>
    </div>

    <AnimatePresence>
      {menuOpen && <>
        <motion.button type="button" className="fixed inset-0 z-50 bg-ink-950/45 backdrop-blur-sm xl:hidden" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.aside className="fixed inset-y-0 right-0 z-50 w-[min(88vw,370px)] overflow-y-auto bg-white p-5 shadow-floating xl:hidden" aria-label="Mobile menu" initial={reduceMotion ? false : { x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          <div className="flex items-center justify-between"><Logo /><button type="button" onClick={() => setMenuOpen(false)} className="tap-target grid place-items-center rounded-control hover:bg-slate-100" aria-label="Close navigation menu"><X size={21} /></button></div>
          <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-400">Explore</p>
          <nav className="mt-3 space-y-1" aria-label="Mobile primary navigation">{publicLinks.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center justify-between rounded-control px-3 text-sm font-bold ${isActive ? 'bg-violet-50 text-violet-700' : 'text-ink-800 hover:bg-slate-50'}`}>{link.label}<ChevronRight size={15} /></NavLink>)}</nav>
          <div className="mt-7 rounded-card bg-ink-950 p-4 text-white"><p className="text-xs font-extrabold text-gold-300">Have something to sell?</p><p className="mt-1 text-[11px] leading-5 text-white/60">Create a QAVLIO listing in minutes.</p><Button to="/sell" onClick={() => setMenuOpen(false)} variant="gold" size="sm" className="mt-4 w-full"><Plus size={16} /> Start selling</Button></div>
          {user ? <div className="mt-5 space-y-2"><Button to={dashboard} onClick={() => setMenuOpen(false)} variant="secondary" className="w-full"><UserRound size={16} /> My account</Button><Button type="button" onClick={() => { void auth.logout(); setMenuOpen(false); }} variant="ghost" className="w-full"><LogOut size={16} /> Log out</Button></div> : <div className="mt-5 grid grid-cols-2 gap-2"><Button to="/login" onClick={() => setMenuOpen(false)} variant="secondary">Login</Button><Button to="/register" onClick={() => setMenuOpen(false)}>Register</Button></div>}
        </motion.aside>
      </>}
    </AnimatePresence>
  </header>;
}

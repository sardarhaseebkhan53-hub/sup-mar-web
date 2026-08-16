import React from 'react';
import { Home, LayoutGrid, MessageCircle, Plus, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/browse', label: 'Browse', icon: LayoutGrid },
  { to: '/sell', label: 'Sell', icon: Plus, primary: true },
  { to: '/messages', label: 'Chats', icon: MessageCircle },
  { to: '/dashboard', label: 'Profile', icon: UserRound },
];

export default function MobileNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/10 bg-white/95 px-2 pt-2 backdrop-blur-lg lg:hidden" aria-label="Mobile navigation">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {navItems.map(({ to, label, icon: Icon, end, primary }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `group flex min-w-0 flex-col items-center gap-1 text-[9px] font-bold ${isActive ? 'text-violet-700' : 'text-slate-500'}`}>
            <span className={`grid h-8 w-10 place-items-center rounded-xl transition ${primary ? '-mt-5 h-12 w-12 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-4 ring-white' : 'group-hover:bg-violet-50'} `}><Icon size={primary ? 22 : 19} /></span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

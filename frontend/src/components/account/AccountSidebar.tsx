import { Bell, ChevronRight, Globe2, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { AuthUser } from '../../types/auth';
import { Avatar } from '../ui/Avatar';

const links = [
  { to: '/account/profile', label: 'Profile', icon: UserRound }, { to: '/account/verification', label: 'Trust & verification', icon: ShieldCheck },
  { to: '/account/security', label: 'Security & sessions', icon: KeyRound }, { to: '/account/notifications', label: 'Notifications', icon: Bell }, { to: '/account/settings', label: 'Preferences', icon: Globe2 },
];
export default function AccountSidebar({ user }: { user: AuthUser }) {
  return <aside><section className="rounded-2xl bg-ink-950 p-4 text-white"><div className="flex items-center gap-3"><Avatar name={user.name} src={user.avatar} /><div className="min-w-0"><p className="truncate text-xs font-extrabold">{user.name}</p><p className="mt-1 truncate text-[9px] font-semibold text-white/45">@{user.username}</p></div></div></section><nav className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1" aria-label="Account settings">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold ${isActive ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}><Icon size={16} />{label}<ChevronRight size={13} className="ml-auto hidden lg:block" /></NavLink>)}</nav></aside>;
}

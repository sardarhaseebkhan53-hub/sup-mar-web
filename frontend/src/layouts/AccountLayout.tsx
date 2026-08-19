import { LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import AccountSidebar from '../components/account/AccountSidebar';
import Logo from '../components/ui/Logo';

export default function AccountLayout() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const account = user!;
  const signOut = async () => { await logout(); navigate('/', { replace: true }); };
  return <div className="min-h-screen bg-surface"><header className="border-b border-ink-900/10 bg-white"><div className="container-shell flex h-[72px] items-center gap-4"><Logo /><NavLink to="/account" className="ms-auto hidden items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-700 sm:flex"><LayoutDashboard size={16} /> Dashboard</NavLink><button type="button" onClick={() => { void signOut(); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"><LogOut size={16} /><span className="hidden sm:inline">Log out</span></button></div></header><div className="container-shell grid gap-6 py-7 lg:grid-cols-[250px_1fr]"><AccountSidebar user={account} /><main className="min-w-0"><Outlet /></main></div></div>;
}

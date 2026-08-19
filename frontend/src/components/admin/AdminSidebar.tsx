import { Activity, BarChart3, BellRing, Bot, Boxes, CreditCard, FileWarning, FolderTree, Globe, Headphones, KeyRound, LayoutDashboard, ListChecks, Lock, Megaphone, PackageCheck, ReceiptText, Settings, ShieldCheck, Smartphone, Star, Store, UsersRound, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import Logo from '../ui/Logo';
import type { AuthUser } from '../../types/auth';

const items = [
  ['Dashboard', LayoutDashboard, '/admin/dashboard', ['all']],
  ['admin.usersTitle', UsersRound, '/admin/users', ['admin', 'moderator', 'support']],
  ['Sellers', Store, '/admin/sellers', ['admin', 'moderator', 'support']],
  ['Listings', ListChecks, '/admin/listings', ['admin', 'moderator']],
  ['Categories', FolderTree, '/admin/categories', ['admin', 'moderator']],
  ['Orders', Boxes, '/admin/orders', ['admin', 'finance']],
  ['Payments', CreditCard, '/admin/payments', ['admin', 'finance']],
  ['Promotions', Megaphone, '/admin/promotions', ['admin', 'finance']],
  ['Packages', PackageCheck, '/admin/packages', ['admin', 'finance']],
  ['Advertising', Megaphone, '/admin/ads', ['admin']],
  ['Reviews', Star, '/admin/reviews', ['admin', 'moderator']],
  ['Reports', FileWarning, '/admin/reports', ['admin', 'moderator', 'support']],
  ['Trust & Safety', ShieldCheck, '/admin/trust-safety', ['admin', 'moderator']],
  ['Verification', ShieldCheck, '/admin/verification', ['admin', 'moderator']],
  ['Appeals', FileWarning, '/admin/appeals', ['admin', 'moderator']],
  ['admin.auth.title', KeyRound, '/admin/authentication', ['admin']],
  ['OTP Settings', Smartphone, '/admin/settings/otp', ['admin']],
  ['Social Login', Globe, '/admin/settings/social-login', ['admin']],
  ['Security', Lock, '/admin/security', ['admin', 'moderator', 'support', 'finance']],
  ['AI', Bot, '/admin/ai', ['admin']],
  ['Notifications', BellRing, '/admin/notifications', ['admin', 'support']],
  ['Support', Headphones, '/admin/support', ['admin', 'support']],
  ['Analytics', BarChart3, '/admin/analytics', ['admin', 'moderator']],
  ['Revenue', ReceiptText, '/admin/revenue', ['admin', 'finance']],
  ['System Settings', Settings, '/admin/settings', ['admin']],
  ['Logs', Activity, '/admin/audit-logs', ['admin', 'moderator', 'support', 'finance']],
] as const;
function scope(user?: AuthUser | null) {
  if (user?.roles.includes('super_admin')) return 'all';
  if (user?.roles.includes('admin')) return 'admin';
  if (user?.roles.includes('finance')) return 'finance';
  if (user?.roles.includes('moderator')) return 'moderator';
  return 'support';
}
export const adminNavigation = items;
export default function AdminSidebar({ user, open, onClose }: { user?: AuthUser | null; open: boolean; onClose: () => void }) {
  const role = scope(user);
  const { t } = useTranslation();
  const visible = items.filter(([, , , roles]) => (roles as readonly string[]).includes('all') || (roles as readonly string[]).includes(role));
  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-ink-950/55 transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-label="Close admin navigation"
      />
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-[272px] flex-col bg-ink-950 px-4 py-5 text-white transition-transform lg:z-30 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
        aria-label="QAVLIO Admin"
      >
        <div className="flex items-center justify-between">
          <Logo inverse />
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl text-white/60 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-transparent p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-gold-300">Command center</p>
          <p className="mt-1 text-sm font-extrabold">QAVLIO Admin</p>
          <p className="mt-1 text-[9px] capitalize text-white/45">{role.replace('_', ' ')} access</p>
        </div>
        <nav className="hide-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto" aria-label="Admin sections">
          {visible.map(([label, Icon, to]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold transition ${
                  isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/25' : 'text-white/55 hover:bg-white/[.08] hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label.startsWith('admin.') || label.startsWith('nav.') ? t(label) : label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

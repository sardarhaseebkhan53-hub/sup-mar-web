import { BarChart3, Bell, Boxes, CircleHelp, CreditCard, LayoutDashboard, ListChecks, LogOut, MessageCircle, PackageCheck, Plus, Settings, Sparkles, Star, Tag, UserRound, UsersRound, WalletCards, type LucideIcon } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import Logo from '../ui/Logo';

const groups: Array<{ title: string; items: Array<{ label: string; icon: LucideIcon; to: string; end?: boolean }> }> = [
  {
    title: 'Sell',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/seller/dashboard', end: false },
      { label: 'Listings', icon: ListChecks, to: '/seller/listings' },
      { label: 'Add Listing', icon: Plus, to: '/seller/listings/new' },
      { label: 'Inventory', icon: Boxes, to: '/seller/inventory' },
    ],
  },
  {
    title: 'Grow',
    items: [
      { label: 'Leads', icon: UsersRound, to: '/seller/leads' },
      { label: 'Customers', icon: UserRound, to: '/seller/customers' },
      { label: 'Messages', icon: MessageCircle, to: '/messages' },
      { label: 'Templates', icon: MessageCircle, to: '/seller/messages/templates' },
      { label: 'Promotions', icon: Tag, to: '/seller/promotions' },
      { label: 'AI Tools', icon: Sparkles, to: '/seller/ai' },
    ],
  },
  {
    title: 'Understand',
    items: [
      { label: 'Analytics', icon: BarChart3, to: '/seller/analytics' },
      { label: 'Revenue', icon: CreditCard, to: '/seller/revenue' },
      { label: 'Orders', icon: PackageCheck, to: '/seller/orders' },
      { label: 'Packages & credits', icon: WalletCards, to: '/seller/packages' },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Reviews', icon: Star, to: '/seller/reviews' },
      { label: 'Team', icon: UsersRound, to: '/seller/team' },
      { label: 'Notifications', icon: Bell, to: '/seller/notifications' },
      { label: 'Verification', icon: Sparkles, to: '/seller/verification' },
      { label: 'Profile', icon: UserRound, to: '/seller/profile' },
      { label: 'Settings', icon: Settings, to: '/seller/settings' },
    ],
  },
];

export const sellerNavigation = groups.flatMap((group) => group.items);

/** SellerSidebar (§4, §69) — grouped desktop navigation for the Seller Business Center. */
export default function SellerSidebar({ logout }: { logout: () => Promise<void> }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink-950 px-4 py-6 text-white lg:flex" aria-label="Seller center navigation">
    <Logo inverse />
    <div className="mt-7 rounded-xl border border-white/10 bg-white/[.06] p-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-gold-300">Workspace</p>
      <p className="mt-1 text-sm font-extrabold">QAVLIO Seller Center</p>
    </div>
    <nav className="hide-scrollbar mt-4 flex-1 space-y-4 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-[9px] font-extrabold uppercase tracking-[.18em] text-white/35">{group.title}</p>
          <div className="space-y-1">
            {group.items.map(({ label, icon: Icon, to, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition ${isActive ? 'bg-violet-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={16} aria-hidden="true" />{label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
    <div className="space-y-1 border-t border-white/10 pt-3">
      <Link to="/help" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><CircleHelp size={17} aria-hidden="true" /> Help & support</Link>
      <button type="button" onClick={() => { void logout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><LogOut size={17} aria-hidden="true" /> Log out</button>
    </div>
  </aside>;
}

export const sellerGroups = groups;

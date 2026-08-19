import { BarChart3, Bell, Boxes, CircleHelp, CreditCard, LayoutDashboard, ListChecks, LogOut, MessageCircle, PackageCheck, Plus, Settings, Sparkles, Star, Tag, UserRound, UsersRound, WalletCards, type LucideIcon } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import Logo from '../ui/Logo';

/** Navigation is defined with translation keys; labels resolve in the active language. */
const groups: Array<{ title: string; titleKey: string; items: Array<{ label: string; labelKey: string; icon: LucideIcon; to: string; end?: boolean }> }> = [
  {
    title: 'Sell',
    titleKey: 'seller.groups.sell',
    items: [
      { label: 'Dashboard', labelKey: 'seller.nav.dashboard', icon: LayoutDashboard, to: '/seller/dashboard', end: false },
      { label: 'Listings', labelKey: 'seller.nav.listings', icon: ListChecks, to: '/seller/listings' },
      { label: 'Add Listing', labelKey: 'seller.nav.addListing', icon: Plus, to: '/seller/listings/new' },
      { label: 'Inventory', labelKey: 'seller.nav.inventory', icon: Boxes, to: '/seller/inventory' },
    ],
  },
  {
    title: 'Grow',
    titleKey: 'seller.groups.grow',
    items: [
      { label: 'Leads', labelKey: 'seller.nav.leads', icon: UsersRound, to: '/seller/leads' },
      { label: 'Customers', labelKey: 'seller.nav.customers', icon: UserRound, to: '/seller/customers' },
      { label: 'Messages', labelKey: 'seller.nav.messages', icon: MessageCircle, to: '/messages' },
      { label: 'Templates', labelKey: 'seller.nav.templates', icon: MessageCircle, to: '/seller/messages/templates' },
      { label: 'Promotions', labelKey: 'seller.nav.promotions', icon: Tag, to: '/seller/promotions' },
      { label: 'Coupons', labelKey: 'seller.nav.coupons', icon: Tag, to: '/seller/coupons' },
      { label: 'AI Tools', labelKey: 'seller.nav.aiTools', icon: Sparkles, to: '/seller/ai' },
    ],
  },
  {
    title: 'Understand',
    titleKey: 'seller.groups.understand',
    items: [
      { label: 'Analytics', labelKey: 'seller.nav.analytics', icon: BarChart3, to: '/seller/analytics' },
      { label: 'Revenue', labelKey: 'seller.nav.revenue', icon: CreditCard, to: '/seller/revenue' },
      { label: 'Orders', labelKey: 'seller.nav.orders', icon: PackageCheck, to: '/seller/orders' },
      { label: 'Packages & credits', labelKey: 'seller.nav.packages', icon: WalletCards, to: '/seller/packages' },
    ],
  },
  {
    title: 'Business',
    titleKey: 'seller.groups.business',
    items: [
      { label: 'Reviews', labelKey: 'seller.nav.reviews', icon: Star, to: '/seller/reviews' },
      { label: 'Team', labelKey: 'seller.nav.team', icon: UsersRound, to: '/seller/team' },
      { label: 'Notifications', labelKey: 'seller.nav.notifications', icon: Bell, to: '/seller/notifications' },
      { label: 'Verification', labelKey: 'seller.nav.verification', icon: Sparkles, to: '/seller/verification' },
      { label: 'Profile', labelKey: 'seller.nav.profile', icon: UserRound, to: '/seller/profile' },
      { label: 'Settings', labelKey: 'seller.nav.settings', icon: Settings, to: '/seller/settings' },
    ],
  },
];

export const sellerNavigation = groups.flatMap((group) => group.items);

/** SellerSidebar (§4, §69) — grouped desktop navigation for the Seller Business Center. */
export default function SellerSidebar({ logout }: { logout: () => Promise<void> }) {
  const { t } = useTranslation();
  return <aside className="fixed inset-y-0 start-0 z-sticky hidden w-[248px] flex-col bg-ink-950 px-4 py-6 text-white lg:flex" aria-label={t('seller.center')}>
    <Logo inverse />
    <div className="mt-7 rounded-xl border border-white/10 bg-white/[.06] p-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-gold-300">{t('seller.workspace')}</p>
      <p className="mt-1 text-sm font-extrabold">{t('seller.center')}</p>
    </div>
    <nav className="hide-scrollbar mt-4 flex-1 space-y-4 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-[9px] font-extrabold uppercase tracking-[.18em] text-white/35">{t(group.titleKey)}</p>
          <div className="space-y-1">
            {group.items.map(({ labelKey, icon: Icon, to, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[11px] font-bold transition duration-150 ${isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={16} aria-hidden="true" className="shrink-0" />{t(labelKey)}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
    <div className="space-y-1 border-t border-white/10 pt-3">
      <Link to="/help" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><CircleHelp size={17} aria-hidden="true" /> {t('seller.help')}</Link>
      <button type="button" onClick={() => { void logout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10"><LogOut size={17} aria-hidden="true" /> {t('common.logOut')}</button>
    </div>
  </aside>;
}

export const sellerGroups = groups;

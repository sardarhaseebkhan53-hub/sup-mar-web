import { Home, LayoutGrid, MessageCircle, Plus, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { useTranslation } from '../../i18n';

export default function BottomNavigation() {
  const unread = useUnreadMessages();
  const { t } = useTranslation();
  const items = [
    { to: '/', label: t('nav.home'), icon: Home, end: true },
    { to: '/categories', label: t('nav.categories'), icon: LayoutGrid },
    { to: '/sell', label: t('nav.sell'), icon: Plus, primary: true },
    { to: '/messages', label: t('nav.messages'), icon: MessageCircle },
    { to: '/dashboard', label: t('nav.account'), icon: UserRound },
  ];
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/10 bg-white/95 px-2 pt-2 backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, icon: Icon, end, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group flex min-w-0 flex-col items-center gap-1 text-[9px] font-bold ${isActive ? 'text-violet-700' : 'text-slate-500'}`
            }
          >
            <span
              className={`relative grid h-9 w-11 place-items-center rounded-control transition duration-200 ${
                primary ? '-mt-5 h-12 w-12 rounded-full bg-violet-600 text-white shadow-lg ring-4 ring-white' : 'group-hover:bg-violet-50'
              }`}
            >
              <Icon size={primary ? 22 : 19} />
              {label === t('nav.messages') && unread > 0 && (
                <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[8px] text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

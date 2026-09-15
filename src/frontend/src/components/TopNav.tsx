import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Route, Navigation,
  BarChart3, MessageSquareText, Bell, RefreshCw, MapPin,
} from 'lucide-react';
import logoSrc from '../assets/logo.png';
import styles from './TopNav.module.css';

const navItems = [
  { to: '/',          icon: LayoutDashboard,   label: 'Dashboard'    },
  { to: '/fleet',     icon: Truck,             label: 'Fleet'        },
  { to: '/routes',    icon: Route,             label: 'Routes'       },
  { to: '/trips',     icon: Navigation,        label: 'Trips'        },
  { to: '/analytics', icon: BarChart3,         label: 'Analytics'    },
  { to: '/copilot',   icon: MessageSquareText, label: 'AI Copilot'   },
];

const pageTitles: Record<string, string> = {
  '/':          'Dashboard',
  '/fleet':     'Fleet Management',
  '/routes':    'Route Performance',
  '/trips':     'Trip History',
  '/analytics': 'Analytics',
  '/copilot':   'AI Copilot',
};

function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/fleet/'))     return 'Vehicle Detail';
  if (pathname.startsWith('/routes/'))    return 'Route Detail';
  if (pathname.startsWith('/trips/'))     return 'Trip Detail';
  return pageTitles[pathname] ?? 'YatraDrishti';
}

export default function TopNav() {
  const pageTitle = usePageTitle();

  return (
    <header className={styles.nav}>
      {/* Brand */}
      <a href="/" className={styles.brand}>
        <img src={logoSrc} alt="YatraDrishti" className={styles.logo} />
        <div className={styles.brandText}>
          <span className={styles.brandName}>YatraDrishti</span>
          <span className={styles.brandTag}>Intelligence for Every Journey</span>
        </div>
      </a>

      {/* Page title pill (mobile / mid) */}
      <div className={styles.pagePill}>
        <MapPin size={13} />
        {pageTitle}
      </div>

      {/* Nav links */}
      <nav className={styles.links}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
          >
            <Icon size={15} className={styles.linkIcon} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Right actions */}
      <div className={styles.actions}>
        <div className={styles.liveTag}>
          <span className={styles.liveDot} />
          Live
        </div>
        <button className={styles.iconBtn} title="Refresh">
          <RefreshCw size={14} />
        </button>
        <button className={styles.iconBtn} title="Notifications">
          <Bell size={14} />
          <span className={styles.badge}>3</span>
        </button>
        <div className={styles.avatar}>YD</div>
      </div>
    </header>
  );
}

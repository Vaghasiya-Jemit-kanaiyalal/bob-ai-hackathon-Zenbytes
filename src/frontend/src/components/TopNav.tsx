import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Route, Navigation,
  BarChart3, MessageSquareText, Bell, RefreshCw, MapPin,
  Database, LogOut, ChevronDown, FlaskConical,
} from 'lucide-react';
import { useState } from 'react';
import logoSrc from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import styles from './TopNav.module.css';

const navItems = [
  { to: '/',             icon: LayoutDashboard,   label: 'Dashboard'    },
  { to: '/fleet',        icon: Truck,             label: 'Fleet'        },
  { to: '/routes',       icon: Route,             label: 'Routes'       },
  { to: '/trips',        icon: Navigation,        label: 'Trips'        },
  { to: '/analytics',    icon: BarChart3,         label: 'Analytics'    },
  { to: '/data-center',  icon: Database,          label: 'Data Center'  },
  { to: '/copilot',      icon: MessageSquareText, label: 'AI Copilot'   },
];

const pageTitles: Record<string, string> = {
  '/':             'Dashboard',
  '/fleet':        'Fleet Management',
  '/routes':       'Route Performance',
  '/trips':        'Trip History',
  '/analytics':    'Analytics',
  '/data-center':  'Data Center',
  '/copilot':      'AI Copilot',
};

function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/fleet/'))     return 'Vehicle Detail';
  if (pathname.startsWith('/routes/'))    return 'Route Detail';
  if (pathname.startsWith('/trips/'))     return 'Trip Detail';
  return pageTitles[pathname] ?? 'YatraDrishti';
}

export default function TopNav() {
  const pageTitle  = usePageTitle();
  const { user, logout } = useAuth();
  const navigate   = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { demoMode, toggleDemo } = useDemoMode();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : 'YD';

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
        <button
          className={`${styles.demoBtn} ${demoMode ? styles.demoBtnOn : ''}`}
          onClick={toggleDemo}
          title={demoMode ? 'Exit Demo Mode — use real data' : 'Enter Demo Mode — use sample data'}
        >
          <FlaskConical size={13} />
          <span>{demoMode ? 'Demo ON' : 'Demo'}</span>
        </button>
        <div className={demoMode ? styles.demoTag : styles.liveTag}>
          <span className={demoMode ? styles.demoDot : styles.liveDot} />
          {demoMode ? 'Demo' : 'Live'}
        </div>
        <button className={styles.iconBtn} title="Refresh" onClick={() => window.location.reload()}>
          <RefreshCw size={14} />
        </button>
        <button className={styles.iconBtn} title="Notifications">
          <Bell size={14} />
        </button>

        {/* User menu */}
        <div className={styles.userMenu}>
          <button
            className={styles.userBtn}
            onClick={() => setMenuOpen(v => !v)}
            title={user?.name ?? 'User'}
          >
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{user?.name ?? 'User'}</span>
            <ChevronDown size={12} className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ''}`} />
          </button>
          {menuOpen && (
            <>
              <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
              <div className={styles.dropdown}>
                <div className={styles.dropUser}>
                  <div className={styles.dropName}>{user?.name}</div>
                  <div className={styles.dropEmail}>{user?.email}</div>
                  <div className={styles.dropRole}>{user?.role}</div>
                </div>
                <button className={styles.dropItem} onClick={() => { setMenuOpen(false); handleLogout(); }}>
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

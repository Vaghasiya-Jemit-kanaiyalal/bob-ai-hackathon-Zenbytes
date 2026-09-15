import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Route,
  Navigation,
  BarChart3,
  MessageSquareText,
  Zap,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { to: '/',          icon: LayoutDashboard,    label: 'Dashboard'    },
  { to: '/fleet',     icon: Truck,              label: 'Fleet'        },
  { to: '/routes',    icon: Route,              label: 'Routes'       },
  { to: '/trips',     icon: Navigation,         label: 'Trips'        },
  { to: '/analytics', icon: BarChart3,          label: 'Analytics'    },
  { to: '/copilot',   icon: MessageSquareText,  label: 'Bob Copilot'  },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <Zap size={18} />
        </div>
        <div>
          <div className={styles.brandName}>FleetIQ</div>
          <div className={styles.brandSub}>Urban Intelligence</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <Icon size={17} className={styles.navIcon} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.statusDot} />
        <span>Live — NYC Fleet</span>
      </div>
    </aside>
  );
}

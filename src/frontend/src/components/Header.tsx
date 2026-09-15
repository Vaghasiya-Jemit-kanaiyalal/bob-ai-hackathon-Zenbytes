import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import styles from './Header.module.css';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/':          { title: 'Dashboard',         subtitle: 'Fleet overview & live status' },
  '/fleet':     { title: 'Fleet Management',  subtitle: 'Vehicle tracking & health' },
  '/routes':    { title: 'Route Performance', subtitle: 'Route analytics & optimization' },
  '/trips':     { title: 'Trip History',      subtitle: 'All trips & incident log' },
  '/analytics': { title: 'Analytics',         subtitle: 'Trends, efficiency & fuel metrics' },
  '/copilot':   { title: 'Bob Copilot',       subtitle: 'AI-powered fleet intelligence assistant' },
};

export default function Header() {
  const { pathname } = useLocation();
  const info = titles[pathname] ?? { title: 'FleetIQ', subtitle: '' };

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>{info.title}</h1>
        <p className={styles.subtitle}>{info.subtitle}</p>
      </div>
      <div className={styles.actions}>
        <div className={styles.liveTag}>
          <span className={styles.liveDot} />
          Live
        </div>
        <button className={styles.iconBtn} title="Refresh">
          <RefreshCw size={15} />
        </button>
        <button className={styles.iconBtn} title="Notifications">
          <Bell size={15} />
          <span className={styles.badge}>3</span>
        </button>
        <div className={styles.avatar}>OP</div>
      </div>
    </header>
  );
}

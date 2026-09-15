import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { vehicles } from '../data/mockData';
import styles from './Header.module.css';

const staticTitles: Record<string, { title: string; subtitle: string }> = {
  '/':          { title: 'Dashboard',         subtitle: 'Fleet overview & live status' },
  '/fleet':     { title: 'Fleet Management',  subtitle: 'Vehicle tracking & health' },
  '/routes':    { title: 'Route Performance', subtitle: 'Route analytics & optimization' },
  '/trips':     { title: 'Trip History',      subtitle: 'All trips & incident log' },
  '/analytics': { title: 'Analytics',         subtitle: 'Trends, efficiency & fuel metrics' },
  '/copilot':   { title: 'Bob Copilot',       subtitle: 'AI-powered fleet intelligence assistant' },
};

function usePageInfo() {
  const { pathname } = useLocation();
  // Vehicle detail: /fleet/:id
  const fleetDetailMatch = pathname.match(/^\/fleet\/(.+)$/);
  if (fleetDetailMatch) {
    const vehicleId = fleetDetailMatch[1];
    const v = vehicles.find(veh => veh.id === vehicleId);
    return {
      title:    v ? `${v.plate} — ${v.make} ${v.model}` : 'Vehicle Detail',
      subtitle: v ? `${v.driver} · ${v.route}` : 'Vehicle details & history',
    };
  }
  return staticTitles[pathname] ?? { title: 'FleetIQ', subtitle: '' };
}

export default function Header() {
  const info = usePageInfo();

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

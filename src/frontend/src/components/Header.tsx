import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { vehicles, routes, trips } from '../data/mockData';
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

  const fleetMatch  = pathname.match(/^\/fleet\/(.+)$/);
  const routeMatch  = pathname.match(/^\/routes\/(.+)$/);
  const tripMatch   = pathname.match(/^\/trips\/(.+)$/);

  if (fleetMatch) {
    const v = vehicles.find(veh => veh.id === fleetMatch[1]);
    return {
      title:    v ? `${v.plate} — ${v.make} ${v.model}` : 'Vehicle Detail',
      subtitle: v ? `${v.driver} · ${v.route}` : 'Vehicle details & history',
    };
  }
  if (routeMatch) {
    const r = routes.find(rt => rt.id === routeMatch[1]);
    return {
      title:    r ? `${r.id} — ${r.name}` : 'Route Detail',
      subtitle: r ? `${r.distance} km · ${r.onTimeRate}% on-time · ${r.vehicles} vehicles` : 'Route details & performance',
    };
  }
  if (tripMatch) {
    const t = trips.find(tr => tr.id === tripMatch[1]);
    return {
      title:    t ? `${t.id}` : 'Trip Detail',
      subtitle: t ? `${t.driver} · ${t.route} · ${t.origin} → ${t.destination}` : 'Trip details & delivery status',
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

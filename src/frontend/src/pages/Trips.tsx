import { useState } from 'react';
import { Search } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { trips } from '../data/mockData';
import { tripStatusBadge, riskBadge } from '../utils/badges';
import styles from './Trips.module.css';

type StatusFilter = 'all' | 'in-progress' | 'delayed' | 'completed' | 'cancelled';

export default function Trips() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = trips.filter(t => {
    const matchStatus = filter === 'all' || t.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || t.id.toLowerCase().includes(q)
      || t.driver.toLowerCase().includes(q)
      || t.plate.toLowerCase().includes(q)
      || t.route.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    all:          trips.length,
    'in-progress':trips.filter(t => t.status === 'in-progress').length,
    delayed:      trips.filter(t => t.status === 'delayed').length,
    completed:    trips.filter(t => t.status === 'completed').length,
    cancelled:    trips.filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder="Search trip ID, driver, route…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {(['all', 'in-progress', 'delayed', 'completed', 'cancelled'] as StatusFilter[]).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={styles.count}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <Card title={`All Trips (${filtered.length})`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Start</th>
                <th>ETA</th>
                <th>Dist.</th>
                <th>Delay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const ts = tripStatusBadge(t.status);
                const rb = riskBadge(t.risk);
                return (
                  <tr key={t.id}>
                    <td className={styles.tripId}>{t.id}</td>
                    <td>
                      <div className={styles.bold}>{t.plate}</div>
                      <div className={styles.sub}>{t.vehicleId}</div>
                    </td>
                    <td>{t.driver}</td>
                    <td className={styles.muted}>{t.route}</td>
                    <td className={styles.muted}>{t.origin}</td>
                    <td className={styles.muted}>{t.destination}</td>
                    <td><Badge {...ts} /></td>
                    <td><Badge {...rb} /></td>
                    <td className={styles.muted}>{t.startTime}</td>
                    <td className={styles.muted}>{t.eta}</td>
                    <td className={styles.muted}>{t.distance} km</td>
                    <td>
                      {t.delay > 0
                        ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>+{t.delay} min</span>
                        : <span style={{ color: 'var(--success)' }}>On time</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className={styles.empty}>No trips match your search.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

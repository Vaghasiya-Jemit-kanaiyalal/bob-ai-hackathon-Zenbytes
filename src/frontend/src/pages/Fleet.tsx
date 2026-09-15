import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { vehicles } from '../data/mockData';
import { riskBadge, statusBadge } from '../utils/badges';
import styles from './Fleet.module.css';

type FilterType = 'all' | 'active' | 'idle' | 'maintenance' | 'offline';

export default function Fleet() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = vehicles.filter(v => {
    const matchStatus = filter === 'all' || v.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || v.plate.toLowerCase().includes(q) || v.driver.toLowerCase().includes(q) || v.route.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    all:         vehicles.length,
    active:      vehicles.filter(v => v.status === 'active').length,
    idle:        vehicles.filter(v => v.status === 'idle').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    offline:     vehicles.filter(v => v.status === 'offline').length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder="Search plate, driver, route…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {(['all', 'active', 'idle', 'maintenance', 'offline'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={styles.count}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <Card title={`Vehicles (${filtered.length})`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Location</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Speed</th>
                <th>Fuel</th>
                <th>Efficiency</th>
                <th>Trips Today</th>
                <th>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const rb = riskBadge(v.risk);
                const sb = statusBadge(v.status);
                return (
                  <tr key={v.id}>
                    <td>
                      <div className={styles.plate}>{v.plate}</div>
                      <div className={styles.sub}>{v.id}</div>
                    </td>
                    <td>{v.driver}</td>
                    <td className={styles.muted}>{v.route}</td>
                    <td className={styles.muted}>{v.location}</td>
                    <td><Badge {...sb} /></td>
                    <td><Badge {...rb} /></td>
                    <td>
                      <span style={{ color: v.speed > 70 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {v.speed > 0 ? `${v.speed} mph` : '—'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.fuelRow}>
                        <div className={styles.fuelBar}>
                          <div className={styles.fuelFill} style={{
                            width: `${v.fuelLevel}%`,
                            background: v.fuelLevel < 25 ? 'var(--danger)' : v.fuelLevel < 50 ? 'var(--warning)' : 'var(--success)',
                          }} />
                        </div>
                        <span>{v.fuelLevel}%</span>
                      </div>
                    </td>
                    <td>
                      {v.efficiency > 0
                        ? <span style={{ color: v.efficiency < 65 ? 'var(--danger)' : v.efficiency < 80 ? 'var(--warning)' : 'var(--success)' }}>
                            {v.efficiency}%
                          </span>
                        : <span className={styles.muted}>—</span>
                      }
                    </td>
                    <td className={styles.muted}>{v.trips}</td>
                    <td className={styles.muted}>{v.lastUpdate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className={styles.empty}>No vehicles match your search.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

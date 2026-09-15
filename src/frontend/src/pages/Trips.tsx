import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Package, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import type { TripStatus, RiskLevel } from '../data/mockData';
import { fetchTrips } from '../data/api';
import { useApi } from '../utils/useApi';
import { tripStatusBadge, riskBadge } from '../utils/badges';
import styles from './Trips.module.css';

type StatusFilter = 'all' | TripStatus;
type RiskFilter   = 'all' | RiskLevel;

export default function Trips() {
  const navigate = useNavigate();
  const { data: trips, loading } = useApi(() => fetchTrips({ limit: '100' }));
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatus]   = useState<StatusFilter>('all');
  const [riskFilter,   setRisk]     = useState<RiskFilter>('all');

  if (!loading && !trips) {
    return <div style={{ padding: 24 }}><EmptyState /></div>;
  }

  const filtered = (trips ?? []).filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchRisk   = riskFilter   === 'all' || t.risk   === riskFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || t.id.toLowerCase().includes(q)
      || t.driver.toLowerCase().includes(q)
      || t.plate.toLowerCase().includes(q)
      || t.route.toLowerCase().includes(q)
      || t.origin.toLowerCase().includes(q)
      || t.destination.toLowerCase().includes(q);
    return matchStatus && matchRisk && matchSearch;
  });

  const statusCounts: Record<StatusFilter, number> = {
    all:           (trips ?? []).length,
    'in-progress': (trips ?? []).filter(t => t.status === 'in-progress').length,
    delayed:       (trips ?? []).filter(t => t.status === 'delayed').length,
    completed:     (trips ?? []).filter(t => t.status === 'completed').length,
    cancelled:     (trips ?? []).filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className={styles.page}>
      {/* Summary tiles */}
      <div className={styles.summaryRow}>
        {[
          { key: 'in-progress', label: 'In Progress', value: statusCounts['in-progress'], icon: <Clock size={15} />,        color: 'var(--accent)'  },
          { key: 'delayed',     label: 'Delayed',     value: statusCounts.delayed,         icon: <AlertTriangle size={15} />, color: 'var(--danger)'  },
          { key: 'completed',   label: 'Completed',   value: statusCounts.completed,       icon: <CheckCircle2 size={15} />, color: 'var(--success)' },
          { key: 'cancelled',   label: 'Cancelled',   value: statusCounts.cancelled,       icon: <XCircle size={15} />,      color: 'var(--text-muted)' },
          { key: 'all',         label: 'Total',       value: statusCounts.all,             icon: <Package size={15} />,      color: 'var(--purple)'  },
        ].map(s => (
          <button
            key={s.key}
            className={`${styles.summaryTile} ${statusFilter === s.key ? styles.summaryActive : ''}`}
            onClick={() => setStatus(s.key as StatusFilter)}
          >
            <div className={styles.summaryIcon} style={{ color: s.color, background: s.color + '22' }}>{s.icon}</div>
            <div className={styles.summaryValue}>{s.value}</div>
            <div className={styles.summaryLabel}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder="Search trip ID, driver, plate, route…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.toolbarRight}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {(['all', 'in-progress', 'delayed', 'completed', 'cancelled'] as StatusFilter[]).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${statusFilter === f ? styles.active : ''}`}
              onClick={() => setStatus(f)}
            >
              {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={styles.count}>{statusCounts[f]}</span>
            </button>
          ))}
          <div className={styles.divider} />
          {(['all', 'low', 'medium', 'high', 'critical'] as RiskFilter[]).map(r => {
            const rb = r === 'all' ? null : riskBadge(r);
            return (
              <button
                key={r}
                className={`${styles.riskBtn} ${riskFilter === r ? styles.active : ''}`}
                onClick={() => setRisk(r)}
                style={riskFilter === r && rb ? { color: rb.color, borderColor: rb.color, background: rb.bg } : {}}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <Card title={`Trips — ${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Origin → Destination</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Delivery</th>
                <th>Start</th>
                <th>ETA</th>
                <th>Distance</th>
                <th>Delay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const ts  = tripStatusBadge(t.status);
                const rb  = riskBadge(t.risk);
                const det = tripDetails[t.id];
                const delivPct = det
                  ? Math.round((det.deliveredPackages / det.totalPackages) * 100)
                  : null;
                return (
                  <tr
                    key={t.id}
                    className={styles.clickable}
                    onClick={() => navigate(`/trips/${t.id}`)}
                  >
                    <td className={styles.tripId}>{t.id}</td>
                    <td>
                      <div className={styles.bold}>{t.plate}</div>
                      <div className={styles.sub}>{t.vehicleId}</div>
                    </td>
                    <td>{t.driver}</td>
                    <td className={styles.muted}>{t.route}</td>
                    <td className={styles.muted}>{t.origin} → {t.destination}</td>
                    <td><Badge {...ts} /></td>
                    <td><Badge {...rb} /></td>
                    <td>
                      {det ? (
                        <div className={styles.deliveryWrap}>
                          <div className={styles.deliveryBar}>
                            <div
                              className={styles.deliveryFill}
                              style={{
                                width: `${delivPct}%`,
                                background: delivPct === 100 ? 'var(--success)' : t.status === 'delayed' ? 'var(--warning)' : 'var(--accent)',
                              }}
                            />
                          </div>
                          <span className={styles.deliveryPct} style={{ color: delivPct === 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
                            {det.deliveredPackages}/{det.totalPackages}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
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

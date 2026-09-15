import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, LayoutGrid, List,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Truck, AlertTriangle, CheckCircle2, Clock, WifiOff,
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import FuelGauge from '../components/FuelGauge';
import EmptyState from '../components/EmptyState';
import type { Vehicle, VehicleStatus } from '../data/mockData';
import { fetchVehicles } from '../data/api';
import { useApi } from '../utils/useApi';
import { riskBadge, statusBadge } from '../utils/badges';
import styles from './Fleet.module.css';

type FilterType = 'all' | VehicleStatus;
type SortKey = keyof Pick<Vehicle, 'plate' | 'driver' | 'status' | 'risk' | 'speed' | 'fuelLevel' | 'efficiency' | 'trips'>;
type SortDir = 'asc' | 'desc';

const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const statusOrder: Record<string, number> = { active: 0, idle: 1, maintenance: 2, offline: 3 };

function sortVehicles(list: Vehicle[], key: SortKey, dir: SortDir): Vehicle[] {
  return [...list].sort((a, b) => {
    let av: string | number = a[key] as string | number;
    let bv: string | number = b[key] as string | number;
    if (key === 'risk')   { av = riskOrder[a.risk];   bv = riskOrder[b.risk];   }
    if (key === 'status') { av = statusOrder[a.status]; bv = statusOrder[b.status]; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

export default function Fleet() {
  const navigate = useNavigate();
  const { data: vehicles, loading } = useApi(() => fetchVehicles());
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<FilterType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [view,    setView]    = useState<'table' | 'grid'>('table');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (!loading && !vehicles) {
    return <div style={{ padding: 24 }}><EmptyState page="fleet" /></div>;
  }

  const filtered = sortVehicles(
    (vehicles ?? []).filter(v => {
      const matchStatus = filter === 'all' || v.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q
        || v.plate.toLowerCase().includes(q)
        || v.driver.toLowerCase().includes(q)
        || v.route.toLowerCase().includes(q)
        || v.location.toLowerCase().includes(q)
        || v.id.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    }),
    sortKey, sortDir
  );

  const counts = {
    all:         (vehicles ?? []).length,
    active:      (vehicles ?? []).filter(v => v.status === 'active').length,
    idle:        (vehicles ?? []).filter(v => v.status === 'idle').length,
    maintenance: (vehicles ?? []).filter(v => v.status === 'maintenance').length,
    offline:     (vehicles ?? []).filter(v => v.status === 'offline').length,
  };

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: 'var(--accent)' }} />
      : <ChevronDown size={12} style={{ color: 'var(--accent)' }} />;
  }

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th className={styles.sortable} onClick={() => handleSort(col)}>
      <span>{label}</span><SortIcon col={col} />
    </th>
  );

  return (
    <div className={styles.page}>
      {/* Summary tiles */}
      <div className={styles.summaryRow}>
        {[
          { label: 'Total',       value: counts.all,         icon: <Truck size={15} />,         color: 'var(--accent)'  },
          { label: 'Active',      value: counts.active,      icon: <CheckCircle2 size={15} />,  color: 'var(--success)' },
          { label: 'Idle',        value: counts.idle,        icon: <Clock size={15} />,          color: 'var(--warning)' },
          { label: 'Maintenance', value: counts.maintenance, icon: <AlertTriangle size={15} />, color: 'var(--purple)'  },
          { label: 'Offline',     value: counts.offline,     icon: <WifiOff size={15} />,        color: 'var(--text-muted)' },
        ].map(s => (
          <button
            key={s.label}
            className={`${styles.summaryTile} ${filter === (s.label.toLowerCase() as FilterType) ? styles.summaryActive : ''}`}
            onClick={() => setFilter((s.label === 'Total' ? 'all' : s.label.toLowerCase()) as FilterType)}
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
            placeholder="Search plate, driver, route, location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.toolbarRight}>
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
          <div className={styles.divider} />
          <button
            className={`${styles.viewBtn} ${view === 'table' ? styles.viewActive : ''}`}
            onClick={() => setView('table')}
            title="Table view"
          >
            <List size={15} />
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'grid' ? styles.viewActive : ''}`}
            onClick={() => setView('grid')}
            title="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        <Card title={`Vehicles — ${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <Th col="plate"      label="Vehicle" />
                  <Th col="driver"     label="Driver" />
                  <th>Route</th>
                  <th>Location</th>
                  <Th col="status"     label="Status" />
                  <Th col="risk"       label="Risk" />
                  <Th col="speed"      label="Speed" />
                  <th>Fuel</th>
                  <Th col="efficiency" label="Efficiency" />
                  <Th col="trips"      label="Trips" />
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const rb = riskBadge(v.risk);
                  const sb = statusBadge(v.status);
                  return (
                    <tr
                      key={v.id}
                      className={styles.clickable}
                      onClick={() => navigate(`/fleet/${v.id}`)}
                    >
                      <td>
                        <div className={styles.plate}>{v.plate}</div>
                        <div className={styles.sub}>{v.id} · {v.make} {v.model}</div>
                      </td>
                      <td>
                        <div className={styles.driverName}>{v.driver}</div>
                        <div className={styles.sub}>Since {v.driverSince}</div>
                      </td>
                      <td className={styles.muted}>{v.route}</td>
                      <td className={styles.muted}>{v.location}</td>
                      <td><Badge {...sb} /></td>
                      <td><Badge {...rb} /></td>
                      <td>
                        <span style={{ color: v.speed > 70 ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {v.speed > 0 ? `${v.speed} mph` : '—'}
                        </span>
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <FuelGauge level={v.fuelLevel} size="sm" />
                      </td>
                      <td>
                        {v.efficiency > 0
                          ? <span style={{ color: v.efficiency < 65 ? 'var(--danger)' : v.efficiency < 80 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
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
      )}

      {/* Grid view */}
      {view === 'grid' && (
        <div className={styles.grid}>
          {filtered.map(v => {
            const rb = riskBadge(v.risk);
            const sb = statusBadge(v.status);
            return (
              <div
                key={v.id}
                className={styles.card}
                onClick={() => navigate(`/fleet/${v.id}`)}
              >
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.cardPlate}>{v.plate}</div>
                    <div className={styles.cardSub}>{v.id} · {v.make} {v.model} {v.year}</div>
                  </div>
                  <div className={styles.cardBadges}>
                    <Badge {...sb} />
                    <Badge {...rb} />
                  </div>
                </div>

                <div className={styles.cardDriver}>
                  <div className={styles.driverAvatar}>
                    {v.driver.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className={styles.driverName}>{v.driver}</div>
                    <div className={styles.sub}>{v.route}</div>
                  </div>
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.cardStat}>
                    <div className={styles.cardStatVal} style={{ color: v.speed > 70 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {v.speed > 0 ? `${v.speed}` : '—'}
                    </div>
                    <div className={styles.cardStatLabel}>mph</div>
                  </div>
                  <div className={styles.cardStat}>
                    <div className={styles.cardStatVal} style={{ color: v.efficiency < 65 ? 'var(--danger)' : v.efficiency < 80 ? 'var(--warning)' : 'var(--success)' }}>
                      {v.efficiency > 0 ? `${v.efficiency}%` : '—'}
                    </div>
                    <div className={styles.cardStatLabel}>efficiency</div>
                  </div>
                  <div className={styles.cardStat}>
                    <div className={styles.cardStatVal}>{v.trips}</div>
                    <div className={styles.cardStatLabel}>trips</div>
                  </div>
                </div>

                <div className={styles.cardFuel}>
                  <span className={styles.cardFuelLabel}>Fuel</span>
                  <FuelGauge level={v.fuelLevel} size="sm" />
                </div>

                <div className={styles.cardLocation}>
                  📍 {v.location} · {v.lastUpdate}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className={styles.emptyGrid}>No vehicles match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}

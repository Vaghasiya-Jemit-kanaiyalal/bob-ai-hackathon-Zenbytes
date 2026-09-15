import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Navigation, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { routes as mockRoutes } from '../data/mockData';
import type { Route } from '../data/mockData';
import { fetchRoutes } from '../data/api';
import { useApi } from '../utils/useApi';
import { routeStatusColor } from '../utils/badges';
import styles from './Routes.module.css';

type StatusFilter = 'all' | 'optimal' | 'congested' | 'disrupted';
type SortKey = keyof Pick<Route, 'id' | 'name' | 'distance' | 'avgDuration' | 'onTimeRate' | 'incidents' | 'vehicles' | 'dailyTrips'>;
type SortDir = 'asc' | 'desc';

const trendIcon = (t: string) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
const trendColor = (t: string) =>
  t === 'up' ? 'var(--success)' : t === 'down' ? 'var(--danger)' : 'var(--text-muted)';

function makeRadarData(routes: Route[]) {
  return routes.map(r => ({
    name: r.id,
    'On-Time':     r.onTimeRate,
    'Utilization': Math.round(r.dailyTrips / 1.1),
    'Safety':      100 - r.incidents * 10,
  }));
}

function sortRoutes(list: Route[], key: SortKey, dir: SortDir): Route[] {
  return [...list].sort((a, b) => {
    const av = a[key] as string | number;
    const bv = b[key] as string | number;
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

export default function RoutesPage() {
  const navigate = useNavigate();
  const { data: routes } = useApi(fetchRoutes, mockRoutes);
  const radarData = makeRadarData(routes);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('onTimeRate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = sortRoutes(
    routes.filter(r => {
      const matchStatus = filter === 'all' || r.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q || r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    }),
    sortKey, sortDir
  );

  const counts = {
    all:       routes.length,
    optimal:   routes.filter(r => r.status === 'optimal').length,
    congested: routes.filter(r => r.status === 'congested').length,
    disrupted: routes.filter(r => r.status === 'disrupted').length,
  };

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
    return sortDir === 'asc'
      ? <ChevronUp   size={12} style={{ color: 'var(--accent)' }} />
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
          { key: 'all',       label: 'All Routes',   value: counts.all,       icon: <Navigation size={15} />,    color: 'var(--accent)'        },
          { key: 'optimal',   label: 'Optimal',      value: counts.optimal,   icon: <CheckCircle2 size={15} />,  color: 'var(--success)'       },
          { key: 'congested', label: 'Congested',    value: counts.congested, icon: <AlertTriangle size={15} />, color: 'var(--warning)'       },
          { key: 'disrupted', label: 'Disrupted',    value: counts.disrupted, icon: <XCircle size={15} />,       color: 'var(--danger)'        },
        ].map(s => (
          <button
            key={s.key}
            className={`${styles.summaryTile} ${filter === s.key ? styles.summaryActive : ''}`}
            onClick={() => setFilter(s.key as StatusFilter)}
          >
            <div className={styles.summaryIcon} style={{ color: s.color, background: s.color + '22' }}>{s.icon}</div>
            <div className={styles.summaryValue}>{s.value}</div>
            <div className={styles.summaryLabel}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <Card title="Route Performance Radar — On-Time & Safety Scores" className={styles.radarCard}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Radar name="On-Time %" dataKey="On-Time"  stroke="var(--accent)"  fill="var(--accent)"  fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Safety"    dataKey="Safety"   stroke="var(--success)" fill="var(--success)" fillOpacity={0.1}  strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Daily Trips & Active Vehicles by Route" className={styles.barCard}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={routes} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text-secondary)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="dailyTrips" name="Daily Trips" fill="var(--purple)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vehicles"   name="Vehicles"    fill="var(--accent)"  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder="Search route ID or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.toolbarRight}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {(['all', 'optimal', 'congested', 'disrupted'] as StatusFilter[]).map(f => (
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

      {/* Table */}
      <Card title={`All Routes — ${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <Th col="id"          label="Route ID" />
                <Th col="name"        label="Name" />
                <Th col="distance"    label="Distance" />
                <Th col="avgDuration" label="Sched. Time" />
                <th>Actual Time</th>
                <th>Delay</th>
                <Th col="onTimeRate"  label="On-Time" />
                <Th col="incidents"   label="Incidents" />
                <Th col="vehicles"    label="Vehicles" />
                <Th col="dailyTrips"  label="Daily Trips" />
                <th>Status</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const sc = routeStatusColor(r.status);
                // Approximate actual duration from mock detail data
                const actualDuration = Math.round(r.avgDuration * (1 + (100 - r.onTimeRate) / 100 * 0.8));
                const delayMin = actualDuration - r.avgDuration;
                return (
                  <tr
                    key={r.id}
                    className={styles.clickable}
                    onClick={() => navigate(`/routes/${r.id}`)}
                  >
                    <td className={styles.routeId}>{r.id}</td>
                    <td className={styles.bold}>{r.name}</td>
                    <td className={styles.muted}>{r.distance} km</td>
                    <td className={styles.muted}>{r.avgDuration} min</td>
                    <td>
                      <span style={{ color: delayMin > 10 ? 'var(--danger)' : delayMin > 4 ? 'var(--warning)' : 'var(--success)' }}>
                        {actualDuration} min
                      </span>
                    </td>
                    <td>
                      {delayMin > 0
                        ? <span style={{ color: delayMin > 10 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>+{delayMin} min</span>
                        : <span style={{ color: 'var(--success)' }}>On time</span>
                      }
                    </td>
                    <td>
                      <div className={styles.onTimeWrap}>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{
                            width: `${r.onTimeRate}%`,
                            background: r.onTimeRate >= 85 ? 'var(--success)' : r.onTimeRate >= 70 ? 'var(--warning)' : 'var(--danger)',
                          }} />
                        </div>
                        <span style={{ color: r.onTimeRate >= 85 ? 'var(--success)' : r.onTimeRate >= 70 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
                          {r.onTimeRate}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: r.incidents > 2 ? 'var(--danger)' : r.incidents > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                        {r.incidents}
                      </span>
                    </td>
                    <td className={styles.muted}>{r.vehicles}</td>
                    <td className={styles.muted}>{r.dailyTrips}</td>
                    <td><Badge label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} {...sc} /></td>
                    <td style={{ color: trendColor(r.trend), fontWeight: 600 }}>
                      {trendIcon(r.trend)} {r.trend}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className={styles.empty}>No routes match your search.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

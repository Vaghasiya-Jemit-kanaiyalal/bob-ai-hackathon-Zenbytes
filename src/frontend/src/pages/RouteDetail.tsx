import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, MapPin, Clock, AlertTriangle,
  TrendingUp, Fuel, Navigation, Activity, ShieldAlert,
  Truck,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Card from '../components/Card';
import Badge from '../components/Badge';
import TabBar from '../components/TabBar';
import StatRow from '../components/StatRow';
import { fetchRoute } from '../data/api';
import { useApi } from '../utils/useApi';
import { routeStatusColor, riskBadge, tripStatusBadge } from '../utils/badges';
import styles from './RouteDetail.module.css';

type TabId = 'overview' | 'performance' | 'trips' | 'risk';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',    label: 'Overview'       },
  { id: 'performance', label: 'Performance'    },
  { id: 'trips',       label: 'Active Trips'   },
  { id: 'risk',        label: 'Risk & Traffic' },
];

const trafficColor: Record<string, { color: string; bg: string; label: string }> = {
  free:       { color: 'var(--success)', bg: 'var(--success-dim)', label: 'Free Flow'  },
  moderate:   { color: 'var(--warning)', bg: 'var(--warning-dim)', label: 'Moderate'   },
  heavy:      { color: 'var(--danger)',  bg: 'var(--danger-dim)',  label: 'Heavy'      },
  standstill: { color: '#ff4040',        bg: '#500',               label: 'Standstill' },
};

const waypointTypeIcon: Record<string, string> = {
  depot: '🏭', stop: '📦', hub: '🏢', checkpoint: '📍',
};

const riskLevelStyle = {
  low:    { color: 'var(--success)', bg: 'var(--success-dim)' },
  medium: { color: 'var(--warning)', bg: 'var(--warning-dim)' },
  high:   { color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
};

const tooltipStyle = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--text-secondary)' },
};

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('overview');
  const { data: route, loading } = useApi(() => fetchRoute(id!));

  // Detail data not available from DB; show empty waypoint/segment data
  const detail = route ? {
    description: `Route ${id}`, zone: '—', startHub: '—', endHub: '—',
    avgActualDuration: route.avgDuration, peakDelayHour: '—', lastUpdated: '—',
    weeklyTrips: route.dailyTrips * 7, weeklyIncidents: route.incidents,
    avgFuelPerTrip: 0, co2PerTrip: 0,
    waypoints: [], segments: [], hourlyDelay: [], weeklyOnTime: [], riskFactors: [],
  } : undefined;

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (!route || !detail) {
    return (
      <div className={styles.notFound}>
        <Navigation size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <div className={styles.notFoundTitle}>Route not found</div>
        <div className={styles.notFoundSub}>No route with ID "{id}" exists in the database.</div>
        <button className={styles.backBtn} onClick={() => navigate('/routes')}>
          <ArrowLeft size={14} /> Back to Routes
        </button>
      </div>
    );
  }

  const sc = routeStatusColor(route.status);
  const activeVehicles: unknown[] = [];
  const activeTrips:    unknown[] = [];
  const avgDelay = detail.hourlyDelay.reduce((s, h) => s + h.delay, 0) / detail.hourlyDelay.length;
  const efficiencyScore = Math.max(0, Math.round(route.onTimeRate - (route.incidents * 5)));
  const scheduledVsActual = detail.segments.map(s => ({
    name: `${s.from.slice(0, 6)}…`,
    scheduled: s.expectedTime,
    actual:    s.actualTime,
    excess:    Math.max(0, s.actualTime - s.expectedTime),
  }));

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/routes" className={styles.breadLink}><ArrowLeft size={13} /> Routes</Link>
        <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
        <span className={styles.breadCurrent}>{route.id} — {route.name}</span>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.routeIcon}>
            <Navigation size={22} />
          </div>
          <div>
            <div className={styles.heroId}>{route.id}</div>
            <div className={styles.heroName}>{route.name}</div>
            <div className={styles.heroSub}>{detail.zone} &nbsp;·&nbsp; {detail.startHub} → {detail.endHub}</div>
            <div className={styles.heroBadges}>
              <Badge label={route.status.charAt(0).toUpperCase() + route.status.slice(1)} {...sc} />
              <span className={styles.heroPill}>
                <Activity size={11} /> {route.vehicles} vehicles
              </span>
              <span className={styles.heroPill}>
                <Clock size={11} /> {route.dailyTrips} trips/day
              </span>
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroStat}><MapPin size={13} /> {route.distance} km</div>
          <div className={styles.heroStat}><Clock size={13} /> Sched. {route.avgDuration} min · Actual {detail.avgActualDuration} min</div>
          <div className={styles.heroStat}><AlertTriangle size={13} /> {route.incidents} incidents this week</div>
          <div className={styles.heroStat} style={{ color: 'var(--text-muted)' }}>Updated {detail.lastUpdated}</div>
        </div>
      </div>

      {/* KPI strip */}
      <div className={styles.kpiRow}>
        {[
          { icon: <TrendingUp size={15} />,   label: 'On-Time Rate',     value: `${route.onTimeRate}%`,              color: route.onTimeRate >= 85 ? 'var(--success)' : route.onTimeRate >= 70 ? 'var(--warning)' : 'var(--danger)' },
          { icon: <Clock size={15} />,        label: 'Avg Delay',        value: `${Math.round(avgDelay)} min`,        color: avgDelay > 15 ? 'var(--danger)' : avgDelay > 8 ? 'var(--warning)' : 'var(--success)' },
          { icon: <AlertTriangle size={15} />,label: 'Weekly Incidents',  value: detail.weeklyIncidents,               color: detail.weeklyIncidents > 8 ? 'var(--danger)' : detail.weeklyIncidents > 3 ? 'var(--warning)' : 'var(--success)' },
          { icon: <Activity size={15} />,     label: 'Efficiency Score',  value: `${efficiencyScore}`,                 color: efficiencyScore >= 80 ? 'var(--success)' : efficiencyScore >= 65 ? 'var(--warning)' : 'var(--danger)' },
          { icon: <Fuel size={15} />,         label: 'Avg Fuel/Trip',    value: `${detail.avgFuelPerTrip} L`,          color: 'var(--text-primary)' },
          { icon: <Truck size={15} />,        label: 'Weekly Trips',     value: detail.weeklyTrips,                   color: 'var(--accent)' },
          { icon: <ShieldAlert size={15} />,  label: 'CO₂ / Trip',       value: `${detail.co2PerTrip} kg`,            color: 'var(--text-secondary)' },
          { icon: <Clock size={15} />,        label: 'Peak Delay Hour',  value: detail.peakDelayHour,                 color: 'var(--warning)' },
        ].map((k, i) => (
          <div key={i} className={styles.kpi}>
            <div className={styles.kpiIcon} style={{ color: k.color as string, background: (k.color as string) + '22' }}>{k.icon}</div>
            <div className={styles.kpiVal} style={{ color: k.color as string }}>{k.value}</div>
            <div className={styles.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabbed content */}
      <div className={styles.tabCard}>
        <TabBar
          tabs={TABS.map(t => ({
            ...t,
            count: t.id === 'trips' ? activeTrips.length : t.id === 'risk' ? detail.riskFactors.length : undefined,
          }))}
          active={tab}
          onChange={id => setTab(id as TabId)}
        />

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className={styles.tabContent}>
            <div className={styles.overviewGrid}>
              {/* Description */}
              <Card title="Route Description">
                <div className={styles.descBlock}>
                  <p className={styles.descText}>{detail.description}</p>
                  <div className={styles.descMeta}>
                    <div className={styles.descMetaRow}><span>Zone</span><span>{detail.zone}</span></div>
                    <div className={styles.descMetaRow}><span>Start Hub</span><span>{detail.startHub}</span></div>
                    <div className={styles.descMetaRow}><span>End Hub</span><span>{detail.endHub}</span></div>
                    <div className={styles.descMetaRow}><span>Distance</span><span>{route.distance} km</span></div>
                    <div className={styles.descMetaRow}><span>Scheduled Duration</span><span>{route.avgDuration} min</span></div>
                    <div className={styles.descMetaRow}><span>Avg Actual Duration</span>
                      <span style={{ color: detail.avgActualDuration > route.avgDuration ? 'var(--danger)' : 'var(--success)' }}>
                        {detail.avgActualDuration} min
                      </span>
                    </div>
                    <div className={styles.descMetaRow}><span>Status</span><Badge label={route.status.charAt(0).toUpperCase() + route.status.slice(1)} {...sc} /></div>
                    <div className={styles.descMetaRow}><span>Trend</span>
                      <span style={{ color: route.trend === 'up' ? 'var(--success)' : route.trend === 'down' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {route.trend === 'up' ? '↑' : route.trend === 'down' ? '↓' : '→'} {route.trend}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Waypoints */}
              <Card title="Route Waypoints & Schedule">
                <div className={styles.waypointsWrap}>
                  {detail.waypoints.map((wp, i) => {
                    const tc = trafficColor[wp.trafficLevel];
                    return (
                      <div key={wp.seq} className={styles.waypointRow}>
                        <div className={styles.waypointLine}>
                          <div className={styles.waypointDot} style={{ background: tc.color }} />
                          {i < detail.waypoints.length - 1 && <div className={styles.waypointConnector} />}
                        </div>
                        <div className={styles.waypointBody}>
                          <div className={styles.waypointHeader}>
                            <span className={styles.waypointName}>
                              {waypointTypeIcon[wp.type]} {wp.name}
                            </span>
                            <Badge label={tc.label} color={tc.color} bg={tc.bg} />
                          </div>
                          <div className={styles.waypointMeta}>
                            <span>Sched: <strong>{wp.scheduledTime}</strong></span>
                            {wp.actualTime && <span>Actual: <strong style={{ color: wp.delay > 0 ? 'var(--danger)' : 'var(--success)' }}>{wp.actualTime}</strong></span>}
                            {wp.delay > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>+{wp.delay} min</span>}
                            {wp.delay === 0 && wp.actualTime && <span style={{ color: 'var(--success)' }}>On time</span>}
                            <span className={styles.waypointDist}>{wp.distFromStart} km from start</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Segments */}
              <Card title="Segment Analysis — Expected vs Actual">
                <StatRow
                  stats={detail.segments.map(s => ({
                    label: `${s.from.slice(0, 8)}… → ${s.to.slice(0, 8)}…`,
                    value: `${s.expectedTime}→${s.actualTime} min`,
                    color: s.actualTime > s.expectedTime * 1.2 ? 'var(--danger)' : s.actualTime > s.expectedTime * 1.05 ? 'var(--warning)' : 'var(--success)',
                  }))}
                  columns={detail.segments.length}
                />
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={scheduledVsActual} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                      <Bar dataKey="scheduled" name="Expected (min)" fill="var(--accent)"  radius={[3, 3, 0, 0]} />
                      <Bar dataKey="actual"    name="Actual (min)"   fill="var(--danger)"  radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Active vehicles */}
              <Card title="Active Vehicles on Route">
                {activeVehicles.length === 0 ? (
                  <div className={styles.empty}>No active vehicles on this route.</div>
                ) : (
                  <div className={styles.vehicleList}>
                    {activeVehicles.map(v => {
                      const rb = riskBadge(v.risk);
                      return (
                        <div key={v.id} className={styles.vehicleRow} onClick={() => navigate(`/fleet/${v.id}`)}>
                          <div className={styles.vehicleAvatar}>{v.driver.split(' ').map(n => n[0]).join('')}</div>
                          <div className={styles.vehicleInfo}>
                            <div className={styles.vehiclePlate}>{v.plate}</div>
                            <div className={styles.vehicleDriver}>{v.driver}</div>
                          </div>
                          <div className={styles.vehicleStats}>
                            <Badge {...rb} />
                            <span className={styles.vehicleSpeed}>{v.speed > 0 ? `${v.speed} mph` : 'Stopped'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── Performance tab ── */}
        {tab === 'performance' && (
          <div className={styles.tabContent}>
            <StatRow
              stats={[
                { label: 'On-Time Rate',      value: `${route.onTimeRate}%`,           color: route.onTimeRate >= 85 ? 'var(--success)' : 'var(--warning)' },
                { label: 'Weekly Trips',      value: detail.weeklyTrips                 },
                { label: 'Weekly Incidents',  value: detail.weeklyIncidents,            color: detail.weeklyIncidents > 5 ? 'var(--danger)' : 'var(--text-primary)' },
                { label: 'Avg Fuel / Trip',   value: `${detail.avgFuelPerTrip} L`       },
                { label: 'CO₂ / Trip',        value: `${detail.co2PerTrip} kg`          },
                { label: 'Efficiency Score',  value: efficiencyScore,                   color: efficiencyScore >= 80 ? 'var(--success)' : 'var(--warning)' },
              ]}
              columns={6}
            />

            <div className={styles.perfCharts}>
              <Card title="Hourly Delay Profile (minutes)">
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={detail.hourlyDelay} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                      <defs>
                        <linearGradient id="delayGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--danger)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Area type="monotone" dataKey="delay" name="Avg Delay (min)" stroke="var(--danger)" fill="url(#delayGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Hourly On-Time Rate (%)">
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={detail.hourlyDelay} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Line type="monotone" dataKey="onTime" name="On-Time %" stroke="var(--success)" strokeWidth={2} dot={{ r: 3, fill: 'var(--success)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card title="Weekly On-Time Rate & Trip Volume">
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={detail.weeklyOnTime} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                    <Bar dataKey="onTime" name="On-Time %" fill="var(--accent)"  radius={[3, 3, 0, 0]} />
                    <Bar dataKey="trips"  name="Trips"    fill="var(--purple)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── Active Trips tab ── */}
        {tab === 'trips' && (
          <div className={styles.tabContent}>
            {activeTrips.length === 0 ? (
              <div className={styles.empty}>No active trips on this route right now.</div>
            ) : (
              <div className={styles.tripsTableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Trip ID</th>
                      <th>Driver / Vehicle</th>
                      <th>Origin → Dest.</th>
                      <th>Status</th>
                      <th>Risk</th>
                      <th>Start</th>
                      <th>ETA</th>
                      <th>Dist.</th>
                      <th>Delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTrips.map(t => {
                      const ts = tripStatusBadge(t.status);
                      const rb = riskBadge(t.risk);
                      return (
                        <tr key={t.id} className={styles.clickable} onClick={() => navigate(`/trips/${t.id}`)}>
                          <td className={styles.tripId}>{t.id}</td>
                          <td>
                            <div className={styles.bold}>{t.driver}</div>
                            <div className={styles.sub}>{t.plate}</div>
                          </td>
                          <td className={styles.muted}>{t.origin} → {t.destination}</td>
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
              </div>
            )}
          </div>
        )}

        {/* ── Risk & Traffic tab ── */}
        {tab === 'risk' && (
          <div className={styles.tabContent}>
            <div className={styles.riskGrid}>
              {/* Risk factors */}
              <Card title="Risk Factors">
                <div className={styles.riskList}>
                  {detail.riskFactors.map((rf, i) => {
                    const rs = riskLevelStyle[rf.level];
                    return (
                      <div key={i} className={styles.riskRow}>
                        <div className={styles.riskDot} style={{ background: rs.color }} />
                        <div className={styles.riskBody}>
                          <div className={styles.riskHeader}>
                            <span className={styles.riskFactor}>{rf.factor}</span>
                            <Badge
                              label={rf.level.charAt(0).toUpperCase() + rf.level.slice(1)}
                              color={rs.color}
                              bg={rs.bg}
                            />
                          </div>
                          <div className={styles.riskDesc}>{rf.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Segment traffic */}
              <Card title="Segment Traffic Levels">
                <div className={styles.segmentList}>
                  {detail.segments.map((s, i) => {
                    const tc = trafficColor[s.trafficLevel];
                    const pct = Math.min(100, Math.round((s.actualTime / s.expectedTime - 1) * 200));
                    return (
                      <div key={i} className={styles.segmentRow}>
                        <div className={styles.segmentRoute}>
                          <span className={styles.segFrom}>{s.from}</span>
                          <span className={styles.segArrow}>→</span>
                          <span className={styles.segTo}>{s.to}</span>
                        </div>
                        <div className={styles.segmentStats}>
                          <Badge label={tc.label} color={tc.color} bg={tc.bg} />
                          <span className={styles.segTime}>
                            <span style={{ color: 'var(--text-muted)' }}>{s.expectedTime} min</span>
                            {' → '}
                            <span style={{ color: s.actualTime > s.expectedTime ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                              {s.actualTime} min
                            </span>
                          </span>
                          {s.incidentCount > 0 && (
                            <span className={styles.segIncident}>
                              <AlertTriangle size={11} /> {s.incidentCount} incident{s.incidentCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className={styles.segDelayBar}>
                          <div className={styles.segDelayFill} style={{ width: `${Math.min(100, pct)}%`, background: tc.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

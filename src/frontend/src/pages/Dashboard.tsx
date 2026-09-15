import {
  Truck, Activity, Clock, ShieldAlert,
  TrendingUp, Fuel, CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import KpiTile from '../components/KpiTile';
import Card from '../components/Card';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import {
  fetchKpi, fetchVehicles, fetchTrips, fetchRoutes,
  fetchMlScores,
} from '../data/api';
import { vehicles as mockVehicles, trips as mockTrips, routes as mockRoutes } from '../data/mockData';
import { useApi } from '../utils/useApi';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useDemoMode } from '../context/DemoModeContext';
import { riskBadge, statusBadge, tripStatusBadge } from '../utils/badges';
import styles from './Dashboard.module.css';

// Static KPI derived from mock data
const mockKpi = {
  totalVehicles:  mockVehicles.length,
  activeVehicles: mockVehicles.filter(v => v.status === 'active').length,
  delayedTrips:   mockTrips.filter(t => t.status === 'delayed').length,
  highRiskTrips:  mockTrips.filter(t => t.risk === 'high' || t.risk === 'critical').length,
  fleetEfficiency: Math.round(mockVehicles.reduce((s, v) => s + v.efficiency, 0) / mockVehicles.length),
  fuelSavings: 0,
  onTimeRate: Math.round(mockRoutes.reduce((s, r) => s + r.onTimeRate, 0) / mockRoutes.length),
  avgTripDuration: 0,
};

export default function Dashboard() {
  const { refreshKey } = useDataRefresh();
  const { demoMode } = useDemoMode();

  const { data: kpiApi,   loading: kpiLoading } = useApi(fetchKpi, refreshKey);
  const { data: vApi,     loading: vLoading }   = useApi(() => fetchVehicles(), refreshKey);
  const { data: tApi,     loading: tLoading }   = useApi(() => fetchTrips({ limit: '20' }), refreshKey);
  const { data: rApi,     loading: rLoading }   = useApi(fetchRoutes, refreshKey);
  const { data: mlScores }                      = useApi(() => fetchMlScores({ entity_type: 'vehicle' }), refreshKey);

  const kpiData = demoMode ? mockKpi      : kpiApi;
  const vehicles = demoMode ? mockVehicles : vApi;
  const trips    = demoMode ? mockTrips    : tApi;
  const routes   = demoMode ? mockRoutes   : rApi;

  const loading = !demoMode && (kpiLoading || vLoading || tLoading || rLoading);
  const noData  = !loading && !kpiData;

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading dashboard…</span>
      </div>
    );
  }

  if (noData) {
    return (
      <div className={styles.page}>
        <EmptyState page="dashboard" />
      </div>
    );
  }

  const recentTrips       = (trips ?? []).slice(0, 6);
  const fleetRiskVehicles = (vehicles ?? [])
    .filter(v => v.risk === 'critical' || v.risk === 'high')
    .slice(0, 6);

  // Efficiency chart: use real route on-time data as time series proxy
  const efficiencyChartData = (routes ?? []).slice(0, 8).map(r => ({
    time: r.id,
    efficiency: r.onTimeRate,
    onTime: r.onTimeRate,
  }));

  return (
    <div className={styles.page}>
      {/* KPI Row */}
      <div className={styles.kpiGrid}>
        <KpiTile
          label="Total Vehicles"
          value={kpiData?.totalVehicles ?? '—'}
          sub="Registered in fleet"
          icon={<Truck size={18} />}
          color="var(--accent)"
        />
        <KpiTile
          label="Active Vehicles"
          value={kpiData?.activeVehicles ?? '—'}
          sub={kpiData ? `${Math.round((kpiData.activeVehicles / kpiData.totalVehicles) * 100)}% of fleet` : '—'}
          icon={<Activity size={18} />}
          color="var(--success)"
        />
        <KpiTile
          label="Delayed Trips"
          value={kpiData?.delayedTrips ?? '—'}
          sub="Require attention"
          icon={<Clock size={18} />}
          color="var(--warning)"
        />
        <KpiTile
          label="High-Risk Trips"
          value={kpiData?.highRiskTrips ?? '—'}
          sub="Require immediate review"
          icon={<ShieldAlert size={18} />}
          color="var(--danger)"
        />
        <KpiTile
          label="Fleet Efficiency"
          value={kpiData ? `${kpiData.fleetEfficiency}%` : '—'}
          sub="Based on route adherence"
          icon={<TrendingUp size={18} />}
          color="var(--purple)"
        />
        <KpiTile
          label="On-Time Rate"
          value={kpiData ? `${kpiData.onTimeRate}%` : '—'}
          sub="Route average"
          icon={<CheckCircle2 size={18} />}
          color="var(--success)"
        />
        <KpiTile
          label="Fuel Savings"
          value="—"
          sub="Upload data to compute"
          icon={<Fuel size={18} />}
          color="var(--accent)"
        />
        <KpiTile
          label="Avg Trip Duration"
          value="—"
          sub="Upload trip data"
          icon={<Clock size={18} />}
          color="var(--text-secondary)"
        />
      </div>

      {/* Row 2: Efficiency chart + Fleet Risk */}
      <div className={styles.row2}>
        <Card title="On-Time Rate by Route" className={styles.chartCard}>
          {efficiencyChartData.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={efficiencyChartData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--accent)"  stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent)"  stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[50, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                  />
                  <Area type="monotone" dataKey="onTime" name="On-Time %" stroke="var(--accent)" fill="url(#effGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No route data yet — upload CSV to see chart" />
          )}
        </Card>

        <Card title="Route Performance" className={styles.routeCard}>
          {(routes ?? []).length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(routes ?? []).slice(0, 6).map(r => ({ name: r.id, onTime: r.onTimeRate, incidents: r.incidents * 10 }))}
                  margin={{ top: 8, right: 16, bottom: 0, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  <Bar dataKey="onTime"    name="On-Time %"      fill="var(--accent)"  radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incidents" name="Incident Score" fill="var(--danger)"  radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No route data yet" />
          )}
        </Card>
      </div>

      {/* Row 3: Fleet Risk Table */}
      <Card title="Fleet Risk Overview" action={
        <span className={styles.seeAll}>High &amp; Critical risk vehicles</span>
      } className={styles.tableCard}>
        {fleetRiskVehicles.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>ML Score</th>
                  <th>Speed</th>
                  <th>Fuel</th>
                </tr>
              </thead>
              <tbody>
                {fleetRiskVehicles.map(v => {
                  const rb = riskBadge(v.risk);
                  const sb = statusBadge(v.status);
                  const ml = (mlScores ?? []).find(s => s.entity_id === v.id);
                  const mlColor = ml ? (
                    ml.risk_level === 'CRITICAL' ? '#ff0050' :
                    ml.risk_level === 'HIGH'     ? 'var(--danger)'  :
                    ml.risk_level === 'MEDIUM'   ? 'var(--warning)' : 'var(--success)'
                  ) : 'var(--text-muted)';
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className={styles.vehicleId}>{v.plate}</div>
                        <div className={styles.vehicleSub}>{v.id}</div>
                      </td>
                      <td className={styles.driver}>{v.driver}</td>
                      <td><Badge {...sb} /></td>
                      <td><Badge {...rb} /></td>
                      <td>
                        {ml ? (
                          <span style={{ color: mlColor, fontWeight: 700, fontSize: 13 }}>
                            {ml.overall_score.toFixed(0)}
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 10, marginLeft: 4 }}>
                              {ml.risk_level}
                            </span>
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ color: v.speed > 70 ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {v.speed} mph
                        </span>
                      </td>
                      <td>
                        <div className={styles.fuelBar}>
                          <div
                            className={styles.fuelFill}
                            style={{
                              width: `${v.fuelLevel}%`,
                              background: v.fuelLevel < 25 ? 'var(--danger)' : v.fuelLevel < 50 ? 'var(--warning)' : 'var(--success)',
                            }}
                          />
                        </div>
                        <span className={styles.fuelPct}>{v.fuelLevel}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No high-risk vehicles — fleet is at low/medium risk" />
        )}
      </Card>

      {/* Row 4: Recent Trips */}
      <Card title="Recent Trips" action={
        <button className={styles.linkBtn}>View all <ChevronRight size={14} /></button>
      }>
        {recentTrips.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Driver / Vehicle</th>
                  <th>Route</th>
                  <th>Origin → Dest.</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>ETA</th>
                  <th>Delay</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map(t => {
                  const ts = tripStatusBadge(t.status);
                  const rb = riskBadge(t.risk);
                  return (
                    <tr key={t.id}>
                      <td className={styles.tripId}>{t.id}</td>
                      <td>
                        <div className={styles.vehicleId}>{t.driver}</div>
                        <div className={styles.vehicleSub}>{t.plate}</div>
                      </td>
                      <td className={styles.muted}>{t.route}</td>
                      <td className={styles.muted}>{t.origin} → {t.destination}</td>
                      <td><Badge {...ts} /></td>
                      <td><Badge {...rb} /></td>
                      <td className={styles.muted}>{t.eta}</td>
                      <td>
                        {t.delay > 0
                          ? <span style={{ color: 'var(--danger)' }}>+{t.delay} min</span>
                          : <span style={{ color: 'var(--success)' }}>On time</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No trip data yet — upload CSV to see recent trips" />
        )}
      </Card>
    </div>
  );
}

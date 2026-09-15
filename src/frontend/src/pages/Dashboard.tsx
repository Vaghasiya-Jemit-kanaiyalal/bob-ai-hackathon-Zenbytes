import {
  Truck, Activity, Clock, ShieldAlert,
  TrendingUp, Fuel, AlertTriangle, CheckCircle2, Info,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import KpiTile from '../components/KpiTile';
import Card from '../components/Card';
import Badge from '../components/Badge';
import {
  kpiData as mockKpi, vehicles as mockVehicles, alerts,
  routes as mockRoutes, trips as mockTrips, efficiencyTrend,
} from '../data/mockData';
import { fetchKpi, fetchVehicles, fetchTrips, fetchRoutes } from '../data/api';
import { useApi } from '../utils/useApi';
import { riskBadge, statusBadge, tripStatusBadge } from '../utils/badges';
import styles from './Dashboard.module.css';

const severityIcon = {
  critical: <ShieldAlert size={15} />,
  warning:  <AlertTriangle size={15} />,
  info:     <Info size={15} />,
};
const severityColor = {
  critical: { color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
  warning:  { color: 'var(--warning)', bg: 'var(--warning-dim)' },
  info:     { color: 'var(--accent)',  bg: 'var(--accent-dim)'  },
};

export default function Dashboard() {
  const { data: kpiData }  = useApi(fetchKpi,                                                  mockKpi);
  const { data: vehicles } = useApi(() => fetchVehicles(),                                     mockVehicles);
  const { data: trips }    = useApi(() => fetchTrips({ limit: '20' }),                         mockTrips);
  const { data: routes }   = useApi(fetchRoutes,                                               mockRoutes);

  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const recentTrips = trips.slice(0, 6);
  const fleetRiskVehicles = vehicles
    .filter(v => v.risk === 'critical' || v.risk === 'high')
    .slice(0, 6);

  return (
    <div className={styles.page}>
      {/* KPI Row */}
      <div className={styles.kpiGrid}>
        <KpiTile
          label="Total Vehicles"
          value={kpiData.totalVehicles}
          sub="Registered in fleet"
          icon={<Truck size={18} />}
          color="var(--accent)"
          trend={{ value: '+3 this week', up: true }}
        />
        <KpiTile
          label="Active Vehicles"
          value={kpiData.activeVehicles}
          sub={`${Math.round(kpiData.activeVehicles / kpiData.totalVehicles * 100)}% of fleet`}
          icon={<Activity size={18} />}
          color="var(--success)"
          trend={{ value: '94 on road', up: true }}
        />
        <KpiTile
          label="Delayed Trips"
          value={kpiData.delayedTrips}
          sub="Avg delay: 24 min"
          icon={<Clock size={18} />}
          color="var(--warning)"
          trend={{ value: '+4 vs yesterday', up: false }}
        />
        <KpiTile
          label="High-Risk Trips"
          value={kpiData.highRiskTrips}
          sub="Require immediate review"
          icon={<ShieldAlert size={18} />}
          color="var(--danger)"
          trend={{ value: '+2 today', up: false }}
        />
        <KpiTile
          label="Fleet Efficiency"
          value={`${kpiData.fleetEfficiency}%`}
          sub="Based on route adherence"
          icon={<TrendingUp size={18} />}
          color="var(--purple)"
          trend={{ value: '+1.2% vs last week', up: true }}
        />
        <KpiTile
          label="On-Time Rate"
          value={`${kpiData.onTimeRate}%`}
          sub="Last 24 hours"
          icon={<CheckCircle2 size={18} />}
          color="var(--success)"
          trend={{ value: '86.7%', up: true }}
        />
        <KpiTile
          label="Fuel Savings"
          value={`${kpiData.fuelSavings}%`}
          sub="vs. baseline avg"
          icon={<Fuel size={18} />}
          color="var(--accent)"
          trend={{ value: '+0.8% this week', up: true }}
        />
        <KpiTile
          label="Avg Trip Duration"
          value={`${kpiData.avgTripDuration}m`}
          sub="Fleet average"
          icon={<Clock size={18} />}
          color="var(--text-secondary)"
          trend={{ value: '-3 min vs avg', up: true }}
        />
      </div>

      {/* Row 2: Efficiency chart + Priority Alerts */}
      <div className={styles.row2}>
        <Card title="Fleet Efficiency & On-Time Rate — Today" className={styles.chartCard}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={efficiencyTrend} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)"  stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)"  stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Area type="monotone" dataKey="efficiency" name="Efficiency %" stroke="var(--accent)"  fill="url(#effGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="onTime"     name="On-Time %"   stroke="var(--success)" fill="url(#otGrad)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Priority Alerts" className={styles.alertsCard}>
          <div className={styles.alertList}>
            {activeAlerts.map(alert => {
              const sc = severityColor[alert.severity];
              return (
                <div key={alert.id} className={styles.alertItem}>
                  <div className={styles.alertIconWrap} style={{ color: sc.color, background: sc.bg }}>
                    {severityIcon[alert.severity]}
                  </div>
                  <div className={styles.alertBody}>
                    <div className={styles.alertTitle}>{alert.title}</div>
                    <div className={styles.alertDesc}>{alert.description}</div>
                    <div className={styles.alertMeta}>{alert.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 3: Fleet Risk Table + Route Performance */}
      <div className={styles.row3}>
        <Card title="Fleet Risk Overview" action={
          <span className={styles.seeAll}>High & Critical risk vehicles</span>
        } className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Speed</th>
                  <th>Fuel</th>
                </tr>
              </thead>
              <tbody>
                {fleetRiskVehicles.map(v => {
                  const rb = riskBadge(v.risk);
                  const sb = statusBadge(v.status);
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className={styles.vehicleId}>{v.plate}</div>
                        <div className={styles.vehicleSub}>{v.id}</div>
                      </td>
                      <td className={styles.driver}>{v.driver}</td>
                      <td className={styles.muted}>{v.route}</td>
                      <td><Badge {...sb} /></td>
                      <td><Badge {...rb} /></td>
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
        </Card>

        <Card title="Route Performance" className={styles.routeCard}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={routes.slice(0, 6).map(r => ({ name: r.id, onTime: r.onTimeRate, incidents: r.incidents * 10 }))}
                margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
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
        </Card>
      </div>

      {/* Row 4: Recent Trips */}
      <Card title="Recent Trips" action={
        <button className={styles.linkBtn}>View all <ChevronRight size={14} /></button>
      }>
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
      </Card>
    </div>
  );
}

import Card from '../components/Card';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  fetchDelayTrend,
  fetchFuelConsumption,
  fetchRiskDistribution,
  fetchVehicleUtilization,
  fetchMlScores,
} from '../data/api';
import {
  delayTrend as mockDelayTrend,
  fuelConsumption as mockFuelConsumption,
  riskDistribution as mockRiskDist,
  vehicleUtilization as mockVehicleUtil,
} from '../data/mockData';
import { useApi } from '../utils/useApi';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useDemoMode } from '../context/DemoModeContext';
import MlScoresPanel from '../components/MlScoresPanel';
import EmptyState from '../components/EmptyState';
import styles from './Analytics.module.css';

// ─── Shared tooltip style ────────────────────────────────────────────────────
const tip = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--text-primary)',
  },
  labelStyle: { color: 'var(--text-secondary)', marginBottom: 4 },
  itemStyle: { padding: '1px 0' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

const legendStyle = { fontSize: 12, color: 'var(--text-secondary)' };

// ─── Donut centre label ───────────────────────────────────────────────────────
function DonutLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" fontSize={26} fontWeight={700}>
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>
        events
      </text>
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
// Shape demo risk distribution to match the API shape
const demoPieData = mockRiskDist.map(d => ({
  event_type: d.name.toLowerCase().replace(/ /g, '_'),
  name:  d.name,
  value: d.value,
  fill:  d.fill,
}));

export default function Analytics() {
  const { refreshKey } = useDataRefresh();
  const { demoMode } = useDemoMode();

  const { data: dtApi,   loading: l1 } = useApi(fetchDelayTrend, refreshKey);
  const { data: fcApi,   loading: l2 } = useApi(fetchFuelConsumption, refreshKey);
  const { data: rdApi,   loading: l3 } = useApi(fetchRiskDistribution, refreshKey);
  const { data: vuApi,   loading: l4 } = useApi(fetchVehicleUtilization, refreshKey);
  const { data: mlApi,   loading: l5 } = useApi(() => fetchMlScores(), refreshKey);

  // In demo mode use mock data directly; otherwise use API data
  const delayTrend        = demoMode ? mockDelayTrend.map(d => ({ date: d.date, route_id: 'demo', avg_delay: (d.R01 + d.R02 + d.R03 + d.R04) / 4 })) : dtApi;
  const fuelConsumption   = demoMode ? mockFuelConsumption : fcApi;
  const vehicleUtilization = demoMode
    ? mockVehicleUtil.map(d => ({ day: d.day, active: d.active, in_progress: d.idle, delayed: d.maintenance }))
    : vuApi;
  const mlScores = demoMode ? null : mlApi;

  const riskDistributionRaw = demoMode ? demoPieData : rdApi;
  const riskDistribution = demoMode
    ? demoPieData
    : (riskDistributionRaw ?? []).map(d => ({
        ...d,
        name: d.event_type,
        fill: d.event_type === 'speeding'        ? 'var(--danger)'   :
              d.event_type === 'hard_braking'    ? 'var(--warning)'  :
              d.event_type === 'sharp_cornering' ? 'var(--purple)'   :
              d.event_type === 'idle_excess'     ? 'var(--accent)'   :
              d.event_type === 'lane_departure'  ? '#f97316' : 'var(--text-muted)',
      }));

  const riskTotal  = riskDistribution.reduce((s, d) => s + d.value, 0);
  const anyLoading = !demoMode && (l1 || l2 || l3 || l4 || l5);
  const hasAnyData = delayTrend?.length || fuelConsumption?.length || mlScores?.length;

  if (anyLoading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading analytics…</span>
      </div>
    );
  }

  // Full-page empty state when nothing has been imported yet (only in live mode)
  if (!demoMode && !hasAnyData) {
    return (
      <div className={styles.page}>
        <EmptyState page="analytics" />
      </div>
    );
  }

  // Compute live KPIs from real data
  const totalFuel     = fuelConsumption?.reduce((s, r) => s + Number(r.consumed ?? 0), 0) ?? 0;
  const avgDelay      = delayTrend?.length
    ? (delayTrend.reduce((s, r) => s + Number(r.avg_delay ?? 0), 0) / delayTrend.length).toFixed(1)
    : '—';
  const criticalCount = mlScores?.filter(s => s.risk_level === 'CRITICAL').length ?? 0;
  const highCount     = mlScores?.filter(s => s.risk_level === 'HIGH').length ?? 0;
  const riskEvents    = riskDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className={styles.page}>

      {/* ── Live KPI strip ─────────────────────────────────────────────────── */}
      <div className={styles.kpiStrip}>
        {[
          { label: 'Total Fuel (7d)',    value: `${totalFuel.toFixed(0)} L`,    color: 'var(--accent)'  },
          { label: 'Avg Delay',         value: `${avgDelay} min`,               color: 'var(--warning)' },
          { label: 'Risk Events (7d)',  value: `${riskEvents}`,                  color: 'var(--danger)'  },
          { label: 'HIGH Risk Entities',value: `${highCount}`,                   color: 'var(--danger)'  },
          { label: 'CRITICAL Entities', value: `${criticalCount}`,               color: '#ff0050'        },
          { label: 'ML Scores Total',   value: `${mlScores?.length ?? 0}`,       color: 'var(--success)' },
        ].map(k => (
          <div key={k.label} className={styles.kpiTile}>
            <span className={styles.kpiValue} style={{ color: k.color }}>{k.value}</span>
            <span className={styles.kpiLabel}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Section label ──────────────────────────────────────────────────── */}
      <div className={styles.sectionLabel}>Delay &amp; Timing</div>

      {/* ── Row 1: Delay trends + On-time rate ────────────────────────────── */}
      <div className={styles.row3_1}>

        {/* 1. Delay trends — multi-line per route */}
        <Card
          title="Delay Trends by Route — Last 30 Days (min)"
          className={styles.span2}
        >
          {delayTrend && delayTrend.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={delayTrend} margin={{ top: 8, right: 20, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" m" />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={legendStyle} />
                  <Line type="monotone" dataKey="avg_delay" name="Avg Delay (min)" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No delay data yet" />}
        </Card>

        {/* 2. Fleet efficiency derived from real fuel + delay data */}
        <Card
          title="Fleet Efficiency by Route — Fuel vs On-Time"
          action={<span className={styles.chipMuted}>From imported data</span>}
        >
          {fuelConsumption && fuelConsumption.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={fuelConsumption.slice(0, 8)}
                  margin={{ top: 8, right: 16, bottom: 0, left: -10 }}
                >
                  <defs>
                    <linearGradient id="gFuel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="consumed" name="Fuel Consumed (L)" fill="var(--accent)"  radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saved"    name="Fuel Saved (L)"    fill="var(--success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No fuel efficiency data yet — import CSV to populate" />}
        </Card>
      </div>

      {/* ── Section label ──────────────────────────────────────────────────── */}
      <div className={styles.sectionLabel}>Fuel &amp; Route</div>

      {/* ── Row 2: Fuel ──────────────────────────────────────────────────────── */}
      <div className={styles.row2}>

        {/* 3. Fuel consumption stacked bar */}
        <Card title="Fuel Consumption — This Week (L)">
          {fuelConsumption && fuelConsumption.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={fuelConsumption} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="consumed" name="Consumed (L)" fill="var(--accent)"  radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No fuel data yet — import CSV to see fuel analytics" />}
        </Card>

        {/* 4. Vehicle utilization */}
        <Card title="Vehicle Utilization by Day (%)">
          {vehicleUtilization && vehicleUtilization.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={vehicleUtilization} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="active"      name="Active"      stackId="a" fill="var(--success)" />
                  <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="var(--warning)" />
                  <Bar dataKey="delayed"     name="Delayed"     stackId="a" fill="var(--danger)"  radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No utilization data yet" />}
        </Card>
      </div>

      {/* ── Section label ──────────────────────────────────────────────────── */}
      <div className={styles.sectionLabel}>Fleet &amp; Risk</div>

      {/* ── Row 3: Risk distribution ─────────────────────────────────────────── */}
      <div className={styles.row2}>
        {/* 6. Risk distribution donut */}
        <Card title="Risk Event Distribution — Last 7 Days">
          {riskDistribution.length > 0 ? (
            <div className={styles.riskWrap}>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={64} outerRadius={96} paddingAngle={3} dataKey="value" labelLine={false}>
                    {riskDistribution.map(entry => (
                      <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                    ))}
                    <DonutLabel cx={0} cy={0} total={riskTotal} />
                  </Pie>
                  <Tooltip contentStyle={tip.contentStyle} labelStyle={tip.labelStyle}
                    formatter={(value, name) => {
                      const v = Number(value);
                      return [`${v} events (${Math.round(v / riskTotal * 100)}%)`, String(name)];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.riskLegend}>
                {riskDistribution.map(d => (
                  <div key={d.name} className={styles.riskLegendItem}>
                    <span className={styles.riskDot} style={{ background: d.fill }} />
                    <span className={styles.riskName}>{d.name}</span>
                    <span className={styles.riskCount}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState message="No risk events in last 7 days" />}
        </Card>

        {/* ML breakdown */}
        <Card title="ML Score Component Breakdown — Vehicles">
          {mlScores && mlScores.length > 0 ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={(mlScores ?? []).filter(s => s.entity_type === 'vehicle').slice(0, 8).map(s => ({
                    id: s.entity_id, Delay: s.delay_score, Fuel: s.fuel_score,
                    Traffic: s.traffic_score, Behaviour: s.behaviour_score, Maintenance: s.maintenance_score,
                  }))}
                  margin={{ top: 8, right: 16, bottom: 0, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="Delay"       fill="var(--warning)" stackId="a" />
                  <Bar dataKey="Fuel"        fill="var(--accent)"  stackId="a" />
                  <Bar dataKey="Traffic"     fill="var(--purple)"  stackId="a" />
                  <Bar dataKey="Behaviour"   fill="var(--danger)"  stackId="a" />
                  <Bar dataKey="Maintenance" fill="#f97316"        stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No ML scores yet — import CSV to run ML analysis" />}
        </Card>
      </div>

      {/* ── Section label ──────────────────────────────────────────────────── */}
      <div className={styles.sectionLabel}>ML Risk Intelligence</div>

      {/* ── ML Scores Table ────────────────────────────────────────────────── */}
      <MlScoresPanel
        scores={mlScores ?? []}
        title="ML Risk Scores — Vehicles &amp; Active Trips"
      />

    </div>
  );
}

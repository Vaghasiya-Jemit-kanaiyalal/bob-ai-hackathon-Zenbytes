import Card from '../components/Card';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  delayTrend,
  fuelConsumption,
  routeEfficiency,
  vehicleUtilization,
  riskDistribution,
  trafficVsDelay,
} from '../data/mockData';
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

// ─── KPI strip ───────────────────────────────────────────────────────────────
const KPI_ITEMS = [
  { label: 'Total Trips Today',      value: '387',   delta: '+12%',  deltaUp: true,  color: 'var(--accent)'  },
  { label: 'Avg Delay per Trip',     value: '8.4 m', delta: '−2.1m', deltaUp: true,  color: 'var(--success)' },
  { label: 'Fuel Efficiency Score',  value: '81.4',  delta: '+3.2',  deltaUp: true,  color: 'var(--purple)'  },
  { label: 'Fleet Utilization',      value: '79 %',  delta: '−1.5%', deltaUp: false, color: 'var(--accent)'  },
  { label: 'Risk Events (7d)',       value: '103',   delta: '−18%',  deltaUp: true,  color: 'var(--warning)' },
  { label: 'Routes Optimized',       value: '5 / 8', delta: '62.5%', deltaUp: true,  color: 'var(--success)' },
] as const;

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

// ─── Route efficiency score colour ───────────────────────────────────────────
function scoreColour(score: number) {
  if (score >= 90) return 'var(--success)';
  if (score >= 80) return 'var(--accent)';
  if (score >= 70) return 'var(--warning)';
  return 'var(--danger)';
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Analytics() {
  const riskTotal = riskDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className={styles.page}>

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className={styles.kpiStrip}>
        {KPI_ITEMS.map(k => (
          <div key={k.label} className={styles.kpiTile}>
            <span className={styles.kpiValue} style={{ color: k.color }}>{k.value}</span>
            <span className={styles.kpiLabel}>{k.label}</span>
            <span className={`${styles.kpiDelta} ${k.deltaUp ? styles.kpiDeltaUp : styles.kpiDeltaDown}`}>
              {k.delta} vs yesterday
            </span>
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
          action={<span className={styles.chipMuted}>Mock · replace with ML forecast</span>}
        >
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={delayTrend} margin={{ top: 8, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  unit=" m"
                />
                <Tooltip {...tip} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="R01" name="Route 01" stroke="var(--accent)"   strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="R02" name="Route 02" stroke="var(--success)"  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="R03" name="Route 03" stroke="var(--purple)"   strokeWidth={2} dot={false} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="R04" name="Route 04" stroke="var(--warning)"  strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 2. On-time + efficiency dual area */}
        <Card
          title="Efficiency &amp; Risk Index — Today Hourly"
          action={<span className={styles.chipMuted}>Live-ready</span>}
        >
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart
                data={[
                  { time: '06:00', efficiency: 78, risk: 12 },
                  { time: '07:00', efficiency: 74, risk: 18 },
                  { time: '08:00', efficiency: 71, risk: 22 },
                  { time: '09:00', efficiency: 76, risk: 19 },
                  { time: '10:00', efficiency: 81, risk: 15 },
                  { time: '11:00', efficiency: 83, risk: 11 },
                  { time: '12:00', efficiency: 79, risk: 14 },
                  { time: '13:00', efficiency: 77, risk: 16 },
                  { time: '14:00', efficiency: 82, risk: 13 },
                  { time: '15:00', efficiency: 85, risk: 10 },
                  { time: '16:00', efficiency: 80, risk: 15 },
                  { time: '17:00', efficiency: 72, risk: 21 },
                ]}
                margin={{ top: 8, right: 16, bottom: 0, left: -10 }}
              >
                <defs>
                  <linearGradient id="gEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--danger)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={legendStyle} />
                <Area type="monotone" dataKey="efficiency" name="Efficiency %" stroke="var(--accent)" fill="url(#gEff)"  strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="risk"       name="Risk Index"  stroke="var(--danger)" fill="url(#gRisk)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Section label ──────────────────────────────────────────────────── */}
      <div className={styles.sectionLabel}>Fuel &amp; Route</div>

      {/* ── Row 2: Fuel + Route efficiency ────────────────────────────────── */}
      <div className={styles.row2}>

        {/* 3. Fuel consumption stacked bar */}
        <Card
          title="Fuel Consumption vs Savings — This Week (L)"
          action={<span className={styles.chipMuted}>Mock · replace with IoT</span>}
        >
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={fuelConsumption} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="consumed" name="Consumed (L)" fill="var(--accent)"  radius={[4, 4, 0, 0]} />
                <Bar dataKey="saved"    name="Saved (L)"    fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 4. Route efficiency — horizontal bar + score badge */}
        <Card
          title="Route Efficiency — Planned vs Actual Distance (km)"
          action={<span className={styles.chipMuted}>Mock · replace with GPS</span>}
        >
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={routeEfficiency}
                layout="vertical"
                margin={{ top: 4, right: 60, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" km" />
                <YAxis type="category" dataKey="route" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={38} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="planned" name="Planned km" fill="var(--accent-dim)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="actual"  name="Actual km"  fill="var(--accent)"     radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Score chips */}
            <div className={styles.scoreGrid}>
              {routeEfficiency.map(r => (
                <div key={r.route} className={styles.scoreChip}>
                  <span className={styles.scoreRouteName}>{r.route}</span>
                  <span className={styles.scoreValue} style={{ color: scoreColour(r.score) }}>
                    {r.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Section label ──────────────────────────────────────────────────── */}
      <div className={styles.sectionLabel}>Fleet &amp; Risk</div>

      {/* ── Row 3: Vehicle utilization + Risk distribution + Traffic vs delay */}
      <div className={styles.row3}>

        {/* 5. Vehicle utilization stacked bar */}
        <Card
          title="Vehicle Utilization by Day (%)"
          action={<span className={styles.chipMuted}>Mock · replace with telematics</span>}
        >
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={vehicleUtilization} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="active"      name="Active"      stackId="a" fill="var(--success)" />
                <Bar dataKey="idle"        name="Idle"        stackId="a" fill="var(--warning)" />
                <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="var(--danger)"  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 6. Risk distribution donut */}
        <Card
          title="Risk Event Distribution — Last 7 Days"
          action={<span className={styles.chipMuted}>Mock · replace with ML classifier</span>}
        >
          <div className={styles.riskWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                >
                  {riskDistribution.map(entry => (
                    <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                  ))}
                  <DonutLabel cx={0} cy={0} total={riskTotal} />
                </Pie>
                <Tooltip
                  contentStyle={tip.contentStyle}
                  labelStyle={tip.labelStyle}
                  formatter={(value, name) => {
                    const v = Number(value);
                    return [`${v} events (${Math.round(v / riskTotal * 100)}%)`, String(name)];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
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
        </Card>

        {/* 7. Traffic vs Delay composed */}
        <Card
          title="Traffic Level vs Avg Delay — Today (24 h)"
          action={<span className={styles.chipMuted}>Mock · replace with traffic API</span>}
        >
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={trafficVsDelay} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--warning)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--warning)" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  interval={3}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  unit="%"
                  domain={[0, 100]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  unit=" m"
                />
                <Tooltip {...tip} />
                <Legend wrapperStyle={legendStyle} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="traffic"
                  name="Traffic %"
                  stroke="var(--warning)"
                  fill="url(#gTraffic)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="delay"
                  name="Avg Delay (min)"
                  stroke="var(--danger)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

    </div>
  );
}

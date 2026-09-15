import Card from '../components/Card';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { efficiencyTrend, fuelConsumption, routePerformance } from '../data/mockData';
import styles from './Analytics.module.css';

const tooltipStyle = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--text-secondary)' },
};

export default function Analytics() {
  return (
    <div className={styles.page}>
      {/* Row 1 */}
      <div className={styles.row}>
        <Card title="Efficiency & Risk Index — Hourly" className={styles.wide}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={efficiencyTrend} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="effA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)"  stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--accent)"  stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="riskA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--danger)"  stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--danger)"  stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Area type="monotone" dataKey="efficiency" name="Efficiency %"  stroke="var(--accent)"  fill="url(#effA)"  strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="risk"       name="Risk Index"    stroke="var(--danger)"  fill="url(#riskA)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="On-Time Rate Trend" className={styles.half}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={efficiencyTrend} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[70, 95]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="onTime" name="On-Time %" stroke="var(--success)" strokeWidth={2} dot={{ r: 3, fill: 'var(--success)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className={styles.row}>
        <Card title="Fuel Consumption vs Savings (Weekly)" className={styles.half}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fuelConsumption} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="consumed" name="Consumed (L)" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saved"    name="Saved (L)"    fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Route On-Time Performance" className={styles.wide}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={routePerformance} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="onTime" name="On-Time %" fill="var(--purple)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Summary Row */}
      <div className={styles.summaryRow}>
        {[
          { label: 'Total Trips Today',    value: '387',   sub: '+12% vs yesterday',    color: 'var(--accent)'  },
          { label: 'Avg Delay per Trip',   value: '8.4m',  sub: '-2.1m improvement',    color: 'var(--success)' },
          { label: 'Fuel Efficiency Score',value: '81.4',  sub: 'Fleet average score',  color: 'var(--purple)'  },
          { label: 'Total Incidents',      value: '18',    sub: 'Last 7 days',          color: 'var(--warning)' },
          { label: 'Critical Events',      value: '3',     sub: 'Require follow-up',    color: 'var(--danger)'  },
          { label: 'Routes Optimized',     value: '5/8',   sub: 'On optimal path',      color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className={styles.summaryTile}>
            <div className={styles.summaryValue} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.summaryLabel}>{s.label}</div>
            <div className={styles.summarySub}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

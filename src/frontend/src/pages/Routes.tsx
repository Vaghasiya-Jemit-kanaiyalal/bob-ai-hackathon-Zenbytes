import Card from '../components/Card';
import Badge from '../components/Badge';
import { routes } from '../data/mockData';
import { routeStatusColor } from '../utils/badges';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import styles from './Routes.module.css';

const trendIcon = (t: string) =>
  t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
const trendColor = (t: string) =>
  t === 'up' ? 'var(--success)' : t === 'down' ? 'var(--danger)' : 'var(--text-muted)';

const radarData = routes.map(r => ({
  name: r.id,
  'On-Time': r.onTimeRate,
  'Utilization': Math.round(r.dailyTrips / 1.1),
  'Safety': 100 - r.incidents * 10,
}));

export default function Routes() {
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <Card title="Route Performance Radar" className={styles.radarCard}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Radar name="On-Time"    dataKey="On-Time"    stroke="var(--accent)"  fill="var(--accent)"  fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Safety"     dataKey="Safety"     stroke="var(--success)" fill="var(--success)" fillOpacity={0.1}  strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Daily Trips by Route" className={styles.barCard}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={routes} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="dailyTrips" name="Daily Trips" fill="var(--purple)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vehicles"   name="Vehicles"    fill="var(--accent)"  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="All Routes">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Route ID</th>
                <th>Name</th>
                <th>Distance</th>
                <th>Avg Duration</th>
                <th>On-Time Rate</th>
                <th>Incidents</th>
                <th>Vehicles</th>
                <th>Daily Trips</th>
                <th>Status</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(r => {
                const sc = routeStatusColor(r.status);
                return (
                  <tr key={r.id}>
                    <td className={styles.routeId}>{r.id}</td>
                    <td className={styles.bold}>{r.name}</td>
                    <td className={styles.muted}>{r.distance} km</td>
                    <td className={styles.muted}>{r.avgDuration} min</td>
                    <td>
                      <div className={styles.onTimeWrap}>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{
                            width: `${r.onTimeRate}%`,
                            background: r.onTimeRate >= 85 ? 'var(--success)' : r.onTimeRate >= 70 ? 'var(--warning)' : 'var(--danger)',
                          }} />
                        </div>
                        <span>{r.onTimeRate}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: r.incidents > 2 ? 'var(--danger)' : r.incidents > 0 ? 'var(--warning)' : 'var(--success)' }}>
                        {r.incidents}
                      </span>
                    </td>
                    <td className={styles.muted}>{r.vehicles}</td>
                    <td className={styles.muted}>{r.dailyTrips}</td>
                    <td>
                      <Badge label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} {...sc} />
                    </td>
                    <td style={{ color: trendColor(r.trend), fontWeight: 600 }}>
                      {trendIcon(r.trend)} {r.trend}
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

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Gauge, Fuel,
  Truck, User, ShieldCheck, Wrench, ChevronRight,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Card from '../components/Card';
import Badge from '../components/Badge';
import TabBar from '../components/TabBar';
import StatRow from '../components/StatRow';
import FuelGauge from '../components/FuelGauge';
import { fetchVehicle } from '../data/api';
import { useApi } from '../utils/useApi';
import { riskBadge, statusBadge, tripStatusBadge } from '../utils/badges';
import styles from './VehicleDetail.module.css';

type TabId = 'overview' | 'trips' | 'fuel' | 'maintenance';

const TABS = [
  { id: 'overview',    label: 'Overview'         },
  { id: 'trips',       label: 'Trip History'      },
  { id: 'fuel',        label: 'Fuel Efficiency'   },
  { id: 'maintenance', label: 'Maintenance'        },
] satisfies { id: TabId; label: string }[];

const maintenanceTypeLabel: Record<string, string> = {
  oil_change:    'Oil Change',
  tire_rotation: 'Tire Rotation',
  brake_service: 'Brake Service',
  engine_check:  'Engine Check',
  full_service:  'Full Service',
  transmission:  'Transmission',
  battery:       'Battery',
  inspection:    'Inspection',
};

const maintenanceStatusStyle: Record<string, { color: string; bg: string }> = {
  completed: { color: 'var(--success)', bg: 'var(--success-dim)' },
  scheduled: { color: 'var(--accent)',  bg: 'var(--accent-dim)'  },
  overdue:   { color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
};

const engineTypeColor: Record<string, string> = {
  Diesel:   'var(--warning)',
  Gasoline: 'var(--text-secondary)',
  Hybrid:   'var(--success)',
  Electric: 'var(--accent)',
};

const tooltipStyle = {
  contentStyle: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-secondary)' },
};

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('overview');
  const { data: vehicle, loading } = useApi(() => fetchVehicle(id!));

  const tripHistory    = [] as unknown[];
  const fuelHistory    = [] as unknown[];
  const maintHistory   = [] as unknown[];

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Loading…</div>;
  }
  if (!vehicle) {
    return (
      <div className={styles.notFound}>
        <Truck size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <div className={styles.notFoundTitle}>Vehicle not found</div>
        <div className={styles.notFoundSub}>No vehicle with ID "{id}" exists.</div>
        <button className={styles.backBtn} onClick={() => navigate('/fleet')}>
          <ArrowLeft size={14} /> Back to Fleet
        </button>
      </div>
    );
  }

  const maintenance    = maintHistory;

  const rb = riskBadge(vehicle.risk);
  const sb = statusBadge(vehicle.status);

  // Trip stats
  const completedTrips  = tripHistory.filter(t => t.status === 'completed').length;
  const delayedTrips    = tripHistory.filter(t => t.status === 'delayed').length;
  const cancelledTrips  = tripHistory.filter(t => t.status === 'cancelled').length;
  const avgDelay        = delayedTrips > 0
    ? Math.round(tripHistory.filter(t => t.delay > 0).reduce((s, t) => s + t.delay, 0) / delayedTrips)
    : 0;
  const totalDistance   = tripHistory.reduce((s, t) => s + t.distance, 0);
  const totalFuelUsed   = tripHistory.reduce((s, t) => s + t.fuelUsed, 0);

  // Fuel stats
  const avgConsumption  = fuelHistory.length
    ? (fuelHistory.reduce((s, r) => s + r.consumption, 0) / fuelHistory.length).toFixed(1)
    : vehicle.avgFuelConsumption;
  const avgEfficiencyScore = fuelHistory.length
    ? Math.round(fuelHistory.reduce((s, r) => s + r.efficiency, 0) / fuelHistory.length)
    : vehicle.efficiency;
  const totalFuelDistance  = fuelHistory.reduce((s, r) => s + r.distance, 0);

  // Maintenance stats
  const totalMaintenanceCost = maintenance
    .filter(m => m.status === 'completed')
    .reduce((s, m) => s + m.cost, 0);
  const scheduledCount = maintenance.filter(m => m.status === 'scheduled').length;
  const overdueCount   = maintenance.filter(m => m.status === 'overdue').length;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/fleet" className={styles.breadLink}>
          <ArrowLeft size={13} /> Fleet
        </Link>
        <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
        <span className={styles.breadCurrent}>{vehicle.plate}</span>
      </div>

      {/* Hero header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.vehicleIcon}>
            <Truck size={24} />
          </div>
          <div>
            <div className={styles.heroPlate}>{vehicle.plate}</div>
            <div className={styles.heroSub}>
              {vehicle.year} {vehicle.make} {vehicle.model} &nbsp;·&nbsp; {vehicle.type} &nbsp;·&nbsp; {vehicle.id}
            </div>
            <div className={styles.heroBadges}>
              <Badge {...sb} />
              <Badge {...rb} />
              <span
                className={styles.engineBadge}
                style={{ color: engineTypeColor[vehicle.engineType], background: engineTypeColor[vehicle.engineType] + '22' }}
              >
                {vehicle.engineType === 'Electric' ? <Zap size={11} /> : null}
                {vehicle.engineType}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroStat}>
            <Gauge size={14} />
            <span>{vehicle.odometer.toLocaleString()} km</span>
          </div>
          <div className={styles.heroStat}>
            <MapPin size={14} />
            <span>{vehicle.location}</span>
          </div>
          <div className={styles.heroStat}>
            <Clock size={14} />
            <span>Updated {vehicle.lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon} style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <TrendingUp size={16} />
          </div>
          <div className={styles.kpiVal}>{vehicle.efficiency > 0 ? `${vehicle.efficiency}%` : '—'}</div>
          <div className={styles.kpiLabel}>Efficiency</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon} style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
            <Fuel size={16} />
          </div>
          <div className={styles.kpiVal}>
            <FuelGauge level={vehicle.fuelLevel} size="sm" showLabel={false} />
            <span style={{ color: vehicle.fuelLevel < 20 ? 'var(--danger)' : vehicle.fuelLevel < 40 ? 'var(--warning)' : 'var(--success)' }}>
              {vehicle.fuelLevel}%
            </span>
          </div>
          <div className={styles.kpiLabel}>Fuel Level</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon} style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>
            <Gauge size={16} />
          </div>
          <div className={styles.kpiVal}>
            {vehicle.speed > 0
              ? <span style={{ color: vehicle.speed > 70 ? 'var(--danger)' : 'var(--text-primary)' }}>{vehicle.speed} mph</span>
              : <span style={{ color: 'var(--text-muted)' }}>Stopped</span>
            }
          </div>
          <div className={styles.kpiLabel}>Current Speed</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon} style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>
            <User size={16} />
          </div>
          <div className={styles.kpiVal}>{vehicle.incidentsTotal}</div>
          <div className={styles.kpiLabel}>Total Incidents</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon} style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <CheckCircle2 size={16} />
          </div>
          <div className={styles.kpiVal}>{vehicle.trips}</div>
          <div className={styles.kpiLabel}>Trips Today</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon} style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
            <Wrench size={16} />
          </div>
          <div className={styles.kpiVal}>{vehicle.lastServiceDate}</div>
          <div className={styles.kpiLabel}>Last Service</div>
        </div>
      </div>

      {/* Tabbed content */}
      <div className={styles.tabCard}>
        <TabBar
          tabs={TABS.map(t => ({
            ...t,
            count:
              t.id === 'trips'       ? tripHistory.length :
              t.id === 'maintenance' ? maintenance.length :
              undefined,
          }))}
          active={tab}
          onChange={id => setTab(id as TabId)}
        />

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className={styles.tabContent}>
            <div className={styles.overviewGrid}>
              {/* Vehicle info */}
              <Card title="Vehicle Information">
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><span>VIN</span><span className={styles.mono}>{vehicle.vin}</span></div>
                  <div className={styles.infoRow}><span>Make / Model</span><span>{vehicle.make} {vehicle.model}</span></div>
                  <div className={styles.infoRow}><span>Year</span><span>{vehicle.year}</span></div>
                  <div className={styles.infoRow}><span>Type</span><span>{vehicle.type}</span></div>
                  <div className={styles.infoRow}>
                    <span>Engine</span>
                    <span style={{ color: engineTypeColor[vehicle.engineType] }}>{vehicle.engineType}</span>
                  </div>
                  <div className={styles.infoRow}><span>Capacity</span><span>{vehicle.capacity.toLocaleString()} kg</span></div>
                  <div className={styles.infoRow}><span>Odometer</span><span>{vehicle.odometer.toLocaleString()} km</span></div>
                  <div className={styles.infoRow}><span>Avg Fuel Use</span><span>{vehicle.avgFuelConsumption} L/100km</span></div>
                </div>
              </Card>

              {/* Driver info */}
              <Card title="Driver Information">
                <div className={styles.driverHero}>
                  <div className={styles.driverAvatarLg}>
                    {vehicle.driver.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className={styles.driverName}>{vehicle.driver}</div>
                    <div className={styles.driverRoute}>{vehicle.route}</div>
                  </div>
                </div>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}><span>Phone</span><span>{vehicle.phone}</span></div>
                  <div className={styles.infoRow}><span>Driver Since</span><span>{vehicle.driverSince}</span></div>
                  <div className={styles.infoRow}>
                    <span>Incidents</span>
                    <span style={{ color: vehicle.incidentsTotal > 5 ? 'var(--danger)' : vehicle.incidentsTotal > 2 ? 'var(--warning)' : 'var(--success)' }}>
                      {vehicle.incidentsTotal} total
                    </span>
                  </div>
                  <div className={styles.infoRow}><span>Trips Today</span><span>{vehicle.trips}</span></div>
                  <div className={styles.infoRow}>
                    <span>Risk Level</span>
                    <Badge {...riskBadge(vehicle.risk)} />
                  </div>
                </div>
              </Card>

              {/* Compliance */}
              <Card title="Compliance & Documents">
                <div className={styles.infoList}>
                  <div className={styles.infoRow}>
                    <span>Insurance Expiry</span>
                    <span style={{ color: vehicle.insuranceExpiry < '2025-04-01' ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {vehicle.insuranceExpiry}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Registration Expiry</span>
                    <span style={{ color: vehicle.registrationExpiry < '2025-04-01' ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {vehicle.registrationExpiry}
                    </span>
                  </div>
                  <div className={styles.infoRow}><span>Last Service</span><span>{vehicle.lastServiceDate}</span></div>
                  <div className={styles.infoRow}><span>Next Service Due</span><span>{vehicle.nextServiceDue}</span></div>
                  <div className={styles.infoRow}><span>Service Odometer</span><span>{vehicle.nextServiceOdometer.toLocaleString()} km</span></div>
                </div>
                <div className={styles.complianceBanner}>
                  <ShieldCheck size={14} />
                  <span>
                    {(vehicle.insuranceExpiry >= '2025-04-01' && vehicle.registrationExpiry >= '2025-04-01')
                      ? 'All compliance documents valid'
                      : 'Action required — documents expiring soon'}
                  </span>
                </div>
              </Card>

              {/* Current status */}
              <Card title="Live Status">
                <div className={styles.liveGrid}>
                  <div className={styles.liveStat}>
                    <div className={styles.liveLabel}>Status</div>
                    <Badge {...statusBadge(vehicle.status)} />
                  </div>
                  <div className={styles.liveStat}>
                    <div className={styles.liveLabel}>Risk</div>
                    <Badge {...riskBadge(vehicle.risk)} />
                  </div>
                  <div className={styles.liveStat}>
                    <div className={styles.liveLabel}>Speed</div>
                    <span className={styles.liveVal} style={{ color: vehicle.speed > 70 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {vehicle.speed > 0 ? `${vehicle.speed} mph` : 'Stopped'}
                    </span>
                  </div>
                  <div className={styles.liveStat}>
                    <div className={styles.liveLabel}>Fuel</div>
                    <span className={styles.liveVal}>{vehicle.fuelLevel}%</span>
                  </div>
                </div>
                <div className={styles.fuelSection}>
                  <div className={styles.fuelSectionLabel}>Fuel Level</div>
                  <FuelGauge level={vehicle.fuelLevel} size="lg" />
                </div>
                <div className={styles.locationWrap}>
                  <MapPin size={13} />
                  <span>{vehicle.location}</span>
                  <span className={styles.locationUpdate}>· {vehicle.lastUpdate}</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── Trip History tab ── */}
        {tab === 'trips' && (
          <div className={styles.tabContent}>
            <StatRow
              stats={[
                { label: 'Total Trips (14d)',  value: tripHistory.length                         },
                { label: 'Completed',          value: completedTrips,  color: 'var(--success)' },
                { label: 'Delayed',            value: delayedTrips,    color: 'var(--danger)'  },
                { label: 'Cancelled',          value: cancelledTrips,  color: 'var(--text-muted)' },
                { label: 'Avg Delay',          value: avgDelay > 0 ? `${avgDelay} min` : '—', color: avgDelay > 15 ? 'var(--danger)' : 'var(--warning)' },
                { label: 'Total Distance',     value: `${totalDistance.toFixed(0)} km`          },
                { label: 'Total Fuel Used',    value: `${totalFuelUsed.toFixed(1)} L`           },
              ]}
              columns={7}
            />
            <div className={styles.tripsTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Date</th>
                    <th>Origin → Destination</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Distance</th>
                    <th>Avg Speed</th>
                    <th>Max Speed</th>
                    <th>Fuel Used</th>
                    <th>Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {tripHistory.map(t => {
                    const ts = tripStatusBadge(t.status);
                    const tr = riskBadge(t.risk);
                    return (
                      <tr key={t.id}>
                        <td className={styles.tripId}>{t.id}</td>
                        <td className={styles.muted}>{t.date}</td>
                        <td>
                          <span className={styles.bold}>{t.origin}</span>
                          <span className={styles.muted}> → {t.destination}</span>
                        </td>
                        <td className={styles.muted}>{t.route}</td>
                        <td><Badge {...ts} /></td>
                        <td><Badge {...tr} /></td>
                        <td className={styles.muted}>{t.startTime}</td>
                        <td className={styles.muted}>{t.endTime}</td>
                        <td className={styles.muted}>{t.duration} min</td>
                        <td className={styles.muted}>{t.distance} km</td>
                        <td className={styles.muted}>{t.avgSpeed} km/h</td>
                        <td>
                          <span style={{ color: t.maxSpeed > 90 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            {t.maxSpeed} km/h
                          </span>
                        </td>
                        <td className={styles.muted}>{t.fuelUsed} L</td>
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
          </div>
        )}

        {/* ── Fuel Efficiency tab ── */}
        {tab === 'fuel' && (
          <div className={styles.tabContent}>
            <StatRow
              stats={[
                { label: 'Avg Consumption (14d)', value: `${avgConsumption} L/100km`                                                                                               },
                { label: 'Efficiency Score',       value: `${avgEfficiencyScore}%`, color: avgEfficiencyScore < 60 ? 'var(--danger)' : avgEfficiencyScore < 75 ? 'var(--warning)' : 'var(--success)' },
                { label: 'Current Fuel',           value: `${vehicle.fuelLevel}%`,  color: vehicle.fuelLevel < 20 ? 'var(--danger)' : vehicle.fuelLevel < 40 ? 'var(--warning)' : 'var(--success)'   },
                { label: 'Total Distance (14d)',   value: `${totalFuelDistance} km`                                                                                                 },
                { label: 'Engine Type',            value: vehicle.engineType, color: engineTypeColor[vehicle.engineType]                                                           },
              ]}
              columns={5}
            />

            <div className={styles.fuelCharts}>
              <Card title="Daily Fuel Consumption (L/100km)">
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={fuelHistory} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                      <defs>
                        <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--warning)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--warning)" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                        tickFormatter={d => d.slice(5)}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Area
                        type="monotone" dataKey="consumption" name="L/100km"
                        stroke="var(--warning)" fill="url(#fuelGrad)" strokeWidth={2} dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Efficiency Score (0–100)">
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={fuelHistory} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                        tickFormatter={d => d.slice(5)}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Line
                        type="monotone" dataKey="efficiency" name="Efficiency Score"
                        stroke="var(--accent)" strokeWidth={2}
                        dot={{ r: 3, fill: 'var(--accent)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card title="Daily Distance & Fuel Used">
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fuelHistory} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickFormatter={d => d.slice(5)}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="distance" name="Distance (km)" fill="var(--accent)"  radius={[3, 3, 0, 0]} />
                    <Bar dataKey="fuelUsed"  name="Fuel Used (L)" fill="var(--warning)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* ── Maintenance tab ── */}
        {tab === 'maintenance' && (
          <div className={styles.tabContent}>
            <StatRow
              stats={[
                { label: 'Total Records',        value: maintenance.length                       },
                { label: 'Completed',            value: maintenance.filter(m => m.status === 'completed').length, color: 'var(--success)' },
                { label: 'Scheduled',            value: scheduledCount, color: 'var(--accent)'   },
                { label: 'Overdue',              value: overdueCount,   color: overdueCount > 0 ? 'var(--danger)' : 'var(--text-muted)'    },
                { label: 'Total Cost (YTD)',      value: `$${totalMaintenanceCost.toLocaleString()}` },
                { label: 'Next Service',          value: vehicle.nextServiceDue                   },
                { label: 'Next Service Odometer', value: `${vehicle.nextServiceOdometer.toLocaleString()} km` },
              ]}
              columns={7}
            />

            <Card title="Maintenance History">
              <div className={styles.maintenanceList}>
                {maintenance.map(m => {
                  const sc = maintenanceStatusStyle[m.status];
                  return (
                    <div key={m.id} className={styles.maintenanceRow}>
                      <div className={styles.maintenanceDate}>
                        <div className={styles.maintenanceDateVal}>{m.date}</div>
                        <div className={styles.maintenanceId}>{m.id}</div>
                      </div>
                      <div className={styles.maintenanceDot} style={{ background: sc.color }} />
                      <div className={styles.maintenanceBody}>
                        <div className={styles.maintenanceHeader}>
                          <span className={styles.maintenanceType}>
                            {maintenanceTypeLabel[m.type] ?? m.type}
                          </span>
                          <Badge
                            label={m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                            color={sc.color}
                            bg={sc.bg}
                          />
                        </div>
                        <div className={styles.maintenanceDesc}>{m.description}</div>
                        <div className={styles.maintenanceMeta}>
                          <span><Wrench size={11} /> {m.technician}</span>
                          <span><MapPin size={11} /> {m.shop}</span>
                          <span><Gauge size={11} /> {m.odometer.toLocaleString()} km</span>
                          {m.status === 'completed' && (
                            <span className={styles.maintenanceCost}>${m.cost}</span>
                          )}
                        </div>
                        {m.notes && (
                          <div className={styles.maintenanceNote}>
                            <AlertTriangle size={11} /> {m.notes}
                          </div>
                        )}
                        {m.status === 'scheduled' && (
                          <div className={styles.maintenanceScheduled}>
                            <Calendar size={11} /> Scheduled for {m.date}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

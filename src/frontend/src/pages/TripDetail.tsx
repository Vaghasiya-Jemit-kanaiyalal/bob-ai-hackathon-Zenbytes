import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, MapPin, Clock, Package, Truck,
  CheckCircle2, AlertTriangle, XCircle, Navigation,
  Fuel, User,
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import StatRow from '../components/StatRow';
import { trips, tripDetails } from '../data/mockData';
import { tripStatusBadge, riskBadge } from '../utils/badges';
import styles from './TripDetail.module.css';

const timelineEventStyle: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  departure:  { color: 'var(--accent)',   bg: 'var(--accent-dim)',   icon: <Truck size={13} />        },
  arrival:    { color: 'var(--success)',  bg: 'var(--success-dim)',  icon: <CheckCircle2 size={13} /> },
  delivery:   { color: 'var(--success)',  bg: 'var(--success-dim)',  icon: <Package size={13} />      },
  delay:      { color: 'var(--warning)',  bg: 'var(--warning-dim)',  icon: <Clock size={13} />        },
  incident:   { color: 'var(--danger)',   bg: 'var(--danger-dim)',   icon: <AlertTriangle size={13} />},
  refuel:     { color: 'var(--purple)',   bg: 'var(--purple-dim)',   icon: <Fuel size={13} />         },
  checkpoint: { color: 'var(--text-muted)', bg: 'var(--bg-hover)',  icon: <MapPin size={13} />       },
};

const deliveryStatusStyle: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  pending:   { color: 'var(--text-muted)', bg: 'var(--bg-hover)',    label: 'Pending',   icon: <Clock size={12} />        },
  delivered: { color: 'var(--success)',    bg: 'var(--success-dim)', label: 'Delivered', icon: <CheckCircle2 size={12} /> },
  failed:    { color: 'var(--danger)',     bg: 'var(--danger-dim)',  label: 'Failed',    icon: <XCircle size={12} />      },
  partial:   { color: 'var(--warning)',    bg: 'var(--warning-dim)', label: 'Partial',   icon: <AlertTriangle size={12} />},
};

export default function TripDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const trip   = trips.find(t => t.id === id);
  const detail = id ? tripDetails[id] : undefined;

  if (!trip || !detail) {
    return (
      <div className={styles.notFound}>
        <Navigation size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <div className={styles.notFoundTitle}>Trip not found</div>
        <div className={styles.notFoundSub}>No trip detail available for ID "{id}".</div>
        <button className={styles.backBtn} onClick={() => navigate('/trips')}>
          <ArrowLeft size={14} /> Back to Trips
        </button>
      </div>
    );
  }

  const ts = tripStatusBadge(trip.status);
  const rb = riskBadge(trip.risk);
  const deliveryPct  = Math.round((detail.deliveredPackages / detail.totalPackages) * 100);
  const progressPct  = detail.actualDistance && detail.scheduledDistance
    ? Math.min(100, Math.round((detail.actualDistance / detail.scheduledDistance) * 100))
    : 0;

  const allDelivered  = detail.stops.every(s => s.status === 'delivered');
  const anyFailed     = detail.stops.some(s => s.status === 'failed');
  const anyPartial    = detail.stops.some(s => s.status === 'partial');
  const totalWeight   = detail.stops.reduce((s, st) => s + st.weight, 0);

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/trips" className={styles.breadLink}><ArrowLeft size={13} /> Trips</Link>
        <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
        <span className={styles.breadCurrent}>{trip.id}</span>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.tripIcon} style={{ background: ts.bg, color: ts.color }}>
            <Truck size={22} />
          </div>
          <div>
            <div className={styles.heroId}>{trip.id}</div>
            <div className={styles.heroRoute}>{detail.routeName} &nbsp;·&nbsp; {trip.origin} → {trip.destination}</div>
            <div className={styles.heroMeta}>{detail.date} &nbsp;·&nbsp; Depart {trip.startTime}{detail.endTime ? ` · Arrived ${detail.endTime}` : ''}</div>
            <div className={styles.heroBadges}>
              <Badge {...ts} />
              <Badge {...rb} />
              {allDelivered && <Badge label="All Delivered" color="var(--success)" bg="var(--success-dim)" />}
              {anyFailed    && <Badge label="Failed Stops"  color="var(--danger)"  bg="var(--danger-dim)"  />}
              {anyPartial   && <Badge label="Partial"       color="var(--warning)" bg="var(--warning-dim)" />}
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroStat}><Truck size={13} /> {detail.plate} — {detail.vehicleId}</div>
          <div className={styles.heroStat}><User size={13} /> {detail.driver}</div>
          <div className={styles.heroStat}><Navigation size={13} />
            <Link to={`/routes/${detail.routeId}`} className={styles.routeLink}>
              {detail.routeId} — {detail.routeName}
            </Link>
          </div>
          <div className={styles.heroStat}><Package size={13} /> {detail.totalPackages} packages · {totalWeight} kg</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div className={styles.progressLabel}>
            Trip Progress — {detail.actualDistance?.toFixed(1) ?? '0'} / {detail.scheduledDistance} km
          </div>
          <div className={styles.progressRight}>
            {trip.delay > 0
              ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>+{trip.delay} min delay</span>
              : <span style={{ color: 'var(--success)', fontWeight: 600 }}>On time</span>
            }
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progressPct}%`,
              background: trip.status === 'completed' ? 'var(--success)' : trip.delay > 0 ? 'var(--warning)' : 'var(--accent)',
            }}
          />
        </div>
        <div className={styles.progressStops}>
          {detail.stops.map(stop => {
            const ds = deliveryStatusStyle[stop.status];
            const pct = (stop.seq / detail.stops.length) * 100;
            return (
              <div key={stop.seq} className={styles.progressStop} style={{ left: `${pct}%` }}>
                <div className={styles.stopMarker} style={{ background: ds.color }} />
                <div className={styles.stopLabel}>{stop.seq}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <StatRow
        stats={[
          { label: 'Packages Total',    value: detail.totalPackages                                              },
          { label: 'Delivered',         value: detail.deliveredPackages, color: 'var(--success)'                },
          { label: 'Delivery Rate',     value: `${deliveryPct}%`,        color: deliveryPct === 100 ? 'var(--success)' : deliveryPct > 50 ? 'var(--warning)' : 'var(--danger)' },
          { label: 'Failed',            value: detail.failedPackages,    color: detail.failedPackages > 0 ? 'var(--danger)' : 'var(--text-muted)' },
          { label: 'Total Weight',      value: `${totalWeight} kg`                                               },
          { label: 'Avg Speed',         value: `${detail.avgSpeed} km/h`                                         },
          { label: 'Max Speed',         value: `${detail.maxSpeed} km/h`, color: detail.maxSpeed > 90 ? 'var(--danger)' : 'var(--text-primary)' },
          { label: 'Idle Time',         value: `${detail.idleTime} min`,  color: detail.idleTime > 20 ? 'var(--warning)' : 'var(--text-primary)' },
          { label: 'Fuel Used',         value: `${detail.fuelUsed} L`                                            },
          { label: 'Sched. Duration',   value: `${detail.scheduledDuration} min`                                 },
        ]}
        columns={10}
      />

      {/* Two-column: Delivery stops + Timeline */}
      <div className={styles.mainGrid}>
        {/* Delivery stops */}
        <Card title={`Delivery Stops (${detail.stops.length})`}>
          <div className={styles.stopsList}>
            {detail.stops.map(stop => {
              const ds = deliveryStatusStyle[stop.status];
              return (
                <div key={stop.seq} className={styles.stopRow}>
                  <div className={styles.stopSeq} style={{ background: ds.bg, color: ds.color }}>
                    {stop.seq}
                  </div>
                  <div className={styles.stopBody}>
                    <div className={styles.stopHeader}>
                      <span className={styles.stopAddress}>{stop.address}</span>
                      <Badge label={ds.label} color={ds.color} bg={ds.bg} />
                    </div>
                    <div className={styles.stopRecipient}>{stop.recipient}</div>
                    <div className={styles.stopMeta}>
                      <span><Package size={11} /> {stop.packages} pkg · {stop.weight} kg</span>
                      <span><Clock size={11} /> Sched: {stop.scheduledTime}</span>
                      {stop.actualTime && (
                        <span style={{ color: stop.delay > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          Actual: {stop.actualTime}{stop.delay > 0 ? ` (+${stop.delay} min)` : ''}
                        </span>
                      )}
                      {stop.proofOfDelivery && (
                        <span style={{ color: 'var(--success)' }}>
                          <CheckCircle2 size={11} /> Proof captured
                        </span>
                      )}
                    </div>
                    {stop.notes && (
                      <div className={styles.stopNote}>
                        <AlertTriangle size={11} /> {stop.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Timeline */}
        <Card title="Trip Timeline">
          <div className={styles.timeline}>
            {detail.timeline.map((ev, i) => {
              const es = timelineEventStyle[ev.type];
              return (
                <div key={i} className={styles.timelineRow}>
                  <div className={styles.timelineLeft}>
                    <div className={styles.timelineTime}>{ev.time}</div>
                  </div>
                  <div className={styles.timelineLine}>
                    <div className={styles.timelineIcon} style={{ color: es.color, background: es.bg }}>
                      {es.icon}
                    </div>
                    {i < detail.timeline.length - 1 && <div className={styles.timelineConnector} />}
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>{ev.title}</div>
                    <div className={styles.timelineDesc}>{ev.description}</div>
                    {ev.location && (
                      <div className={styles.timelineLoc}>
                        <MapPin size={11} /> {ev.location}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Vehicle & driver quick link */}
      <Card title="Vehicle & Driver">
        <div className={styles.vehicleQuick}>
          <div className={styles.vehicleQuickLeft}>
            <div className={styles.vehicleAvatar}>{detail.driver.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <div className={styles.vehicleName}>{detail.driver}</div>
              <div className={styles.vehiclePlate}>{detail.plate} · {detail.vehicleId}</div>
            </div>
          </div>
          <button className={styles.vehicleLink} onClick={() => navigate(`/fleet/${detail.vehicleId}`)}>
            <Truck size={13} /> View Vehicle Details
          </button>
        </div>
      </Card>
    </div>
  );
}

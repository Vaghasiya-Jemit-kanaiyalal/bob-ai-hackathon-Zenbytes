import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, MapPin, Clock, Package, Truck,
  CheckCircle2, AlertTriangle, XCircle, Navigation,
  Fuel, User,
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import StatRow from '../components/StatRow';
import { fetchTrips } from '../data/api';
import { useApi } from '../utils/useApi';
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
  const { data: tripsData, loading } = useApi(() => fetchTrips({ limit: '200' }));
  const trip = tripsData?.find(t => t.id === id);
  const detail = undefined; // detailed delivery stops not available from DB yet

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (!trip) {
    return (
      <div className={styles.notFound}>
        <Navigation size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <div className={styles.notFoundTitle}>Trip not found</div>
        <div className={styles.notFoundSub}>No trip found for ID "{id}". It may have been imported with a different ID.</div>
        <button className={styles.backBtn} onClick={() => navigate('/trips')}>
          <ArrowLeft size={14} /> Back to Trips
        </button>
      </div>
    );
  }

  const ts = tripStatusBadge(trip.status);
  const rb = riskBadge(trip.risk);

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
            <div className={styles.heroRoute}>{trip.route} &nbsp;·&nbsp; {trip.origin} → {trip.destination}</div>
            <div className={styles.heroMeta}>{trip.date} &nbsp;·&nbsp; Depart {trip.startTime}</div>
            <div className={styles.heroBadges}>
              <Badge {...ts} />
              <Badge {...rb} />
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroStat}><Truck size={13} /> {trip.plate} — {trip.vehicleId}</div>
          <div className={styles.heroStat}><User size={13} /> {trip.driver}</div>
          <div className={styles.heroStat}><Navigation size={13} />
            <span>{trip.route}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div className={styles.progressLabel}>
            Trip Distance — {trip.distance} km · ETA {trip.eta}
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
              width: trip.status === 'completed' ? '100%' : trip.status === 'in-progress' ? '60%' : '40%',
              background: trip.status === 'completed' ? 'var(--success)' : trip.delay > 0 ? 'var(--warning)' : 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <StatRow
        stats={[
          { label: 'Distance',      value: `${trip.distance} km`                               },
          { label: 'Duration',      value: `${trip.duration ?? '—'} min`                       },
          { label: 'Fuel Used',     value: trip.fuelUsed != null ? `${trip.fuelUsed} L` : '—'  },
          { label: 'Delay',         value: trip.delay > 0 ? `+${trip.delay} min` : 'On time',
            color: trip.delay > 0 ? 'var(--danger)' : 'var(--success)'                         },
          { label: 'Vehicle',       value: trip.plate                                           },
          { label: 'Driver',        value: trip.driver                                          },
          { label: 'Route',         value: trip.route                                           },
          { label: 'Date',          value: trip.date ?? '—'                                     },
        ]}
        columns={8}
      />

      {/* Vehicle & driver quick link */}
      <Card title="Vehicle & Driver">
        <div className={styles.vehicleQuick}>
          <div className={styles.vehicleQuickLeft}>
            <div className={styles.vehicleAvatar}>{trip.driver.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <div className={styles.vehicleName}>{trip.driver}</div>
              <div className={styles.vehiclePlate}>{trip.plate} · {trip.vehicleId}</div>
            </div>
          </div>
          <button className={styles.vehicleLink} onClick={() => navigate(`/fleet/${trip.vehicleId}`)}>
            <Truck size={13} /> View Vehicle Details
          </button>
        </div>
      </Card>
    </div>
  );
}

import type { RiskLevel, VehicleStatus, TripStatus } from '../data/mockData';

export function riskBadge(risk: RiskLevel) {
  const map: Record<RiskLevel, { label: string; color: string; bg: string }> = {
    low:      { label: 'Low',      color: 'var(--success)', bg: 'var(--success-dim)' },
    medium:   { label: 'Medium',   color: 'var(--warning)', bg: 'var(--warning-dim)' },
    high:     { label: 'High',     color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
    critical: { label: 'Critical', color: '#ff6b6b',        bg: '#500'               },
  };
  return map[risk];
}

export function statusBadge(status: VehicleStatus) {
  const map: Record<VehicleStatus, { label: string; color: string; bg: string }> = {
    active:      { label: 'Active',      color: 'var(--success)', bg: 'var(--success-dim)' },
    idle:        { label: 'Idle',        color: 'var(--warning)', bg: 'var(--warning-dim)' },
    maintenance: { label: 'Maintenance', color: 'var(--purple)',  bg: 'var(--purple-dim)'  },
    offline:     { label: 'Offline',     color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
  };
  return map[status];
}

export function tripStatusBadge(status: TripStatus) {
  const map: Record<TripStatus, { label: string; color: string; bg: string }> = {
    completed:    { label: 'Completed',    color: 'var(--success)', bg: 'var(--success-dim)' },
    'in-progress':{ label: 'In Progress',  color: 'var(--accent)',  bg: 'var(--accent-dim)'  },
    delayed:      { label: 'Delayed',      color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
    cancelled:    { label: 'Cancelled',    color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
  };
  return map[status];
}

export function routeStatusColor(status: string) {
  if (status === 'optimal')   return { color: 'var(--success)', bg: 'var(--success-dim)' };
  if (status === 'congested') return { color: 'var(--warning)', bg: 'var(--warning-dim)' };
  return { color: 'var(--danger)', bg: 'var(--danger-dim)' };
}

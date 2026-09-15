import type { ReactNode } from 'react';
import styles from './KpiTile.module.css';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  color?: string;
  trend?: { value: string; up: boolean };
}

export default function KpiTile({ label, value, sub, icon, color = 'var(--accent)', trend }: Props) {
  return (
    <div className={styles.tile}>
      <div className={styles.top}>
        <div className={styles.iconWrap} style={{ background: color + '22', color }}>
          {icon}
        </div>
        {trend && (
          <span className={styles.trend} style={{ color: trend.up ? 'var(--success)' : 'var(--danger)' }}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}

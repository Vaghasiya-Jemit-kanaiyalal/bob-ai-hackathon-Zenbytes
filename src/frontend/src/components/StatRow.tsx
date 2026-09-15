import styles from './StatRow.module.css';

export interface StatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface Props {
  stats: StatItem[];
  columns?: number;
}

export default function StatRow({ stats, columns = 4 }: Props) {
  return (
    <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {stats.map((s, i) => (
        <div key={i} className={styles.stat}>
          <div className={styles.value} style={s.color ? { color: s.color } : undefined}>
            {s.value}
          </div>
          <div className={styles.label}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

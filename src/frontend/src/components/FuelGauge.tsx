import styles from './FuelGauge.module.css';

interface Props {
  level: number;   // 0–100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function FuelGauge({ level, size = 'md', showLabel = true }: Props) {
  const color =
    level < 20 ? 'var(--danger)'  :
    level < 40 ? 'var(--warning)' :
    'var(--success)';

  const heightMap = { sm: 6, md: 10, lg: 14 };
  const h = heightMap[size];

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        style={{ height: h, borderRadius: h / 2 }}
      >
        <div
          className={styles.fill}
          style={{ width: `${level}%`, background: color, borderRadius: h / 2 }}
        />
      </div>
      {showLabel && (
        <span className={styles.label} style={{ color }}>
          {level}%
        </span>
      )}
    </div>
  );
}

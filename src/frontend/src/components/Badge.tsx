import styles from './Badge.module.css';

interface Props {
  label: string;
  color: string;
  bg: string;
}

export default function Badge({ label, color, bg }: Props) {
  return (
    <span className={styles.badge} style={{ color, background: bg }}>
      {label}
    </span>
  );
}

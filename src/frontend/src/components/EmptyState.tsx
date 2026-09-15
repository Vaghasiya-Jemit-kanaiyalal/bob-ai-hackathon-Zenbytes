import { Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';

interface Props {
  message?: string;
}

export default function EmptyState({ message = 'No fleet data available — upload CSV to begin' }: Props) {
  return (
    <div className={styles.wrap}>
      <Database size={40} className={styles.icon} />
      <h3 className={styles.title}>{message}</h3>
      <p className={styles.sub}>
        Import your fleet data via the Data Center to populate this page with real analytics.
      </p>
      <Link to="/data-center" className={styles.btn}>
        Go to Data Center →
      </Link>
    </div>
  );
}

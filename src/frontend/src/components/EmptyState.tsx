import { Database, Upload, BarChart3, Truck, Route, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';

type PageHint = 'dashboard' | 'fleet' | 'routes' | 'trips' | 'analytics' | 'copilot' | 'generic';

interface Props {
  message?: string;
  page?: PageHint;
}

const pageConfig: Record<PageHint, {
  icon: React.ReactNode;
  title: string;
  desc: string;
  samples: { label: string; what: string }[];
}> = {
  dashboard: {
    icon: <BarChart3 size={44} />,
    title: 'Your dashboard is empty',
    desc: 'Upload fleet CSV data to see KPIs, risk scores, route performance, and live trip analytics.',
    samples: [
      { label: 'KPI tiles', what: 'Total vehicles, active trips, delays, efficiency' },
      { label: 'Risk overview', what: 'High & critical vehicles with ML scores' },
      { label: 'Recent trips', what: 'Live trip status, ETA, delay flags' },
    ],
  },
  fleet: {
    icon: <Truck size={44} />,
    title: 'No vehicles in the fleet yet',
    desc: 'Import your CSV to register vehicles and see real-time status, fuel levels, and risk badges.',
    samples: [
      { label: 'Vehicle cards', what: 'Status, fuel, efficiency, driver info' },
      { label: 'Risk badges', what: 'LOW / MEDIUM / HIGH / CRITICAL per vehicle' },
      { label: 'ML scores', what: 'Delay, fuel, behaviour, maintenance scores' },
    ],
  },
  routes: {
    icon: <Route size={44} />,
    title: 'No routes discovered yet',
    desc: 'Routes are auto-created from the route names in your CSV. Import data to populate this page.',
    samples: [
      { label: 'On-time rates', what: 'Per-route % performance vs targets' },
      { label: 'Incident counts', what: 'Safety events mapped to routes' },
      { label: 'Trend arrows', what: 'Improving / declining / stable status' },
    ],
  },
  trips: {
    icon: <Navigation size={44} />,
    title: 'No trips recorded yet',
    desc: 'Each row in your CSV becomes a trip. Import data to track delays, fuel used, and risk per trip.',
    samples: [
      { label: 'Trip status', what: 'Completed, in-progress, delayed, cancelled' },
      { label: 'Delay tracking', what: 'Minutes late vs scheduled ETA' },
      { label: 'Risk levels', what: 'Per-trip ML risk assessment' },
    ],
  },
  analytics: {
    icon: <BarChart3 size={44} />,
    title: 'No analytics data yet',
    desc: 'Import fleet data to generate delay trends, fuel consumption charts, risk distributions, and ML scores.',
    samples: [
      { label: 'Delay trends', what: '30-day avg delay per route' },
      { label: 'Fuel chart', what: 'Weekly consumption by vehicle' },
      { label: 'ML risk scores', what: 'Trip & vehicle risk breakdown' },
    ],
  },
  copilot: {
    icon: <Database size={44} />,
    title: 'Bob needs data to answer',
    desc: 'Import fleet data first — Bob queries your real MySQL database to answer fleet questions.',
    samples: [
      { label: 'Risk queries', what: '"Which vehicles are at highest risk?"' },
      { label: 'Delay analysis', what: '"Show me all delayed trips today"' },
      { label: 'Fuel insights', what: '"Which route uses the most fuel?"' },
    ],
  },
  generic: {
    icon: <Database size={44} />,
    title: 'No fleet data available',
    desc: 'Upload a CSV file via the Data Center to populate this section with real data.',
    samples: [],
  },
};

export default function EmptyState({ message, page = 'generic' }: Props) {
  const cfg = pageConfig[page];

  return (
    <div className={styles.wrap}>
      <div className={styles.iconWrap}>
        {cfg.icon}
      </div>

      <h3 className={styles.title}>{message ?? cfg.title}</h3>
      <p className={styles.desc}>{cfg.desc}</p>

      {cfg.samples.length > 0 && (
        <div className={styles.previews}>
          {cfg.samples.map((s, i) => (
            <div key={i} className={styles.previewChip}>
              <span className={styles.chipLabel}>{s.label}</span>
              <span className={styles.chipWhat}>{s.what}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <Link to="/data-center" className={styles.primaryBtn}>
          <Upload size={14} />
          Upload Fleet CSV
        </Link>
        <Link to="/data-center#samples" className={styles.secondaryBtn}>
          Download sample datasets →
        </Link>
      </div>
    </div>
  );
}

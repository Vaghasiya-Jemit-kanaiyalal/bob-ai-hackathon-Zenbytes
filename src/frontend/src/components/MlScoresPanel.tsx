import styles from './MlScoresPanel.module.css';
import type { MlScoreResult } from '../data/api';

interface Props {
  scores: MlScoreResult[];
  title?: string;
}

const RISK_COLOR: Record<string, string> = {
  LOW:      'var(--success)',
  MEDIUM:   'var(--warning)',
  HIGH:     'var(--danger)',
  CRITICAL: '#ff0050',
};

const SCORE_BARS = [
  { key: 'delay_score',       label: 'Delay',       color: 'var(--warning)' },
  { key: 'fuel_score',        label: 'Fuel',         color: 'var(--accent)'  },
  { key: 'traffic_score',     label: 'Traffic',      color: 'var(--purple)'  },
  { key: 'behaviour_score',   label: 'Behaviour',    color: 'var(--danger)'  },
  { key: 'maintenance_score', label: 'Maintenance',  color: '#f97316'        },
] as const;

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className={styles.barWrap}>
      <div
        className={styles.barFill}
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

export default function MlScoresPanel({ scores, title = 'ML Risk Scores' }: Props) {
  const sorted = [...scores].sort((a, b) => b.overall_score - a.overall_score);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <span className={styles.chip}>ML · statistical scoring</span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Entity</th>
              <th>Risk</th>
              <th>Overall</th>
              {SCORE_BARS.map(b => <th key={b.key}>{b.label}</th>)}
              <th>Top Factor</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => {
              const factors = Array.isArray(s.risk_factors) ? s.risk_factors : [];
              const topFactor = factors.find(f => f !== 'No significant risk factors detected') ?? factors[0] ?? '—';
              return (
                <tr key={`${s.entity_type}-${s.entity_id}`}>
                  <td>
                    <span className={styles.entityId}>{s.entity_id}</span>
                    <span className={styles.entityType}>{s.entity_type}</span>
                  </td>
                  <td>
                    <span className={styles.riskBadge} style={{ color: RISK_COLOR[s.risk_level], borderColor: RISK_COLOR[s.risk_level] }}>
                      {s.risk_level}
                    </span>
                  </td>
                  <td>
                    <span className={styles.overallScore} style={{ color: RISK_COLOR[s.risk_level] }}>
                      {s.overall_score.toFixed(0)}
                    </span>
                    <ScoreBar value={s.overall_score} color={RISK_COLOR[s.risk_level]} />
                  </td>
                  {SCORE_BARS.map(b => (
                    <td key={b.key}>
                      <span className={styles.scoreVal}>{s[b.key].toFixed(0)}</span>
                      <ScoreBar value={s[b.key]} color={b.color} />
                    </td>
                  ))}
                  <td className={styles.factorCell} title={factors.join(' · ')}>
                    {topFactor.length > 48 ? topFactor.slice(0, 46) + '…' : topFactor}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

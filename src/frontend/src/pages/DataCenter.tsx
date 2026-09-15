import { useState, useRef, useCallback, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Download, RefreshCw, Database, BarChart3, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import styles from './DataCenter.module.css';

const BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvPreviewRow {
  vehicle_id:    string;
  route:         string;
  distance_km:   string;
  expected_time: string;
  actual_time:   string;
  fuel_used:     string;
  traffic:       string;
}

interface ImportResult {
  rows_imported:    number;
  rows_errored:     number;
  validation_errors: string[];
  trips_created:    string[];
  ml_scores:        MlScore[];
  vehicle_ml:       MlScore[];
  fleet_summary:    FleetSummary | null;
}

interface MlScore {
  entity_id:     string;
  entity_type:   string;
  overall_score: number;
  risk_level:    'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors:  string[];
  recommendations: string[];
}

interface FleetSummary {
  total:             number;
  avg_overall_score: number;
  low_count:         number;
  medium_count:      number;
  high_count:        number;
  critical_count:    number;
}

const REQUIRED_COLS = ['vehicle_id', 'route', 'distance_km', 'expected_time', 'actual_time', 'fuel_used', 'traffic'];

// ─── Client-side CSV preview parser ──────────────────────────────────────────

function parseCsvPreview(text: string): { headers: string[]; rows: CsvPreviewRow[]; errors: string[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  const errors: string[] = [];
  const rows: CsvPreviewRow[] = [];

  if (lines.length < 1) return { headers: [], rows, errors: ['Empty file'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
  if (missing.length) {
    errors.push(`Missing required columns: ${missing.join(', ')}`);
    return { headers, rows, errors };
  }

  const idx = (col: string) => headers.indexOf(col);

  for (let i = 1; i < Math.min(lines.length, 101); i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    if (cells.length !== headers.length) {
      errors.push(`Row ${i + 1}: column count mismatch`);
      continue;
    }
    rows.push({
      vehicle_id:    cells[idx('vehicle_id')],
      route:         cells[idx('route')],
      distance_km:   cells[idx('distance_km')],
      expected_time: cells[idx('expected_time')],
      actual_time:   cells[idx('actual_time')],
      fuel_used:     cells[idx('fuel_used')],
      traffic:       cells[idx('traffic')],
    });
  }

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowErrors: string[] = [];
    if (!r.vehicle_id) rowErrors.push('vehicle_id empty');
    if (!r.route)      rowErrors.push('route empty');
    if (isNaN(Number(r.distance_km))  || Number(r.distance_km)  <= 0) rowErrors.push('invalid distance_km');
    if (isNaN(Number(r.expected_time))|| Number(r.expected_time) <= 0) rowErrors.push('invalid expected_time');
    if (isNaN(Number(r.actual_time))  || Number(r.actual_time)   <= 0) rowErrors.push('invalid actual_time');
    if (isNaN(Number(r.fuel_used))    || Number(r.fuel_used)     <  0) rowErrors.push('invalid fuel_used');
    if (!['free','moderate','heavy','standstill'].includes(r.traffic?.toLowerCase() ?? '')) {
      rowErrors.push('traffic must be free/moderate/heavy/standstill');
    }
    if (rowErrors.length) errors.push(`Row ${i + 2}: ${rowErrors.join('; ')}`);
  }

  return { headers, rows, errors };
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function riskColor(level: string) {
  switch (level) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH':     return '#d97706';
    case 'MEDIUM':   return '#1a56db';
    default:         return '#059669';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataCenter() {
  const { token } = useAuth();
  const { triggerRefresh } = useDataRefresh();
  const navigate = useNavigate();

  const [dragging,   setDragging]   = useState(false);
  const [file,       setFile]       = useState<File | null>(null);
  const [csvText,    setCsvText]    = useState('');
  const [preview,    setPreview]    = useState<{ headers: string[]; rows: CsvPreviewRow[]; errors: string[] } | null>(null);
  const [totalLines, setTotalLines] = useState(0);
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState<ImportResult | null>(null);
  const [importErr,  setImportErr]  = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  function processFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      setImportErr('Only CSV files are accepted.');
      return;
    }
    setFile(f);
    setResult(null);
    setImportErr('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setCsvText(text);
      const lines = text.split('\n').filter(l => l.trim());
      setTotalLines(Math.max(0, lines.length - 1)); // exclude header
      setPreview(parseCsvPreview(text));
    };
    reader.readAsText(f);
  }

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function clearFile() {
    setFile(null);
    setCsvText('');
    setPreview(null);
    setTotalLines(0);
    setResult(null);
    setImportErr('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleImport() {
    if (!file || !csvText || !token) return;
    setImporting(true);
    setImportErr('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}/api/import/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json() as { data?: ImportResult; error?: string; errors?: string[] };
      if (!res.ok) {
        const errs = json.errors?.join('\n') ?? json.error ?? 'Import failed';
        setImportErr(errs);
        return;
      }
      setResult(json.data!);
      // Signal all pages to re-fetch their data from the freshly populated DB
      triggerRefresh();
    } catch (err) {
      setImportErr(String(err));
    } finally {
      setImporting(false);
    }
  }

  function downloadSample() {
    window.open(`${BASE_URL}/api/import/sample`, '_blank');
  }

  const hasErrors      = (preview?.errors.length ?? 0) > 0;
  const validRowCount  = preview?.rows.length ?? 0;
  const canImport      = file && validRowCount > 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Database size={22} className={styles.headerIcon} />
          <div>
            <h1 className={styles.pageTitle}>YatraDrishti Data Center</h1>
            <p className={styles.pageDesc}>Upload fleet CSV data to power dashboards, analytics, and ML analysis</p>
          </div>
        </div>
      </div>

      {/* Demo datasets */}
      <div id="samples" className={styles.datasetsRow}>
        <div className={styles.datasetCard} style={{ borderColor: 'var(--success)' }}>
          <div className={styles.datasetBadge} style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
            Medium Level
          </div>
          <div className={styles.datasetTitle}>Mixed Fleet — 30 Trips</div>
          <div className={styles.datasetDesc}>
            10 vehicles · 5 routes · moderate/heavy traffic · avg delay 12 min · ideal for testing normal fleet operations
          </div>
          <div className={styles.datasetStats}>
            <span>30 rows</span><span>·</span>
            <span>free / moderate / heavy traffic</span><span>·</span>
            <span>delays 3–25 min</span>
          </div>
          <a href="/datasets/medium-fleet.csv" download className={styles.datasetBtn} style={{ background: 'var(--success)' }}>
            <Download size={13} /> Download medium-fleet.csv
          </a>
        </div>

        <div className={styles.datasetCard} style={{ borderColor: 'var(--danger)' }}>
          <div className={styles.datasetBadge} style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
            Hard Level
          </div>
          <div className={styles.datasetTitle}>Crisis Fleet — 50 Trips</div>
          <div className={styles.datasetDesc}>
            12 vehicles · 5 routes · heavy/standstill traffic · severe delays 30–80 min · high ML risk scores — produces striking charts
          </div>
          <div className={styles.datasetStats}>
            <span>50 rows</span><span>·</span>
            <span>heavy / standstill traffic</span><span>·</span>
            <span>delays 33–80 min</span>
          </div>
          <a href="/datasets/hard-fleet.csv" download className={styles.datasetBtn} style={{ background: 'var(--danger)' }}>
            <Download size={13} /> Download hard-fleet.csv
          </a>
        </div>

        <div className={styles.datasetCard} style={{ borderColor: 'var(--accent)' }}>
          <div className={styles.datasetBadge} style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            Quick Test
          </div>
          <div className={styles.datasetTitle}>API Sample — 5 Trips</div>
          <div className={styles.datasetDesc}>
            Minimal 5-row sample for quick validation testing. Downloads from the backend API.
          </div>
          <div className={styles.datasetStats}>
            <span>5 rows</span><span>·</span>
            <span>mixed traffic</span><span>·</span>
            <span>baseline test</span>
          </div>
          <button className={`${styles.datasetBtn}`} style={{ background: 'var(--accent)' }} onClick={downloadSample}>
            <Download size={13} /> Download sample.csv
          </button>
        </div>
      </div>

      {/* Schema info */}
      <div className={styles.schemaCard}>
        <div className={styles.schemaTitle}>Required CSV Format</div>
        <div className={styles.schemaColumns}>
          {REQUIRED_COLS.map(col => (
            <span key={col} className={styles.schemaCol}>{col}</span>
          ))}
        </div>
        <p className={styles.schemaNote}>
          <strong>traffic</strong> must be one of: <code>free</code>, <code>moderate</code>, <code>heavy</code>, <code>standstill</code> ·
          Time columns are in <strong>minutes</strong> · <strong>distance_km</strong> and <strong>fuel_used</strong> in km and litres respectively
        </p>
      </div>

      {/* Upload area */}
      {!file ? (
        <div
          className={`${styles.dropZone} ${dragging ? styles.dragOver : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className={styles.fileInput}
            onChange={onFileInput}
          />
          <Upload size={36} className={styles.uploadIcon} />
          <div className={styles.dropTitle}>Drag & drop your CSV here</div>
          <div className={styles.dropSub}>or click to browse files</div>
          <div className={styles.dropHint}>CSV files only · Max 10 MB</div>
        </div>
      ) : (
        <div className={styles.fileBar}>
          <FileText size={18} className={styles.fileIcon} />
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB · {totalLines} data rows</span>
          </div>
          <button className={styles.clearBtn} onClick={clearFile}>
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Validation errors */}
      {preview && !result && hasErrors && (
        <div className={styles.errorBox}>
          <div className={styles.errorBoxHeader}>
            <AlertTriangle size={15} />
            <span>{preview.errors.length} validation issue(s)</span>
          </div>
          <ul className={styles.errorList}>
            {preview.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          {validRowCount > 0 && (
            <p className={styles.errorFootnote}>
              {validRowCount} valid row(s) will still be imported. Errored rows will be skipped.
            </p>
          )}
        </div>
      )}

      {/* Preview table */}
      {preview && preview.rows.length > 0 && !result && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>
              Preview — {validRowCount} valid row(s){totalLines > 100 ? ` (showing first 100 of ${totalLines})` : ''}
            </span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {REQUIRED_COLS.map(col => <th key={col}>{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td>{row.vehicle_id}</td>
                    <td>{row.route}</td>
                    <td>{row.distance_km}</td>
                    <td>{row.expected_time}</td>
                    <td>{row.actual_time}</td>
                    <td>{row.fuel_used}</td>
                    <td>
                      <span className={`${styles.trafficBadge} ${styles['traffic_' + (row.traffic?.toLowerCase() ?? 'free')]}`}>
                        {row.traffic}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 20 && (
              <div className={styles.moreRows}>…and {preview.rows.length - 20} more rows</div>
            )}
          </div>

          {importErr && <div className={styles.importErr}>{importErr}</div>}

          <div className={styles.importActions}>
            <button className={styles.importBtn} onClick={handleImport} disabled={importing || !canImport}>
              {importing ? (
                <><RefreshCw size={14} className={styles.spin} /> Importing & analysing…</>
              ) : (
                <><Upload size={14} /> Import {validRowCount} row(s) &amp; Run ML Analysis</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className={styles.resultSection}>
          <div className={styles.resultHeader}>
            <CheckCircle2 size={20} className={styles.successIcon} />
            <div>
              <div className={styles.resultTitle}>Import Successful!</div>
              <div className={styles.resultSub}>
                {result.rows_imported} trip(s) imported · {result.validation_errors.length} row(s) skipped · Click "View Dashboard" to see your data
              </div>
            </div>
          </div>

          <div className={styles.resultStats}>
            <div className={styles.statTile}>
              <div className={styles.statVal}>{result.rows_imported}</div>
              <div className={styles.statLabel}>Trips Imported</div>
            </div>
            <div className={styles.statTile}>
              <div className={styles.statVal}>{result.trips_created.length}</div>
              <div className={styles.statLabel}>Trip IDs Created</div>
            </div>
            <div className={styles.statTile}>
              <div className={styles.statVal}>{result.ml_scores.length + result.vehicle_ml.length}</div>
              <div className={styles.statLabel}>ML Scores Generated</div>
            </div>
            {result.fleet_summary && (
              <>
                <div className={styles.statTile}>
                  <div className={styles.statVal} style={{ color: '#059669' }}>{result.fleet_summary.low_count}</div>
                  <div className={styles.statLabel}>Low Risk</div>
                </div>
                <div className={styles.statTile}>
                  <div className={styles.statVal} style={{ color: '#1a56db' }}>{result.fleet_summary.medium_count}</div>
                  <div className={styles.statLabel}>Medium Risk</div>
                </div>
                <div className={styles.statTile}>
                  <div className={styles.statVal} style={{ color: '#d97706' }}>{result.fleet_summary.high_count}</div>
                  <div className={styles.statLabel}>High Risk</div>
                </div>
                <div className={styles.statTile}>
                  <div className={styles.statVal} style={{ color: '#dc2626' }}>{result.fleet_summary.critical_count}</div>
                  <div className={styles.statLabel}>Critical Risk</div>
                </div>
              </>
            )}
          </div>

          {/* ML Scores table */}
          {result.ml_scores.length > 0 && (
            <div className={styles.mlSection}>
              <div className={styles.mlHeader}>
                <BarChart3 size={15} />
                <span>Trip ML Analysis Results</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Trip ID</th>
                      <th>Delay Score</th>
                      <th>Fuel Score</th>
                      <th>Traffic Score</th>
                      <th>Overall Score</th>
                      <th>Risk Level</th>
                      <th>Key Factors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ml_scores.map((s, i) => (
                      <tr key={i}>
                        <td className={styles.entityId}>{s.entity_id}</td>
                        <td>{s.delay_score?.toFixed(0) ?? '—'}</td>
                        <td>{s.fuel_score?.toFixed(0) ?? '—'}</td>
                        <td>{s.traffic_score?.toFixed(0) ?? '—'}</td>
                        <td>
                          <strong style={{ color: riskColor(s.risk_level) }}>
                            {s.overall_score.toFixed(0)}
                          </strong>
                        </td>
                        <td>
                          <span className={styles.riskBadge} style={{ color: riskColor(s.risk_level), background: riskColor(s.risk_level) + '18' }}>
                            {s.risk_level}
                          </span>
                        </td>
                        <td className={styles.factorsList}>
                          {(s.risk_factors ?? []).slice(0, 2).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vehicle ML */}
          {result.vehicle_ml.length > 0 && (
            <div className={styles.mlSection}>
              <div className={styles.mlHeader}>
                <BarChart3 size={15} />
                <span>Vehicle ML Analysis Results</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vehicle ID</th>
                      <th>Overall Score</th>
                      <th>Risk Level</th>
                      <th>Recommendations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.vehicle_ml.map((s, i) => (
                      <tr key={i}>
                        <td className={styles.entityId}>{s.entity_id}</td>
                        <td>
                          <strong style={{ color: riskColor(s.risk_level) }}>
                            {s.overall_score.toFixed(0)}
                          </strong>
                        </td>
                        <td>
                          <span className={styles.riskBadge} style={{ color: riskColor(s.risk_level), background: riskColor(s.risk_level) + '18' }}>
                            {s.risk_level}
                          </span>
                        </td>
                        <td className={styles.factorsList}>
                          {(s.recommendations ?? []).slice(0, 2).join(' · ') || 'No action required'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.validation_errors.length > 0 && (
            <div className={styles.skippedErrors}>
              <strong>Skipped rows:</strong>
              <ul>
                {result.validation_errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className={styles.resultActions}>
            <button className={styles.importBtn} onClick={clearFile}>
              <Upload size={14} />
              Upload Another File
            </button>
            <button className={styles.dashBtn} onClick={() => navigate('/')}>
              <LayoutDashboard size={14} />
              View Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

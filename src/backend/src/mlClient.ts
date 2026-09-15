/**
 * mlClient — thin HTTP client that calls the Python FastAPI ML service.
 *
 * Design:
 *  - All functions return null on any network/ML error so callers
 *    can fall back to mock/cached data gracefully.
 *  - ML_URL defaults to http://localhost:5000 (set ML_URL in .env to override).
 */

const ML_URL = process.env.ML_URL ?? 'http://localhost:5000';
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS ?? '4000', 10);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MlScoreResult {
  entity_id:         string;
  entity_type:       'trip' | 'vehicle';
  delay_score:       number;
  fuel_score:        number;
  traffic_score:     number;
  behaviour_score:   number;
  maintenance_score: number;
  overall_score:     number;
  risk_level:        'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors:      string[];
  recommendations:   string[];
}

export interface FleetSummary {
  total:                number;
  avg_delay_score:      number;
  avg_fuel_score:       number;
  avg_traffic_score:    number;
  avg_behaviour_score:  number;
  avg_overall_score:    number;
  low_count:            number;
  medium_count:         number;
  high_count:           number;
  critical_count:       number;
  top_risk_ids:         string[];
}

export interface BatchScoreResponse {
  results: MlScoreResult[];
  summary: FleetSummary;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_URL}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
    if (!res.ok) {
      console.warn(`[mlClient] POST ${path} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[mlClient] POST ${path} failed:`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function get<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_URL}${path}`, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function checkMlHealth(): Promise<boolean> {
  const r = await get<{ ok: boolean }>('/health');
  return r?.ok === true;
}

export async function scoreTripMl(
  trip: Record<string, unknown>,
): Promise<MlScoreResult | null> {
  return post<MlScoreResult>('/score/trip', trip);
}

export async function scoreVehicleMl(
  vehicle: Record<string, unknown>,
): Promise<MlScoreResult | null> {
  return post<MlScoreResult>('/score/vehicle', vehicle);
}

export async function scoreTripsBatch(
  trips: Record<string, unknown>[],
): Promise<BatchScoreResponse | null> {
  return post<BatchScoreResponse>('/score/trips/batch', { trips });
}

export async function scoreVehiclesBatch(
  vehicles: Record<string, unknown>[],
): Promise<BatchScoreResponse | null> {
  return post<BatchScoreResponse>('/score/vehicles/batch', { vehicles });
}

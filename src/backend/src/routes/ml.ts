/**
 * /api/ml  — Node.js proxy to Python ML service
 *
 * POST /api/ml/score/trip         score one trip, optionally persist
 * POST /api/ml/score/vehicle      score one vehicle, optionally persist
 * POST /api/ml/score/trips/batch  score many trips + fleet summary
 * POST /api/ml/score/vehicles/batch
 * POST /api/ml/score/fleet/live   pull live trip+vehicle data from DB, score all, persist
 * GET  /api/ml/scores             latest persisted scores
 * GET  /api/ml/scores/:entityId   latest score for one entity
 * GET  /api/ml/health             ML service health
 */

import { Router } from 'express';
import { pool } from '../db';
import {
  checkMlHealth,
  scoreTripMl,
  scoreVehicleMl,
  scoreTripsBatch,
  scoreVehiclesBatch,
  type MlScoreResult,
} from '../mlClient';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// ─── Persist helper ──────────────────────────────────────────────────────────

async function persistScore(score: MlScoreResult): Promise<void> {
  try {
    await pool.query<ResultSetHeader>(
      `INSERT INTO ml_scores
         (entity_id, entity_type, delay_score, fuel_score, traffic_score,
          behaviour_score, maintenance_score, overall_score, risk_level,
          risk_factors, recommendations)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        score.entity_id,
        score.entity_type,
        score.delay_score,
        score.fuel_score,
        score.traffic_score,
        score.behaviour_score,
        score.maintenance_score,
        score.overall_score,
        score.risk_level,
        JSON.stringify(score.risk_factors),
        JSON.stringify(score.recommendations),
      ],
    );
  } catch {
    // DB not configured — silently skip persistence
  }
}

async function persistBatch(scores: MlScoreResult[]): Promise<void> {
  await Promise.all(scores.map(persistScore));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health of ML service
router.get('/health', async (_req, res) => {
  const ok = await checkMlHealth();
  res.json({ ok, service: 'fleet-ml', reachable: ok });
});

// Score one trip
router.post('/score/trip', async (req, res) => {
  const result = await scoreTripMl(req.body);
  if (!result) return res.status(503).json({ error: 'ML service unavailable' });
  if (req.body.persist !== false) await persistScore(result);
  res.json({ data: result });
});

// Score one vehicle
router.post('/score/vehicle', async (req, res) => {
  const result = await scoreVehicleMl(req.body);
  if (!result) return res.status(503).json({ error: 'ML service unavailable' });
  if (req.body.persist !== false) await persistScore(result);
  res.json({ data: result });
});

// Batch score trips
router.post('/score/trips/batch', async (req, res) => {
  const { trips } = req.body as { trips: Record<string, unknown>[] };
  if (!Array.isArray(trips)) return res.status(400).json({ error: '"trips" array required' });
  const result = await scoreTripsBatch(trips);
  if (!result) return res.status(503).json({ error: 'ML service unavailable' });
  await persistBatch(result.results);
  res.json({ data: result });
});

// Batch score vehicles
router.post('/score/vehicles/batch', async (req, res) => {
  const { vehicles } = req.body as { vehicles: Record<string, unknown>[] };
  if (!Array.isArray(vehicles)) return res.status(400).json({ error: '"vehicles" array required' });
  const result = await scoreVehiclesBatch(vehicles);
  if (!result) return res.status(503).json({ error: 'ML service unavailable' });
  await persistBatch(result.results);
  res.json({ data: result });
});

// Pull live data from DB → score all → persist
router.post('/score/fleet/live', async (_req, res) => {
  try {
    // 1. Pull today's in-progress/delayed trips
    const [tripRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        t.id           AS trip_id,
        t.vehicle_id,
        t.delay_min,
        t.distance_km,
        t.actual_duration  AS duration_min,
        t.scheduled_duration AS scheduled_min,
        t.fuel_used_l,
        t.avg_speed    AS avg_speed_mph,
        t.max_speed    AS max_speed_mph,
        t.idle_time_min,
        COALESCE(r.on_time_rate, 85) AS on_time_route_pct,
        COUNT(ra.id)                 AS risk_events,
        SUM(ra.severity IN ('high','critical')) AS critical_events,
        COALESCE(d.incidents, 0)     AS driver_incidents
      FROM trips t
      LEFT JOIN routes r       ON t.route_id  = r.id
      LEFT JOIN risk_analysis ra ON ra.trip_id = t.id
      LEFT JOIN drivers d       ON t.driver_id = d.id
      WHERE t.date = CURDATE()
        AND t.status IN ('in-progress','delayed')
      GROUP BY t.id
      LIMIT 100
    `);

    // 2. Pull all active/idle vehicles
    const [vehicleRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        v.id              AS vehicle_id,
        v.speed           AS speed_mph,
        v.fuel_level      AS fuel_level_pct,
        v.avg_fuel_consumption AS avg_fuel_l100km,
        v.odometer_km,
        COALESCE(v.next_service_odometer, 0) AS next_service_km,
        DATEDIFF(NOW(), v.last_service_date) AS days_since_service,
        COUNT(ra.id)      AS risk_events_7d,
        SUM(ra.severity IN ('high','critical')) AS critical_events_7d,
        COALESCE(d.incidents, 0) AS driver_incidents
      FROM vehicles v
      LEFT JOIN risk_analysis ra ON ra.vehicle_id = v.id
        AND ra.occurred_at >= NOW() - INTERVAL 7 DAY
      LEFT JOIN drivers d ON v.driver_id = d.id
      WHERE v.status IN ('active','idle')
      GROUP BY v.id
    `);

    const tripPayload = (tripRows as Record<string, unknown>[]).map(r => ({
      ...r,
      risk_events:     Number(r.risk_events ?? 0),
      critical_events: Number(r.critical_events ?? 0),
      driver_incidents: Number(r.driver_incidents ?? 0),
    }));

    const vehiclePayload = (vehicleRows as Record<string, unknown>[]).map(r => ({
      ...r,
      risk_events_7d:     Number(r.risk_events_7d ?? 0),
      critical_events_7d: Number(r.critical_events_7d ?? 0),
      driver_incidents:   Number(r.driver_incidents ?? 0),
      days_since_service: Number(r.days_since_service ?? 0),
    }));

    const [tripResult, vehicleResult] = await Promise.all([
      tripPayload.length    ? scoreTripsBatch(tripPayload)    : null,
      vehiclePayload.length ? scoreVehiclesBatch(vehiclePayload) : null,
    ]);

    if (tripResult) await persistBatch(tripResult.results);
    if (vehicleResult) await persistBatch(vehicleResult.results);

    res.json({
      data: {
        trips_scored:    tripResult?.results.length    ?? 0,
        vehicles_scored: vehicleResult?.results.length ?? 0,
        trip_summary:    tripResult?.summary    ?? null,
        vehicle_summary: vehicleResult?.summary ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET latest persisted scores (most recent per entity)
router.get('/scores', async (req, res) => {
  try {
    const { entity_type, risk_level, limit = '50' } = req.query as Record<string, string>;

    let sql = `
      SELECT ms.*
      FROM ml_scores ms
      INNER JOIN (
        SELECT entity_id, entity_type, MAX(scored_at) AS latest
        FROM ml_scores
        GROUP BY entity_id, entity_type
      ) latest ON ms.entity_id = latest.entity_id
              AND ms.entity_type = latest.entity_type
              AND ms.scored_at   = latest.latest
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (entity_type) { sql += ' AND ms.entity_type = ?'; params.push(entity_type); }
    if (risk_level)  { sql += ' AND ms.risk_level = ?';  params.push(risk_level);  }
    sql += ' ORDER BY ms.overall_score DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET latest score for one entity
router.get('/scores/:entityId', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM ml_scores
       WHERE entity_id = ?
       ORDER BY scored_at DESC
       LIMIT 1`,
      [req.params.entityId],
    );
    if (!rows.length) return res.status(404).json({ error: 'No score found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

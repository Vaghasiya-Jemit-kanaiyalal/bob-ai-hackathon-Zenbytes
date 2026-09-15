import { Router } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// GET /api/analytics/kpi  — dashboard KPI summary
router.get('/kpi', async (_req, res) => {
  try {
    const [[totals]] = await pool.query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(*) FROM vehicles)                                                AS total_vehicles,
        (SELECT COUNT(*) FROM vehicles WHERE status = 'active')                       AS active_vehicles,
        (SELECT COUNT(*) FROM trips   WHERE status = 'in-progress')                   AS active_trips,
        (SELECT COUNT(*) FROM trips   WHERE status = 'delayed')                       AS delayed_trips,
        (SELECT COUNT(*) FROM trips   WHERE risk IN ('high','critical')
                              AND date = CURDATE())                                    AS high_risk_trips,
        (SELECT COALESCE(AVG(efficiency),0) FROM vehicles WHERE status = 'active')    AS fleet_efficiency,
        (SELECT COALESCE(AVG(on_time_rate),0) FROM routes)                            AS on_time_rate,
        (SELECT COUNT(*) FROM maintenance WHERE status = 'overdue')                   AS overdue_maintenance,
        (SELECT COUNT(*) FROM risk_analysis WHERE DATE(occurred_at) = CURDATE())      AS risk_events_today
    `);
    res.json({ data: totals });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/analytics/delay-trend  — daily avg delay last 30 days
router.get('/delay-trend', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        DATE_FORMAT(date, '%b %d')        AS date,
        r.id                              AS route_id,
        COALESCE(AVG(t.delay_min), 0)     AS avg_delay
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      WHERE t.date >= CURDATE() - INTERVAL 30 DAY
        AND t.route_id IN ('R-01','R-02','R-03','R-04')
      GROUP BY t.date, r.id
      ORDER BY t.date, r.id
    `);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/analytics/fuel  — weekly fuel consumption
router.get('/fuel', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        DAYNAME(date)               AS day,
        SUM(fuel_used_l)            AS consumed,
        0                           AS saved
      FROM trips
      WHERE date >= CURDATE() - INTERVAL 7 DAY
      GROUP BY DAYOFWEEK(date), DAYNAME(date)
      ORDER BY DAYOFWEEK(date)
    `);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/analytics/route-performance  — on-time rates per route
router.get('/route-performance', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        r.id                                  AS route,
        r.name                                AS full_name,
        r.on_time_rate                        AS on_time,
        r.incidents,
        r.daily_trips                         AS trips
      FROM routes r
      ORDER BY r.id
    `);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/analytics/ml-summary  — latest ML score summary from persisted table
router.get('/ml-summary', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        entity_type,
        risk_level,
        COUNT(*)                AS count,
        AVG(overall_score)      AS avg_score,
        AVG(delay_score)        AS avg_delay,
        AVG(fuel_score)         AS avg_fuel,
        AVG(behaviour_score)    AS avg_behaviour,
        AVG(traffic_score)      AS avg_traffic,
        AVG(maintenance_score)  AS avg_maintenance
      FROM (
        SELECT ms.*
        FROM ml_scores ms
        INNER JOIN (
          SELECT entity_id, entity_type, MAX(scored_at) AS latest
          FROM ml_scores
          GROUP BY entity_id, entity_type
        ) latest ON ms.entity_id   = latest.entity_id
                AND ms.entity_type = latest.entity_type
                AND ms.scored_at   = latest.latest
      ) deduped
      GROUP BY entity_type, risk_level
      ORDER BY entity_type, FIELD(risk_level,'CRITICAL','HIGH','MEDIUM','LOW')
    `);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/analytics/risk-distribution  — event counts by type
router.get('/risk-distribution', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        event_type,
        COUNT(*) AS value
      FROM risk_analysis
      WHERE occurred_at >= NOW() - INTERVAL 7 DAY
      GROUP BY event_type
      ORDER BY value DESC
    `);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/analytics/vehicle-utilization  — aggregated by day of week
router.get('/vehicle-utilization', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        DAYNAME(start_time)                        AS day,
        ROUND(AVG(status = 'completed') * 100, 1)  AS active,
        ROUND(AVG(status = 'in-progress') * 100,1) AS in_progress,
        ROUND(AVG(status = 'delayed') * 100, 1)    AS delayed
      FROM trips
      WHERE start_time >= NOW() - INTERVAL 7 DAY
      GROUP BY DAYOFWEEK(start_time), DAYNAME(start_time)
      ORDER BY DAYOFWEEK(start_time)
    `);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

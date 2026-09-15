import { Router } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// GET /api/routes
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*,
              COUNT(t.id)                            AS active_trips,
              COALESCE(AVG(t.delay_min),0)           AS avg_delay
       FROM routes r
       LEFT JOIN trips t ON t.route_id = r.id AND t.status = 'in-progress'
       GROUP BY r.id
       ORDER BY r.id`,
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/routes/:id  — includes recent trips on this route
router.get('/:id', async (req, res) => {
  try {
    const [route] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM routes WHERE id = ?',
      [req.params.id],
    );
    if (!route.length) return res.status(404).json({ error: 'Route not found' });

    const [trips] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.status, t.risk, t.start_time, t.eta, t.delay_min,
              t.distance_km, t.fuel_used_l, v.plate, d.name AS driver
       FROM trips t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN drivers  d ON t.driver_id  = d.id
       WHERE t.route_id = ?
       ORDER BY t.start_time DESC
       LIMIT 20`,
      [req.params.id],
    );

    res.json({ data: { ...route[0], recent_trips: trips } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

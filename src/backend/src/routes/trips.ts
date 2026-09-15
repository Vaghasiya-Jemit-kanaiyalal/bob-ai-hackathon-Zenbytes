import { Router } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// GET /api/trips  — list with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, risk, vehicle_id, route_id, date, limit = '50' } = req.query as Record<string, string>;

    let sql = `
      SELECT t.*,
             v.plate,
             d.name  AS driver,
             r.name  AS route_name
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers  d ON t.driver_id  = d.id
      LEFT JOIN routes   r ON t.route_id   = r.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status)     { sql += ' AND t.status = ?';     params.push(status);     }
    if (risk)       { sql += ' AND t.risk = ?';        params.push(risk);       }
    if (vehicle_id) { sql += ' AND t.vehicle_id = ?';  params.push(vehicle_id); }
    if (route_id)   { sql += ' AND t.route_id = ?';    params.push(route_id);   }
    if (date)       { sql += ' AND t.date = ?';        params.push(date);       }

    sql += ' ORDER BY t.start_time DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*,
              v.plate, v.make, v.model, v.year,
              d.name  AS driver,
              r.name  AS route_name
       FROM trips t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN drivers  d ON t.driver_id  = d.id
       LEFT JOIN routes   r ON t.route_id   = r.id
       WHERE t.id = ?`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Trip not found' });

    const [risks] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM risk_analysis WHERE trip_id = ? ORDER BY occurred_at',
      [req.params.id],
    );

    res.json({ data: { ...rows[0], risk_events: risks } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

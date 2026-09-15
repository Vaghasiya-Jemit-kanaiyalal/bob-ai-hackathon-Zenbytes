import { Router } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// GET /api/risk  — all unresolved risk events
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, severity, resolved = '0' } = req.query as Record<string, string>;

    let sql = `
      SELECT ra.*,
             v.plate,
             d.name AS driver
      FROM risk_analysis ra
      JOIN vehicles v ON ra.vehicle_id = v.id
      LEFT JOIN drivers d ON v.driver_id = d.id
      WHERE ra.resolved = ?
    `;
    const params: unknown[] = [parseInt(resolved, 10)];

    if (vehicle_id) { sql += ' AND ra.vehicle_id = ?'; params.push(vehicle_id); }
    if (severity)   { sql += ' AND ra.severity = ?';   params.push(severity);   }

    sql += ' ORDER BY ra.occurred_at DESC LIMIT 100';

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

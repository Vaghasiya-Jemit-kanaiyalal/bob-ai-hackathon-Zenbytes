import { Router } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// GET /api/maintenance  — list all records, optional ?vehicle_id= &status=
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, status } = req.query as Record<string, string>;

    let sql = `
      SELECT m.*, v.plate, v.make, v.model
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (vehicle_id) { sql += ' AND m.vehicle_id = ?'; params.push(vehicle_id); }
    if (status)     { sql += ' AND m.status = ?';     params.push(status);     }

    sql += ' ORDER BY m.service_date DESC';

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/maintenance/:vehicleId  — all records for a single vehicle
router.get('/:vehicleId', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, v.plate
       FROM maintenance m
       JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.vehicle_id = ?
       ORDER BY m.service_date DESC`,
      [req.params.vehicleId],
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

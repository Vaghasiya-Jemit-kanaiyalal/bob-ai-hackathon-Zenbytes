import { Router } from 'express';
import { pool } from '../db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// GET /api/vehicles  — list all, supports ?status=active|idle|maintenance|offline
router.get('/', async (req, res) => {
  try {
    const { status, risk, q } = req.query as Record<string, string>;
    let sql = `
      SELECT v.*, d.name AS driver_name, d.phone AS driver_phone
      FROM vehicles v
      LEFT JOIN drivers d ON v.driver_id = d.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) { sql += ' AND v.status = ?';        params.push(status); }
    if (risk)   { sql += ' AND v.risk = ?';           params.push(risk);   }
    if (q)      {
      sql += ' AND (v.plate LIKE ? OR v.id LIKE ? OR d.name LIKE ? OR v.location LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    sql += ' ORDER BY FIELD(v.risk,"critical","high","medium","low"), v.id';

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT v.*, d.name AS driver_name, d.phone AS driver_phone, d.license_no, d.driver_since
       FROM vehicles v
       LEFT JOIN drivers d ON v.driver_id = d.id
       WHERE v.id = ?`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/vehicles/:id  — update status, fuel_level, speed, location
router.patch('/:id', async (req, res) => {
  const allowed = ['status', 'risk', 'fuel_level', 'speed', 'location', 'driver_id'];
  const updates: string[] = [];
  const vals: unknown[] = [];

  for (const key of allowed) {
    if (key in req.body) {
      updates.push(`${key} = ?`);
      vals.push(req.body[key]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No valid fields supplied' });

  try {
    vals.push(req.params.id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`,
      vals,
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

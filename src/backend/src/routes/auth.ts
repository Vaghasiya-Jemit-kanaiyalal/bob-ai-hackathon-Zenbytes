/**
 * /api/auth  — JWT-based authentication
 *
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — obtain JWT
 * POST /api/auth/logout    — client-side (token is stateless; returns ok)
 * GET  /api/auth/me        — return current user from token
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();
const JWT_SECRET  = process.env.JWT_SECRET ?? 'yatradrishti-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '7d';

function sign(id: number, email: string, role: string) {
  return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'viewer' } = req.body as Record<string, string>;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
      [name, email, hash, role],
    );
    const token = sign(result.insertId, email, role);
    res.status(201).json({ data: { token, user: { id: result.insertId, name, email, role } } });
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes('ER_DUP_ENTRY') || msg.includes('Duplicate entry')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: msg });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as Record<string, string>;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = sign(user.id as number, user.email as string, user.role as string);
    res.json({
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/auth/logout  — stateless, just acknowledge
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me  — verify token, return user
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [payload.id],
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    res.json({ data: rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;

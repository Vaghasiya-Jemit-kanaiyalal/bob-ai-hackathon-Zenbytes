import 'dotenv/config';
import mysql from 'mysql2/promise';

const {
  DB_HOST     = 'localhost',
  DB_PORT     = '3306',
  DB_USER     = 'root',
  DB_PASSWORD = '',
  DB_NAME     = 'fleet_db',
  DB_POOL_MIN = '2',
  DB_POOL_MAX = '10',
} = process.env;

export const pool = mysql.createPool({
  host:               DB_HOST,
  port:               parseInt(DB_PORT, 10),
  user:               DB_USER,
  password:           DB_PASSWORD,
  database:           DB_NAME,
  connectionLimit:    parseInt(DB_POOL_MAX, 10),
  waitForConnections: true,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
  timezone:           '+00:00',
});

/**
 * Checks whether the DB pool is reachable.
 * Used at startup to log the connection state without crashing.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch {
    return false;
  }
}

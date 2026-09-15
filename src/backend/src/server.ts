import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testConnection } from './db';

import vehiclesRouter   from './routes/vehicles';
import routesRouter     from './routes/routes';
import tripsRouter      from './routes/trips';
import maintenanceRouter from './routes/maintenance';
import analyticsRouter  from './routes/analytics';
import riskRouter       from './routes/risk';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',   // Vite dev server
    'http://localhost:4173',   // Vite preview
    process.env.FRONTEND_URL ?? '',
  ].filter(Boolean),
  methods: ['GET', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ─── API routes ──────────────────────────────────────────────────────────────
app.use('/api/vehicles',    vehiclesRouter);
app.use('/api/routes',      routesRouter);
app.use('/api/trips',       tripsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/analytics',   analyticsRouter);
app.use('/api/risk',        riskRouter);

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀  Fleet API listening on http://localhost:${PORT}`);
  const dbOk = await testConnection();
  if (dbOk) {
    console.log(`✅  MySQL connected  (${process.env.DB_NAME ?? 'fleet_db'}@${process.env.DB_HOST ?? 'localhost'})`);
  } else {
    console.warn(`⚠️   MySQL unavailable — API will return 500 for DB-backed endpoints.`);
    console.warn(`    Set DB_* vars in .env and restart to enable database access.`);
  }
  console.log();
});

export default app;

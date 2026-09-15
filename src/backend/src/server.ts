import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testConnection } from './db';
import { authMiddleware } from './middleware/auth';

import authRouter       from './routes/auth';
import vehiclesRouter   from './routes/vehicles';
import routesRouter     from './routes/routes';
import tripsRouter      from './routes/trips';
import maintenanceRouter from './routes/maintenance';
import analyticsRouter  from './routes/analytics';
import riskRouter       from './routes/risk';
import mlRouter         from './routes/ml';
import importRouter     from './routes/import';
import copilotRouter    from './routes/copilot';

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

// ─── Health check (public) ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ─── Auth routes (public — no JWT required) ───────────────────────────────────
app.use('/api/auth', authRouter);

// ─── Import sample download (public) ─────────────────────────────────────────
app.get('/api/import/sample', importRouter);

// ─── Protected API routes ────────────────────────────────────────────────────
app.use('/api/vehicles',    authMiddleware, vehiclesRouter);
app.use('/api/routes',      authMiddleware, routesRouter);
app.use('/api/trips',       authMiddleware, tripsRouter);
app.use('/api/maintenance', authMiddleware, maintenanceRouter);
app.use('/api/analytics',   authMiddleware, analyticsRouter);
app.use('/api/risk',        authMiddleware, riskRouter);
app.use('/api/ml',          authMiddleware, mlRouter);
app.use('/api/import',      authMiddleware, importRouter);
app.use('/api/copilot',     authMiddleware, copilotRouter);

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
  const mlOk = await (await import('./mlClient')).checkMlHealth();
  console.log(mlOk
    ? `✅  ML service reachable (${process.env.ML_URL ?? 'http://localhost:5000'})`
    : `⚠️   ML service offline — scoring endpoints will return 503 until it starts.`);
  console.log();
});

export default app;

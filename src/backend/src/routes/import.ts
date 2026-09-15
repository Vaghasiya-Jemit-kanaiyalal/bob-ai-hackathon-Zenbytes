/**
 * /api/import  — CSV upload, parse, store in MySQL, trigger ML scoring
 *
 * POST /api/import/csv   multipart/form-data  field: "file"
 *
 * Accepted CSV columns:
 *   vehicle_id, route, distance_km, expected_time, actual_time, fuel_used, traffic
 *
 * Processing:
 *  1. Parse & validate CSV rows
 *  2. Upsert vehicles + routes into DB as needed
 *  3. Insert trips rows
 *  4. Trigger ML scoring for all inserted trips
 *  5. Return import summary + ML results
 */
import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db';
import { scoreTripsBatch, scoreVehiclesBatch } from '../mlClient';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── CSV Parser ──────────────────────────────────────────────────────────────

interface CsvRow {
  vehicle_id:    string;
  route:         string;
  distance_km:   number;
  expected_time: number;
  actual_time:   number;
  fuel_used:     number;
  traffic:       string;
}

interface ParseResult {
  rows:   CsvRow[];
  errors: string[];
}

const REQUIRED = ['vehicle_id', 'route', 'distance_km', 'expected_time', 'actual_time', 'fuel_used', 'traffic'];

function parseCsv(text: string): ParseResult {
  const lines  = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  const errors: string[] = [];
  const rows:   CsvRow[] = [];

  if (lines.length < 2) {
    errors.push('CSV must contain a header row and at least one data row');
    return { rows, errors };
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const missing = REQUIRED.filter(col => !header.includes(col));
  if (missing.length) {
    errors.push(`Missing required columns: ${missing.join(', ')}`);
    return { rows, errors };
  }

  const idx = (col: string) => header.indexOf(col);

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cells  = lines[i].split(',').map(c => c.trim());

    if (cells.length !== header.length) {
      errors.push(`Row ${lineNo}: expected ${header.length} columns, got ${cells.length}`);
      continue;
    }

    const vehicle_id    = cells[idx('vehicle_id')];
    const route         = cells[idx('route')];
    const distance_km   = parseFloat(cells[idx('distance_km')]);
    const expected_time = parseFloat(cells[idx('expected_time')]);
    const actual_time   = parseFloat(cells[idx('actual_time')]);
    const fuel_used     = parseFloat(cells[idx('fuel_used')]);
    const traffic       = cells[idx('traffic')];

    const rowErrors: string[] = [];
    if (!vehicle_id)              rowErrors.push('vehicle_id is empty');
    if (!route)                   rowErrors.push('route is empty');
    if (isNaN(distance_km)  || distance_km  <= 0) rowErrors.push('distance_km must be a positive number');
    if (isNaN(expected_time)|| expected_time<= 0) rowErrors.push('expected_time must be a positive number');
    if (isNaN(actual_time)  || actual_time  <= 0) rowErrors.push('actual_time must be a positive number');
    if (isNaN(fuel_used)    || fuel_used    <  0) rowErrors.push('fuel_used must be non-negative');
    if (!['free','moderate','heavy','standstill'].includes(traffic.toLowerCase())) {
      rowErrors.push('traffic must be one of: free, moderate, heavy, standstill');
    }

    if (rowErrors.length) {
      errors.push(`Row ${lineNo} (${vehicle_id || '?'}): ${rowErrors.join('; ')}`);
    } else {
      rows.push({ vehicle_id, route, distance_km, expected_time, actual_time, fuel_used, traffic: traffic.toLowerCase() });
    }
  }

  return { rows, errors };
}

// ─── Route ───────────────────────────────────────────────────────────────────

router.post('/csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send CSV as multipart field "file".' });
  }
  if (!req.file.originalname.endsWith('.csv') && req.file.mimetype !== 'text/csv') {
    return res.status(400).json({ error: 'Only CSV files are accepted.' });
  }

  const text = req.file.buffer.toString('utf-8');
  const { rows, errors } = parseCsv(text);

  if (errors.length && !rows.length) {
    return res.status(422).json({ errors, rows_parsed: 0 });
  }

  // ── 1. Upsert vehicles ────────────────────────────────────────────────────
  const vehicleIds = [...new Set(rows.map(r => r.vehicle_id))];
  for (const vid of vehicleIds) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM vehicles WHERE id = ?', [vid]);
    if (!existing.length) {
      await pool.query<ResultSetHeader>(
        `INSERT INTO vehicles (id, plate, make, model, year, type, engine_type, status, risk, efficiency, trips)
         VALUES (?, ?, 'Unknown', 'Unknown', 2024, 'Delivery Van', 'Diesel', 'active', 'low', 80, 0)`,
        [vid, vid],
      );
    }
  }

  // ── 2. Upsert routes ──────────────────────────────────────────────────────
  const routeNames = [...new Set(rows.map(r => r.route))];
  const routeIdMap: Record<string, string> = {};
  for (const routeName of routeNames) {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM routes WHERE name = ? LIMIT 1', [routeName],
    );
    if (existing.length) {
      routeIdMap[routeName] = existing[0].id as string;
    } else {
      // generate a new route id
      const [[maxRow]] = await pool.query<RowDataPacket[]>(
        `SELECT MAX(CAST(SUBSTRING(id, 3) AS UNSIGNED)) AS mx FROM routes WHERE id LIKE 'R-%'`,
      );
      const next = ((maxRow?.mx as number) ?? 0) + 1;
      const newId = `R-${String(next).padStart(2, '0')}`;
      const avgDist = rows.filter(r => r.route === routeName).reduce((s, r) => s + r.distance_km, 0) /
                      rows.filter(r => r.route === routeName).length;
      const avgDur  = rows.filter(r => r.route === routeName).reduce((s, r) => s + r.expected_time, 0) /
                      rows.filter(r => r.route === routeName).length;
      await pool.query<ResultSetHeader>(
        `INSERT INTO routes (id, name, distance_km, avg_duration, on_time_rate, status)
         VALUES (?,?,?,?,85,'optimal')`,
        [newId, routeName, avgDist.toFixed(2), Math.round(avgDur)],
      );
      routeIdMap[routeName] = newId;
    }
  }

  // ── 3. Insert trips ───────────────────────────────────────────────────────
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const insertedTripIds: string[] = [];

  for (const row of rows) {
    const delay = Math.round(row.actual_time - row.expected_time);
    const status = delay > 10 ? 'delayed' : delay > 0 ? 'in-progress' : 'completed';
    const risk   = delay > 30 ? 'critical' : delay > 15 ? 'high' : delay > 5 ? 'medium' : 'low';

    // generate trip id
    const [[maxTripRow]] = await pool.query<RowDataPacket[]>(
      `SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) AS mx FROM trips WHERE id LIKE 'TR-%'`,
    );
    const nextTripNum = ((maxTripRow?.mx as number) ?? 0) + 1;
    const tripId = `TR-${String(nextTripNum).padStart(3, '0')}`;

    const startTime = new Date(now.getTime() - row.actual_time * 60 * 1000);

    await pool.query<ResultSetHeader>(
      `INSERT INTO trips
         (id, vehicle_id, route_id, origin, destination, status, risk,
          start_time, scheduled_duration, actual_duration, distance_km,
          delay_min, fuel_used_l, date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tripId,
        row.vehicle_id,
        routeIdMap[row.route] ?? null,
        row.route + ' Start',
        row.route + ' End',
        status,
        risk,
        startTime,
        Math.round(row.expected_time),
        Math.round(row.actual_time),
        row.distance_km,
        delay,
        row.fuel_used,
        today,
      ],
    );
    insertedTripIds.push(tripId);

    // Update vehicle trip count
    await pool.query(
      'UPDATE vehicles SET trips = trips + 1 WHERE id = ?',
      [row.vehicle_id],
    );
  }

  // ── 4. ML scoring ─────────────────────────────────────────────────────────
  const tripPayloads = rows.map((row, i) => ({
    trip_id:           insertedTripIds[i],
    vehicle_id:        row.vehicle_id,
    delay_min:         Math.round(row.actual_time - row.expected_time),
    distance_km:       row.distance_km,
    duration_min:      row.actual_time,
    scheduled_min:     row.expected_time,
    fuel_used_l:       row.fuel_used,
    avg_speed_mph:     Math.round(row.distance_km / (row.actual_time / 60) * 0.621),
    max_speed_mph:     Math.round(row.distance_km / (row.expected_time / 60) * 0.621 * 1.2),
    idle_time_min:     0,
    on_time_route_pct: 85,
    risk_events:       row.traffic === 'standstill' ? 2 : row.traffic === 'heavy' ? 1 : 0,
    critical_events:   row.traffic === 'standstill' ? 1 : 0,
    driver_incidents:  0,
  }));

  const mlResult = await scoreTripsBatch(tripPayloads);

  // Persist ML scores
  if (mlResult?.results) {
    for (const score of mlResult.results) {
      try {
        await pool.query(
          `INSERT INTO ml_scores
             (entity_id, entity_type, delay_score, fuel_score, traffic_score,
              behaviour_score, maintenance_score, overall_score, risk_level,
              risk_factors, recommendations)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            score.entity_id, score.entity_type,
            score.delay_score, score.fuel_score, score.traffic_score,
            score.behaviour_score, score.maintenance_score, score.overall_score,
            score.risk_level,
            JSON.stringify(score.risk_factors),
            JSON.stringify(score.recommendations),
          ],
        );
      } catch { /* silently skip if ML table missing */ }
    }
  }

  // ── 5. Vehicle ML scoring ─────────────────────────────────────────────────
  const vehiclePayloads = vehicleIds.map(vid => {
    const vRows = rows.filter(r => r.vehicle_id === vid);
    const avgFuel = vRows.reduce((s, r) => s + (r.fuel_used / r.distance_km) * 100, 0) / vRows.length;
    return {
      vehicle_id:         vid,
      speed_mph:          0,
      fuel_level_pct:     70,
      avg_fuel_l100km:    avgFuel,
      odometer_km:        vRows.reduce((s, r) => s + r.distance_km, 0),
      next_service_km:    200000,
      days_since_service: 30,
      risk_events_7d:     vRows.filter(r => r.traffic === 'standstill').length,
      critical_events_7d: 0,
      driver_incidents:   0,
    };
  });

  const vehicleMlResult = await scoreVehiclesBatch(vehiclePayloads);

  if (vehicleMlResult?.results) {
    for (const score of vehicleMlResult.results) {
      try {
        await pool.query(
          `INSERT INTO ml_scores
             (entity_id, entity_type, delay_score, fuel_score, traffic_score,
              behaviour_score, maintenance_score, overall_score, risk_level,
              risk_factors, recommendations)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            score.entity_id, score.entity_type,
            score.delay_score, score.fuel_score, score.traffic_score,
            score.behaviour_score, score.maintenance_score, score.overall_score,
            score.risk_level,
            JSON.stringify(score.risk_factors),
            JSON.stringify(score.recommendations),
          ],
        );
      } catch { /* silently skip */ }
    }
  }

  res.json({
    data: {
      rows_imported:    rows.length,
      rows_errored:     errors.length,
      validation_errors: errors,
      trips_created:    insertedTripIds,
      ml_scores:        mlResult?.results       ?? [],
      vehicle_ml:       vehicleMlResult?.results ?? [],
      fleet_summary:    mlResult?.summary        ?? null,
    },
  });
});

// GET /api/import/sample  — download sample CSV
router.get('/sample', (_req, res) => {
  const sample = [
    'vehicle_id,route,distance_km,expected_time,actual_time,fuel_used,traffic',
    'VH-001,Downtown Core Loop,48.0,95,113,5.2,moderate',
    'VH-004,Airport Connector,35.0,70,70,3.1,free',
    'VH-011,Suburb Ring Road,91.0,155,193,22.4,heavy',
    'VH-005,East Residential Circuit,55.0,100,107,6.8,moderate',
    'VH-007,Airport Connector,35.0,70,65,2.6,free',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="yatradrishti-sample.csv"');
  res.send(sample);
});

export default router;

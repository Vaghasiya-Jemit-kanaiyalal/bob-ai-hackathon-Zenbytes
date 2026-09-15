/**
 * /api/copilot  — Bob Copilot chat endpoint
 *
 * POST /api/copilot/chat  — answer fleet questions using real MySQL data
 */
import { Router } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// ─── Data aggregators ────────────────────────────────────────────────────────

async function getFleetSummary() {
  const [[kpi]] = await pool.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM vehicles)                                  AS total,
      (SELECT COUNT(*) FROM vehicles WHERE status = 'active')         AS active,
      (SELECT COUNT(*) FROM vehicles WHERE status = 'maintenance')    AS in_maintenance,
      (SELECT COUNT(*) FROM trips WHERE status = 'in-progress')       AS active_trips,
      (SELECT COUNT(*) FROM trips WHERE status = 'delayed')           AS delayed_trips,
      (SELECT COUNT(*) FROM trips WHERE date = CURDATE())             AS trips_today,
      (SELECT COALESCE(AVG(efficiency),0) FROM vehicles WHERE status='active') AS fleet_eff,
      (SELECT COALESCE(AVG(on_time_rate),0) FROM routes)              AS on_time_rate,
      (SELECT COALESCE(SUM(fuel_used_l),0) FROM trips WHERE date=CURDATE()) AS fuel_today
  `);
  return kpi;
}

async function getHighRiskVehicles() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT v.id, v.plate, v.make, v.model, v.risk, v.status, v.speed,
           d.name AS driver
    FROM vehicles v
    LEFT JOIN drivers d ON v.driver_id = d.id
    WHERE v.risk IN ('high','critical')
    ORDER BY FIELD(v.risk,'critical','high'), v.id
    LIMIT 10
  `);
  return rows;
}

async function getDelayedTrips() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT t.id, t.vehicle_id, t.delay_min, t.status, t.risk,
           r.name AS route_name, d.name AS driver
    FROM trips t
    LEFT JOIN routes r ON t.route_id = r.id
    LEFT JOIN drivers d ON t.driver_id = d.id
    WHERE t.status = 'delayed' OR t.delay_min > 10
    ORDER BY t.delay_min DESC
    LIMIT 10
  `);
  return rows;
}

async function getRoutePerformance() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT id, name, on_time_rate, incidents, status, distance_km, vehicle_count
    FROM routes
    ORDER BY on_time_rate ASC
    LIMIT 8
  `);
  return rows;
}

async function getFuelStats() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      v.id, v.plate, v.avg_fuel_consumption AS fuel_l100km, v.efficiency,
      COALESCE(SUM(t.fuel_used_l),0) AS total_fuel_7d
    FROM vehicles v
    LEFT JOIN trips t ON t.vehicle_id = v.id AND t.date >= CURDATE() - INTERVAL 7 DAY
    GROUP BY v.id
    ORDER BY v.avg_fuel_consumption DESC
    LIMIT 8
  `);
  return rows;
}

async function getMlScoresSummary() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT ms.entity_id, ms.entity_type, ms.overall_score, ms.risk_level,
           ms.risk_factors, ms.recommendations
    FROM ml_scores ms
    INNER JOIN (
      SELECT entity_id, entity_type, MAX(scored_at) AS latest
      FROM ml_scores
      GROUP BY entity_id, entity_type
    ) latest ON ms.entity_id = latest.entity_id
            AND ms.entity_type = latest.entity_type
            AND ms.scored_at = latest.latest
    WHERE ms.risk_level IN ('HIGH','CRITICAL')
    ORDER BY ms.overall_score DESC
    LIMIT 10
  `).catch(() => [[] as RowDataPacket[]]);
  return Array.isArray(rows[0]) ? rows[0] : rows as RowDataPacket[];
}

// ─── Answer builder ──────────────────────────────────────────────────────────

function buildAnswer(
  userMsg:     string,
  kpi:         RowDataPacket,
  highRisk:    RowDataPacket[],
  delayed:     RowDataPacket[],
  routes:      RowDataPacket[],
  fuel:        RowDataPacket[],
  mlHighRisk:  RowDataPacket[],
): string {
  const q = userMsg.toLowerCase();

  // --- risk / vehicle status ---
  if (q.includes('risk') || q.includes('highest risk') || q.includes('dangerous')) {
    if (!highRisk.length) {
      return 'Good news — no vehicles are currently flagged as high or critical risk based on imported data.';
    }
    const list = highRisk.map(v =>
      `• **${v.id} (${v.plate})** — ${v.make} ${v.model}, driver: ${v.driver ?? '—'}, risk: **${v.risk}**, status: ${v.status}, speed: ${v.speed} mph`
    ).join('\n');
    return `**${highRisk.length} vehicle(s) at high or critical risk:**\n\n${list}\n\nRecommendation: Dispatch supervisor check-in for critical-risk vehicles immediately.`;
  }

  // --- delayed trips ---
  if (q.includes('delay') || q.includes('late') || q.includes('behind schedule')) {
    if (!delayed.length) {
      return 'No trips are currently delayed. Fleet is operating on schedule.';
    }
    const list = delayed.map(t =>
      `• **${t.id}** on ${t.route_name ?? '—'} — delay: **+${t.delay_min} min**, driver: ${t.driver ?? '—'}, risk: ${t.risk}`
    ).join('\n');
    return `**${delayed.length} delayed trip(s) detected:**\n\n${list}\n\nSuggestion: Re-route vehicles on congested segments or notify customers of delays.`;
  }

  // --- fuel efficiency ---
  if (q.includes('fuel') || q.includes('consumption') || q.includes('efficient')) {
    const total  = Number(kpi.fuel_today ?? 0).toFixed(1);
    const worst  = fuel[0];
    const best   = fuel[fuel.length - 1];
    return `**Fuel Analytics (today/7-day):**\n\n` +
      `• Total fuel consumed today: **${total} L**\n` +
      `• Highest consumer: **${worst?.plate ?? '—'}** at ${Number(worst?.fuel_l100km ?? 0).toFixed(1)} L/100km\n` +
      `• Most efficient: **${best?.plate ?? '—'}** at ${Number(best?.fuel_l100km ?? 0).toFixed(1)} L/100km\n\n` +
      `Fleet average efficiency: **${Number(kpi.fleet_eff ?? 0).toFixed(1)}%**\n\nConsider reassigning high-fuel routes to more efficient vehicles.`;
  }

  // --- route performance ---
  if (q.includes('route') || q.includes('road') || q.includes('corridor') || q.includes('optimize')) {
    if (!routes.length) {
      return 'No route data found in the database yet. Upload fleet CSV data to see route performance.';
    }
    const worst   = routes[0];
    const best    = routes[routes.length - 1];
    const list    = routes.slice(0, 5).map(r =>
      `• **${r.id} — ${r.name}**: on-time ${Number(r.on_time_rate).toFixed(0)}%, incidents: ${r.incidents}, status: ${r.status}`
    ).join('\n');
    return `**Route Performance Summary:**\n\n${list}\n\n` +
      `**Worst route:** ${worst.id} — ${worst.name} (${Number(worst.on_time_rate).toFixed(0)}% on-time)\n` +
      `**Best route:** ${best.id} — ${best.name} (${Number(best.on_time_rate).toFixed(0)}% on-time)\n\n` +
      `Routes with "disrupted" status should be reviewed for road conditions or incidents.`;
  }

  // --- current info / full dashboard summary ---
  if (
    q.includes('current') || q.includes('info') || q.includes('information') ||
    q.includes('show me') || q.includes('what is') || q.includes('give me') ||
    q.includes('tell me') || q.includes('present') || q.includes('now') ||
    q.includes('today') || q.includes('live') || q.includes('existing') ||
    q.includes('fleet') || q.includes('overview') || q.includes('status') || q.includes('summary')
  ) {
    // ── Vehicles section ──
    const vehicleSection =
      `**🚛 Vehicles:**\n` +
      `• Total: **${kpi.total ?? 0}** | Active: **${kpi.active ?? 0}** | In Maintenance: **${kpi.in_maintenance ?? 0}**\n` +
      (highRisk.length > 0
        ? `• ⚠️ **${highRisk.length} vehicle(s) at HIGH/CRITICAL risk** — ${highRisk.slice(0, 3).map(v => `${v.plate} (${v.risk})`).join(', ')}`
        : `• ✅ No high-risk vehicles detected`);

    // ── Trips section ──
    const tripSection =
      `\n\n**📦 Trips Today:**\n` +
      `• Total today: **${kpi.trips_today ?? 0}** | Active: **${kpi.active_trips ?? 0}** | Delayed: **${kpi.delayed_trips ?? 0}**\n` +
      (delayed.length > 0
        ? `• ⚠️ Delayed: ${delayed.slice(0, 3).map(t => `**${t.id}** (+${t.delay_min} min on ${t.route_name ?? '—'})`).join(', ')}`
        : `• ✅ All trips running on schedule`);

    // ── Routes section ──
    const routeSection = routes.length > 0
      ? `\n\n**🗺️ Route Performance:**\n` +
        `• Best route: **${routes[routes.length - 1]?.name ?? '—'}** (${Number(routes[routes.length - 1]?.on_time_rate ?? 0).toFixed(0)}% on-time)\n` +
        `• Worst route: **${routes[0]?.name ?? '—'}** (${Number(routes[0]?.on_time_rate ?? 0).toFixed(0)}% on-time)\n` +
        `• Total active routes: **${routes.length}**`
      : `\n\n**🗺️ Routes:** No route data yet.`;

    // ── Fuel section ──
    const fuelSection =
      `\n\n**⛽ Fuel:**\n` +
      `• Consumed today: **${Number(kpi.fuel_today ?? 0).toFixed(1)} L**\n` +
      `• Fleet average efficiency: **${Number(kpi.fleet_eff ?? 0).toFixed(1)}%**\n` +
      `• On-time rate across all routes: **${Number(kpi.on_time_rate ?? 0).toFixed(1)}%**`;

    // ── ML section ──
    const mlSection = mlHighRisk.length > 0
      ? `\n\n**🤖 ML Risk Alerts:**\n` +
        `• **${mlHighRisk.length}** entity(s) flagged HIGH/CRITICAL by ML\n` +
        `• Top risk: **${mlHighRisk[0]?.entity_id}** — score ${Number(mlHighRisk[0]?.overall_score ?? 0).toFixed(0)}, level: ${mlHighRisk[0]?.risk_level}`
      : `\n\n**🤖 ML Scores:** All entities at LOW/MEDIUM risk — fleet is healthy.`;

    return `**📊 Current Fleet Status — Live Summary:**\n\n` +
      vehicleSection + tripSection + routeSection + fuelSection + mlSection +
      `\n\n*This is a live snapshot from your MySQL database. Ask me about any specific area for deeper details.*`;
  }

  // --- ML / AI scores ---
  if (q.includes('ml') || q.includes('score') || q.includes('ai') || q.includes('machine learning') || q.includes('analytics')) {
    if (!mlHighRisk.length) {
      return 'No high-risk ML scores found. Either no data has been imported yet, or all entities are at low/medium risk.';
    }
    const list = mlHighRisk.slice(0, 5).map(s => {
      const factors = typeof s.risk_factors === 'string' ? JSON.parse(s.risk_factors) : s.risk_factors;
      return `• **${s.entity_id}** (${s.entity_type}): overall score **${Number(s.overall_score).toFixed(0)}**, risk: **${s.risk_level}**\n  Factors: ${(factors as string[]).join('; ')}`;
    }).join('\n');
    return `**Top ML Risk Scores:**\n\n${list}\n\nThese entities require immediate attention based on the ML analysis.`;
  }

  // --- driver behavior ---
  if (q.includes('driver') || q.includes('coaching') || q.includes('behavior') || q.includes('behaviour')) {
    const criticalVehicles = highRisk.filter(v => v.risk === 'critical');
    if (!criticalVehicles.length) {
      return 'No critical driver behavior issues detected in current data. Continue monitoring through the Fleet page.';
    }
    const list = criticalVehicles.map(v =>
      `• Driver on **${v.plate}** (${v.driver ?? '—'}): vehicle at CRITICAL risk, speed: ${v.speed} mph`
    ).join('\n');
    return `**Driver Safety Attention Needed:**\n\n${list}\n\nRecommendation: Schedule safety coaching sessions for drivers operating high-risk vehicles.`;
  }

  // --- default / catch-all ---
  return `**Fleet Intelligence Overview:**\n\n` +
    `Based on your imported data:\n` +
    `• **${kpi.total ?? 0}** vehicles registered | **${kpi.active ?? 0}** active\n` +
    `• **${kpi.active_trips ?? 0}** active trips | **${kpi.delayed_trips ?? 0}** delayed\n` +
    `• Fleet efficiency: **${Number(kpi.fleet_eff ?? 0).toFixed(1)}%**\n` +
    `• On-time rate: **${Number(kpi.on_time_rate ?? 0).toFixed(1)}%**\n\n` +
    `Ask me about: *fleet status, high-risk vehicles, delayed trips, fuel efficiency, route performance, driver behavior, or ML scores.*`;
}

// ─── POST /api/copilot/chat ───────────────────────────────────────────────────

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body as { message: string };
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const [kpi, highRisk, delayed, routes, fuel, mlHighRisk] = await Promise.all([
      getFleetSummary(),
      getHighRiskVehicles(),
      getDelayedTrips(),
      getRoutePerformance(),
      getFuelStats(),
      getMlScoresSummary(),
    ]);

    const answer = buildAnswer(
      message,
      kpi as RowDataPacket,
      highRisk,
      delayed,
      routes,
      fuel,
      mlHighRisk,
    );

    res.json({ data: { reply: answer, sources: { kpi, high_risk_count: highRisk.length, delayed_count: delayed.length } } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

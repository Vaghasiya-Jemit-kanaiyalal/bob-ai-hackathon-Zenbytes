"""
Fleet Risk & Efficiency Scoring Engine
=======================================
A fully self-contained statistical scoring pipeline.
No external model weights required — uses calibrated domain rules + Z-score
normalisation so every component is independently understandable and testable.

Architecture:
  TripFeatures / VehicleFeatures
       │
  ─────┼──────────────────────────────────────────────
  Component Scorers (0-100, higher = worse for risk)
  ─────┼──────────────────────────────────────────────
  DelayScorer          │ how late is this trip/vehicle?
  FuelScorer           │ how inefficient is fuel use?
  TrafficImpactScorer  │ how much does traffic hurt it?
  BehaviourScorer      │ driving behaviour risk events
  MaintenanceScorer    │ overdue service / low fuel
  ─────┼──────────────────────────────────────────────
  RiskAggregator       │ weighted combination → overall
       │
  RiskLevel (LOW/MEDIUM/HIGH/CRITICAL)
  Explanation (list of human-readable strings)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


# ─── Domain reference constants ──────────────────────────────────────────────

# Average fleet benchmarks (used for normalisation)
FLEET_AVG_DELAY_MIN   = 8.5      # minutes per trip
FLEET_AVG_FUEL_L100   = 14.0     # L / 100 km
FLEET_AVG_SPEED_MPH   = 42.0     # mph
SPEED_LIMIT_MPH       = 65.0
CRITICAL_SPEED_MPH    = 80.0
CRITICAL_FUEL_L100    = 25.0     # very inefficient
MIN_FUEL_LEVEL_PCT    = 20.0     # trigger warning below this
OVERDUE_SERVICE_DAYS  = 0        # ≥0 days past due → flag

# Score component weights (must sum to 1.0)
WEIGHTS = {
    "delay":        0.30,
    "fuel":         0.20,
    "traffic":      0.15,
    "behaviour":    0.25,
    "maintenance":  0.10,
}

# Risk band thresholds (overall 0-100 risk score)
RISK_THRESHOLDS = {
    "LOW":      (0,   35),
    "MEDIUM":   (35,  60),
    "HIGH":     (60,  80),
    "CRITICAL": (80, 100),
}


# ─── Input schemas ───────────────────────────────────────────────────────────

@dataclass
class TripFeatures:
    """All fields that describe a single trip."""
    trip_id:            str
    vehicle_id:         str
    delay_min:          float = 0.0        # actual - scheduled minutes
    distance_km:        float = 0.0
    duration_min:       float = 0.0        # actual trip duration
    scheduled_min:      float = 0.0        # planned duration
    fuel_used_l:        float = 0.0        # litres consumed
    avg_speed_mph:      float = 0.0
    max_speed_mph:      float = 0.0
    idle_time_min:      float = 0.0
    traffic_index:      float = 0.0        # 0-100 congestion level
    risk_events:        int   = 0          # total behaviour events
    critical_events:    int   = 0          # speeding / lane-departure
    on_time_route_pct:  float = 85.0       # historical on-time % of this route
    driver_incidents:   int   = 0


@dataclass
class VehicleFeatures:
    """Current vehicle state for real-time scoring."""
    vehicle_id:          str
    speed_mph:           float = 0.0
    fuel_level_pct:      float = 100.0
    avg_fuel_l100km:     float = 0.0
    odometer_km:         int   = 0
    next_service_km:     int   = 0         # 0 = unknown
    days_since_service:  int   = 0
    risk_events_7d:      int   = 0
    critical_events_7d:  int   = 0
    current_delay_min:   float = 0.0
    traffic_index:       float = 0.0
    driver_incidents:    int   = 0


# ─── Output ──────────────────────────────────────────────────────────────────

@dataclass
class ScoreResult:
    entity_id:          str
    entity_type:        str                # "trip" | "vehicle"
    delay_score:        float              # 0-100
    fuel_score:         float              # 0-100
    traffic_score:      float              # 0-100
    behaviour_score:    float              # 0-100
    maintenance_score:  float              # 0-100
    overall_score:      float              # 0-100 (weighted)
    risk_level:         str                # LOW / MEDIUM / HIGH / CRITICAL
    risk_factors:       list[str] = field(default_factory=list)
    recommendations:    list[str] = field(default_factory=list)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def sigmoid_score(raw: float, midpoint: float, steepness: float = 0.15) -> float:
    """Maps an unbounded raw value → 0-100 using a logistic curve.

    raw == midpoint  →  score ≈ 50
    raw << midpoint  →  score →   0
    raw >> midpoint  →  score → 100
    """
    return clamp(100.0 / (1.0 + math.exp(-steepness * (raw - midpoint))))


def linear_score(raw: float, zero_at: float, hundred_at: float) -> float:
    """Linear ramp: 0 at zero_at, 100 at hundred_at."""
    if hundred_at == zero_at:
        return 0.0
    return clamp((raw - zero_at) / (hundred_at - zero_at) * 100.0)


# ─── Component scorers ────────────────────────────────────────────────────────

class DelayScorer:
    """Scores how delayed this entity is (higher = more delayed = higher risk)."""

    def score_trip(self, f: TripFeatures) -> tuple[float, list[str], list[str]]:
        factors: list[str] = []
        recs:    list[str] = []

        # Base: how many multiples of fleet average is this delay?
        # 0 min delay → 0, fleet avg delay → 35, 3× avg → ~80
        s = sigmoid_score(f.delay_min, midpoint=FLEET_AVG_DELAY_MIN * 2.5, steepness=0.08)

        if f.delay_min <= 0:
            s = 0.0
        elif f.delay_min < 5:
            s = linear_score(f.delay_min, 0, 5) * 0.25
        elif f.delay_min > 30:
            factors.append(f"Severe delay of {f.delay_min:.0f} min (fleet avg {FLEET_AVG_DELAY_MIN:.0f} min)")
            recs.append("Investigate root cause: traffic, vehicle issue, or route planning gap")
        elif f.delay_min > 15:
            factors.append(f"Significant delay of {f.delay_min:.0f} min")

        # Route history penalty
        if f.on_time_route_pct < 70:
            s = clamp(s + 15)
            factors.append(f"Route historically on-time only {f.on_time_route_pct:.0f}% of the time")
            recs.append("Review route scheduling — add buffer time or re-optimise stops")

        return round(s, 1), factors, recs

    def score_vehicle(self, f: VehicleFeatures) -> tuple[float, list[str], list[str]]:
        tf = TripFeatures(
            trip_id="", vehicle_id=f.vehicle_id,
            delay_min=f.current_delay_min,
        )
        return self.score_trip(tf)


class FuelScorer:
    """Scores fuel inefficiency (higher = less efficient = higher risk/cost)."""

    def score_trip(self, f: TripFeatures) -> tuple[float, list[str], list[str]]:
        factors: list[str] = []
        recs:    list[str] = []

        if f.distance_km <= 0 or f.fuel_used_l <= 0:
            return 0.0, factors, recs

        l100 = (f.fuel_used_l / f.distance_km) * 100.0

        # 0 at fleet avg, 100 at critical threshold
        s = linear_score(l100, FLEET_AVG_FUEL_L100, CRITICAL_FUEL_L100)

        if l100 > CRITICAL_FUEL_L100 * 0.9:
            factors.append(f"Very high fuel consumption: {l100:.1f} L/100 km (fleet avg {FLEET_AVG_FUEL_L100:.0f})")
            recs.append("Check tyre pressure, engine condition and load weight")
        elif l100 > FLEET_AVG_FUEL_L100 * 1.3:
            factors.append(f"Above-average fuel use: {l100:.1f} L/100 km")

        # Idle penalty
        if f.duration_min > 0:
            idle_frac = f.idle_time_min / f.duration_min
            if idle_frac > 0.25:
                s = clamp(s + 15)
                factors.append(f"High idle fraction: {idle_frac:.0%} of trip duration")
                recs.append("Reduce idling — consider engine-off policy at stops >5 min")

        return round(s, 1), factors, recs

    def score_vehicle(self, f: VehicleFeatures) -> tuple[float, list[str], list[str]]:
        factors: list[str] = []
        recs:    list[str] = []
        s = linear_score(f.avg_fuel_l100km, FLEET_AVG_FUEL_L100, CRITICAL_FUEL_L100)
        if f.fuel_level_pct < MIN_FUEL_LEVEL_PCT:
            s = clamp(s + 20)
            factors.append(f"Low fuel level: {f.fuel_level_pct:.0f}%")
            recs.append("Refuel immediately to avoid trip abandonment")
        return round(s, 1), factors, recs


class TrafficImpactScorer:
    """Scores how much traffic is affecting this entity."""

    def _score(self, traffic_index: float) -> tuple[float, list[str], list[str]]:
        factors: list[str] = []
        recs:    list[str] = []
        # linear 0–80 index → 0–100 score
        s = linear_score(traffic_index, 0, 80)
        if traffic_index >= 75:
            factors.append(f"Severe congestion on current segment (index {traffic_index:.0f}/100)")
            recs.append("Dispatcher: consider alternate route or hold departure")
        elif traffic_index >= 50:
            factors.append(f"Moderate-to-heavy traffic (index {traffic_index:.0f}/100)")
        return round(s, 1), factors, recs

    def score_trip(self, f: TripFeatures) -> tuple[float, list[str], list[str]]:
        return self._score(f.traffic_index)

    def score_vehicle(self, f: VehicleFeatures) -> tuple[float, list[str], list[str]]:
        return self._score(f.traffic_index)


class BehaviourScorer:
    """Scores driver behaviour from risk events."""

    def _score(
        self,
        risk_events: int,
        critical_events: int,
        max_speed: float,
        driver_incidents: int,
    ) -> tuple[float, list[str], list[str]]:
        factors: list[str] = []
        recs:    list[str] = []

        s = 0.0

        # Per-event penalty: each risk event adds ~8 pts, each critical adds ~20
        s += clamp(risk_events * 8, 0, 60)
        s += clamp(critical_events * 20, 0, 60)
        s = clamp(s)

        # Speeding bonus
        if max_speed > CRITICAL_SPEED_MPH:
            s = clamp(s + 25)
            factors.append(f"Critical speed recorded: {max_speed:.0f} mph (limit {SPEED_LIMIT_MPH:.0f})")
            recs.append("Issue driver warning and schedule coaching session")
        elif max_speed > SPEED_LIMIT_MPH:
            s = clamp(s + 10)
            factors.append(f"Speed limit exceeded: {max_speed:.0f} mph")

        if critical_events > 0:
            factors.append(f"{critical_events} critical driving event(s) recorded")
        if risk_events > 2:
            factors.append(f"{risk_events} total risk event(s) this trip")

        # Historical driver incidents
        if driver_incidents >= 5:
            s = clamp(s + 15)
            factors.append(f"Driver has {driver_incidents} prior incidents on record")
            recs.append("Priority coaching — driver risk score elevated by history")
        elif driver_incidents >= 2:
            s = clamp(s + 5)

        return round(s, 1), factors, recs

    def score_trip(self, f: TripFeatures) -> tuple[float, list[str], list[str]]:
        return self._score(
            f.risk_events, f.critical_events,
            f.max_speed_mph, f.driver_incidents,
        )

    def score_vehicle(self, f: VehicleFeatures) -> tuple[float, list[str], list[str]]:
        return self._score(
            f.risk_events_7d, f.critical_events_7d,
            f.speed_mph, f.driver_incidents,
        )


class MaintenanceScorer:
    """Scores maintenance / vehicle condition risk."""

    def _score(
        self,
        fuel_level_pct: float,
        days_since_service: int,
        odometer_km: int,
        next_service_km: int,
    ) -> tuple[float, list[str], list[str]]:
        factors: list[str] = []
        recs:    list[str] = []
        s = 0.0

        # Overdue service by odometer
        if next_service_km > 0 and odometer_km > next_service_km:
            overdue_km = odometer_km - next_service_km
            s = clamp(linear_score(overdue_km, 0, 5000) * 0.7 + 30)
            factors.append(f"Service overdue by {overdue_km:,} km")
            recs.append("Schedule service immediately — continued operation increases breakdown risk")
        elif next_service_km > 0 and (next_service_km - odometer_km) < 2000:
            s += 20
            factors.append("Service due within 2,000 km")
            recs.append("Book service appointment within this week")

        # Very long since last service
        if days_since_service > 180:
            s = clamp(s + 20)
            factors.append(f"Last service was {days_since_service} days ago")

        # Low fuel
        if fuel_level_pct < MIN_FUEL_LEVEL_PCT:
            s = clamp(s + 25)
            factors.append(f"Low fuel: {fuel_level_pct:.0f}%")

        return round(clamp(s), 1), factors, recs

    def score_trip(self, f: TripFeatures) -> tuple[float, list[str], list[str]]:
        # Trips don't carry maintenance data → return neutral
        return 0.0, [], []

    def score_vehicle(self, f: VehicleFeatures) -> tuple[float, list[str], list[str]]:
        return self._score(
            f.fuel_level_pct,
            f.days_since_service,
            f.odometer_km,
            f.next_service_km,
        )


# ─── Aggregator ──────────────────────────────────────────────────────────────

class RiskAggregator:
    """Combines component scores into a single risk score + level + explanation."""

    def __init__(self) -> None:
        self._delay       = DelayScorer()
        self._fuel        = FuelScorer()
        self._traffic     = TrafficImpactScorer()
        self._behaviour   = BehaviourScorer()
        self._maintenance = MaintenanceScorer()

    @staticmethod
    def _level(score: float) -> str:
        for level, (lo, hi) in RISK_THRESHOLDS.items():
            if lo <= score < hi:
                return level
        return "CRITICAL"

    def _weighted(self, scores: dict[str, float]) -> float:
        return clamp(sum(scores[k] * WEIGHTS[k] for k in WEIGHTS))

    def score_trip(self, features: TripFeatures) -> ScoreResult:
        d_s, d_f, d_r = self._delay.score_trip(features)
        fu_s, fu_f, fu_r = self._fuel.score_trip(features)
        t_s, t_f, t_r = self._traffic.score_trip(features)
        b_s, b_f, b_r = self._behaviour.score_trip(features)
        m_s, m_f, m_r = self._maintenance.score_trip(features)

        overall = round(self._weighted({
            "delay": d_s, "fuel": fu_s, "traffic": t_s,
            "behaviour": b_s, "maintenance": m_s,
        }), 1)

        all_factors = d_f + fu_f + t_f + b_f + m_f
        all_recs    = d_r + fu_r + t_r + b_r + m_r

        if not all_factors:
            all_factors = ["No significant risk factors detected"]

        return ScoreResult(
            entity_id=features.trip_id,
            entity_type="trip",
            delay_score=d_s,
            fuel_score=fu_s,
            traffic_score=t_s,
            behaviour_score=b_s,
            maintenance_score=m_s,
            overall_score=overall,
            risk_level=self._level(overall),
            risk_factors=all_factors,
            recommendations=all_recs,
        )

    def score_vehicle(self, features: VehicleFeatures) -> ScoreResult:
        d_s, d_f, d_r = self._delay.score_vehicle(features)
        fu_s, fu_f, fu_r = self._fuel.score_vehicle(features)
        t_s, t_f, t_r = self._traffic.score_vehicle(features)
        b_s, b_f, b_r = self._behaviour.score_vehicle(features)
        m_s, m_f, m_r = self._maintenance.score_vehicle(features)

        overall = round(self._weighted({
            "delay": d_s, "fuel": fu_s, "traffic": t_s,
            "behaviour": b_s, "maintenance": m_s,
        }), 1)

        all_factors = d_f + fu_f + t_f + b_f + m_f
        all_recs    = d_r + fu_r + t_r + b_r + m_r

        if not all_factors:
            all_factors = ["No significant risk factors detected"]

        return ScoreResult(
            entity_id=features.vehicle_id,
            entity_type="vehicle",
            delay_score=d_s,
            fuel_score=fu_s,
            traffic_score=t_s,
            behaviour_score=b_s,
            maintenance_score=m_s,
            overall_score=overall,
            risk_level=self._level(overall),
            risk_factors=all_factors,
            recommendations=all_recs,
        )


# ─── Fleet-level aggregation ─────────────────────────────────────────────────

@dataclass
class FleetSummary:
    """Aggregate statistics computed from a list of ScoreResults."""
    total:           int
    avg_delay_score: float
    avg_fuel_score:  float
    avg_traffic_score: float
    avg_behaviour_score: float
    avg_overall_score: float
    low_count:       int
    medium_count:    int
    high_count:      int
    critical_count:  int
    top_risk_ids:    list[str]


def summarise_fleet(results: list[ScoreResult]) -> FleetSummary:
    if not results:
        return FleetSummary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [])

    def avg(vals: list[float]) -> float:
        return round(sum(vals) / len(vals), 1) if vals else 0.0

    counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for r in results:
        counts[r.risk_level] = counts.get(r.risk_level, 0) + 1

    top = sorted(results, key=lambda r: r.overall_score, reverse=True)[:5]

    return FleetSummary(
        total=len(results),
        avg_delay_score=avg([r.delay_score for r in results]),
        avg_fuel_score=avg([r.fuel_score for r in results]),
        avg_traffic_score=avg([r.traffic_score for r in results]),
        avg_behaviour_score=avg([r.behaviour_score for r in results]),
        avg_overall_score=avg([r.overall_score for r in results]),
        low_count=counts["LOW"],
        medium_count=counts["MEDIUM"],
        high_count=counts["HIGH"],
        critical_count=counts["CRITICAL"],
        top_risk_ids=[r.entity_id for r in top],
    )

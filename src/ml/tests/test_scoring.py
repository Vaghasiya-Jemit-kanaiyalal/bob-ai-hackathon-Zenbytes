"""
Tests for the Fleet ML scoring engine and FastAPI endpoints.
Run with:  pytest tests/ -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.scoring import (
    RiskAggregator,
    TripFeatures,
    VehicleFeatures,
    summarise_fleet,
    RISK_THRESHOLDS,
)
from main import app

client = TestClient(app)
agg    = RiskAggregator()


# ─── Scoring engine unit tests ───────────────────────────────────────────────

class TestDelayScorer:
    def test_zero_delay_gives_low_score(self):
        f = TripFeatures(trip_id="T1", vehicle_id="V1", delay_min=0)
        r = agg.score_trip(f)
        assert r.delay_score == 0.0

    def test_high_delay_increases_score(self):
        f_low  = TripFeatures(trip_id="T1", vehicle_id="V1", delay_min=5)
        f_high = TripFeatures(trip_id="T2", vehicle_id="V1", delay_min=40)
        assert agg.score_trip(f_high).delay_score > agg.score_trip(f_low).delay_score

    def test_poor_route_history_adds_penalty(self):
        f_good = TripFeatures(trip_id="T1", vehicle_id="V1", delay_min=10, on_time_route_pct=90)
        f_bad  = TripFeatures(trip_id="T2", vehicle_id="V1", delay_min=10, on_time_route_pct=60)
        assert agg.score_trip(f_bad).delay_score > agg.score_trip(f_good).delay_score


class TestFuelScorer:
    def test_zero_fuel_returns_zero(self):
        f = TripFeatures(trip_id="T1", vehicle_id="V1", fuel_used_l=0, distance_km=50)
        assert agg.score_trip(f).fuel_score == 0.0

    def test_high_consumption_high_score(self):
        f_eff   = TripFeatures(trip_id="T1", vehicle_id="V1", fuel_used_l=5,  distance_km=50)
        f_ineff = TripFeatures(trip_id="T2", vehicle_id="V1", fuel_used_l=20, distance_km=50)
        assert agg.score_trip(f_ineff).fuel_score > agg.score_trip(f_eff).fuel_score

    def test_high_idle_penalty(self):
        f_low  = TripFeatures(trip_id="T1", vehicle_id="V1", fuel_used_l=8, distance_km=50,
                               duration_min=60, idle_time_min=5)
        f_high = TripFeatures(trip_id="T2", vehicle_id="V1", fuel_used_l=8, distance_km=50,
                               duration_min=60, idle_time_min=20)
        assert agg.score_trip(f_high).fuel_score > agg.score_trip(f_low).fuel_score


class TestBehaviourScorer:
    def test_clean_record_is_low(self):
        f = TripFeatures(trip_id="T1", vehicle_id="V1")
        assert agg.score_trip(f).behaviour_score == 0.0

    def test_critical_events_raise_score(self):
        f_ok  = TripFeatures(trip_id="T1", vehicle_id="V1", critical_events=0)
        f_bad = TripFeatures(trip_id="T2", vehicle_id="V1", critical_events=3)
        assert agg.score_trip(f_bad).behaviour_score > agg.score_trip(f_ok).behaviour_score

    def test_speeding_over_critical_threshold(self):
        f = TripFeatures(trip_id="T1", vehicle_id="V1", max_speed_mph=85)
        r = agg.score_trip(f)
        assert r.behaviour_score >= 25
        assert any("speed" in factor.lower() for factor in r.risk_factors)


class TestMaintenanceScorer:
    def test_overdue_vehicle_high_score(self):
        f = VehicleFeatures(
            vehicle_id="V1",
            odometer_km=160_000,
            next_service_km=155_000,   # 5000 km overdue
            days_since_service=200,
            fuel_level_pct=50,
        )
        r = agg.score_vehicle(f)
        assert r.maintenance_score >= 30
        assert any("overdue" in factor.lower() for factor in r.risk_factors)

    def test_healthy_vehicle_low_maintenance_score(self):
        f = VehicleFeatures(
            vehicle_id="V1",
            odometer_km=50_000,
            next_service_km=55_000,
            days_since_service=30,
            fuel_level_pct=80,
        )
        r = agg.score_vehicle(f)
        assert r.maintenance_score < 20


class TestRiskLevel:
    def test_clean_trip_is_low(self):
        f = TripFeatures(trip_id="T1", vehicle_id="V1")
        assert agg.score_trip(f).risk_level == "LOW"

    def test_very_bad_trip_is_critical(self):
        f = TripFeatures(
            trip_id="T1", vehicle_id="V1",
            delay_min=60,
            fuel_used_l=25, distance_km=50,
            max_speed_mph=90,
            critical_events=5,
            traffic_index=90,
            driver_incidents=8,
            on_time_route_pct=50,
        )
        r = agg.score_trip(f)
        assert r.risk_level in ("HIGH", "CRITICAL")

    def test_all_levels_covered_by_thresholds(self):
        levels = set(RISK_THRESHOLDS.keys())
        assert levels == {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

    def test_score_bounds(self):
        f = TripFeatures(
            trip_id="T1", vehicle_id="V1",
            delay_min=999, fuel_used_l=100, distance_km=10,
            max_speed_mph=200, critical_events=50,
        )
        r = agg.score_trip(f)
        assert 0 <= r.overall_score <= 100
        assert 0 <= r.delay_score <= 100
        assert 0 <= r.fuel_score <= 100
        assert 0 <= r.behaviour_score <= 100


class TestFleetSummary:
    def test_empty_fleet(self):
        s = summarise_fleet([])
        assert s.total == 0

    def test_counts_correct(self):
        results = [
            agg.score_trip(TripFeatures(trip_id="T1", vehicle_id="V1")),                  # LOW
            agg.score_trip(TripFeatures(trip_id="T2", vehicle_id="V1",
                                        delay_min=15, traffic_index=55)),                 # MEDIUM
            agg.score_trip(TripFeatures(trip_id="T3", vehicle_id="V1",
                                        critical_events=4, max_speed_mph=85,
                                        delay_min=35, traffic_index=80)),                 # HIGH+
        ]
        s = summarise_fleet(results)
        assert s.total == 3
        assert s.low_count + s.medium_count + s.high_count + s.critical_count == 3


# ─── FastAPI endpoint tests ──────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert r.json()["service"] == "fleet-ml"


class TestScoreTripEndpoint:
    def test_basic_trip(self):
        payload = {
            "trip_id": "TR-001", "vehicle_id": "VH-001",
            "delay_min": 18, "distance_km": 48, "fuel_used_l": 5.2,
            "avg_speed_mph": 34, "max_speed_mph": 65,
            "traffic_index": 58, "risk_events": 1,
        }
        r = client.post("/score/trip", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["entity_id"] == "TR-001"
        assert data["entity_type"] == "trip"
        assert 0 <= data["overall_score"] <= 100
        assert data["risk_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
        assert isinstance(data["risk_factors"], list)
        assert isinstance(data["recommendations"], list)

    def test_clean_trip_low_risk(self):
        payload = {"trip_id": "TR-X", "vehicle_id": "VH-X"}
        r = client.post("/score/trip", json=payload)
        assert r.status_code == 200
        assert r.json()["risk_level"] == "LOW"

    def test_critical_trip(self):
        payload = {
            "trip_id": "TR-BAD", "vehicle_id": "VH-001",
            "delay_min": 55, "distance_km": 40, "fuel_used_l": 22,
            "max_speed_mph": 88, "critical_events": 4, "traffic_index": 85,
            "driver_incidents": 7, "on_time_route_pct": 55,
        }
        r = client.post("/score/trip", json=payload)
        assert r.status_code == 200
        assert r.json()["risk_level"] in ("HIGH", "CRITICAL")


class TestScoreVehicleEndpoint:
    def test_healthy_vehicle(self):
        payload = {
            "vehicle_id": "VH-007",
            "speed_mph": 40, "fuel_level_pct": 91,
            "avg_fuel_l100km": 7.3, "odometer_km": 34200,
            "next_service_km": 40000, "days_since_service": 10,
        }
        r = client.post("/score/vehicle", json=payload)
        assert r.status_code == 200
        assert r.json()["risk_level"] == "LOW"

    def test_critical_vehicle(self):
        payload = {
            "vehicle_id": "VH-011",
            "speed_mph": 61, "fuel_level_pct": 15,
            "avg_fuel_l100km": 26, "odometer_km": 340000,
            "next_service_km": 330000, "days_since_service": 210,
            "risk_events_7d": 6, "critical_events_7d": 2,
            "current_delay_min": 38, "traffic_index": 79,
            "driver_incidents": 7,
        }
        r = client.post("/score/vehicle", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["risk_level"] in ("HIGH", "CRITICAL")
        assert len(data["risk_factors"]) >= 2

    def test_low_fuel_flagged(self):
        payload = {
            "vehicle_id": "VH-X",
            "fuel_level_pct": 10,
            "avg_fuel_l100km": 12,
        }
        r = client.post("/score/vehicle", json=payload)
        data = r.json()
        assert any("fuel" in f.lower() for f in data["risk_factors"])


class TestBatchEndpoints:
    def test_batch_trips(self):
        payload = {
            "trips": [
                {"trip_id": "T1", "vehicle_id": "V1", "delay_min": 5},
                {"trip_id": "T2", "vehicle_id": "V2", "delay_min": 30, "critical_events": 2},
            ]
        }
        r = client.post("/score/trips/batch", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) == 2
        assert data["summary"]["total"] == 2
        assert data["summary"]["low_count"] + data["summary"]["medium_count"] \
             + data["summary"]["high_count"] + data["summary"]["critical_count"] == 2

    def test_batch_vehicles(self):
        payload = {
            "vehicles": [
                {"vehicle_id": "V1", "fuel_level_pct": 80},
                {"vehicle_id": "V2", "fuel_level_pct": 10, "risk_events_7d": 5},
            ]
        }
        r = client.post("/score/vehicles/batch", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) == 2
        assert data["summary"]["total"] == 2

    def test_summary_top_risk_ids_present(self):
        payload = {
            "trips": [{"trip_id": f"T{i}", "vehicle_id": "V1"} for i in range(6)]
        }
        r = client.post("/score/trips/batch", json=payload)
        assert len(r.json()["summary"]["top_risk_ids"]) <= 5

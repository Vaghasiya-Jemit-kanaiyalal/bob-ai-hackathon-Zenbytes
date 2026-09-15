"""
Pydantic request / response schemas for the ML API.
All fields mirror the scoring.py dataclasses so JSON serialisation is automatic.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ─── Request models ──────────────────────────────────────────────────────────

class TripScoreRequest(BaseModel):
    trip_id:            str
    vehicle_id:         str
    delay_min:          float = 0.0
    distance_km:        float = 0.0
    duration_min:       float = 0.0
    scheduled_min:      float = 0.0
    fuel_used_l:        float = 0.0
    avg_speed_mph:      float = 0.0
    max_speed_mph:      float = 0.0
    idle_time_min:      float = 0.0
    traffic_index:      float = Field(default=0.0, ge=0, le=100)
    risk_events:        int   = 0
    critical_events:    int   = 0
    on_time_route_pct:  float = Field(default=85.0, ge=0, le=100)
    driver_incidents:   int   = 0


class VehicleScoreRequest(BaseModel):
    vehicle_id:          str
    speed_mph:           float = 0.0
    fuel_level_pct:      float = Field(default=100.0, ge=0, le=100)
    avg_fuel_l100km:     float = 0.0
    odometer_km:         int   = 0
    next_service_km:     int   = 0
    days_since_service:  int   = 0
    risk_events_7d:      int   = 0
    critical_events_7d:  int   = 0
    current_delay_min:   float = 0.0
    traffic_index:       float = Field(default=0.0, ge=0, le=100)
    driver_incidents:    int   = 0


class BatchTripRequest(BaseModel):
    trips: list[TripScoreRequest]


class BatchVehicleRequest(BaseModel):
    vehicles: list[VehicleScoreRequest]


# ─── Response models ─────────────────────────────────────────────────────────

class ScoreResponse(BaseModel):
    entity_id:          str
    entity_type:        str
    delay_score:        float = Field(..., ge=0, le=100, description="0=none 100=worst")
    fuel_score:         float = Field(..., ge=0, le=100)
    traffic_score:      float = Field(..., ge=0, le=100)
    behaviour_score:    float = Field(..., ge=0, le=100)
    maintenance_score:  float = Field(..., ge=0, le=100)
    overall_score:      float = Field(..., ge=0, le=100)
    risk_level:         str   = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    risk_factors:       list[str]
    recommendations:    list[str]


class BatchScoreResponse(BaseModel):
    results:  list[ScoreResponse]
    summary:  FleetSummaryResponse


class FleetSummaryResponse(BaseModel):
    total:                int
    avg_delay_score:      float
    avg_fuel_score:       float
    avg_traffic_score:    float
    avg_behaviour_score:  float
    avg_overall_score:    float
    low_count:            int
    medium_count:         int
    high_count:           int
    critical_count:       int
    top_risk_ids:         list[str]


class HealthResponse(BaseModel):
    ok:       bool = True
    service:  str  = "fleet-ml"
    version:  str  = "1.0.0"

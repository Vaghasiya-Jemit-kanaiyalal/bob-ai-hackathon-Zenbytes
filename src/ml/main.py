"""
FastAPI application — Fleet ML Scoring Service
Runs on port 5000 by default (set ML_PORT env var to override).

Endpoints
─────────
GET  /health                       liveness check
POST /score/trip                   score one trip
POST /score/vehicle                score one vehicle
POST /score/trips/batch            score many trips → summary included
POST /score/vehicles/batch         score many vehicles → summary included
POST /score/fleet                  combined trip + vehicle batch with fleet summary
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from dataclasses import asdict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    BatchScoreResponse,
    BatchTripRequest,
    BatchVehicleRequest,
    FleetSummaryResponse,
    HealthResponse,
    ScoreResponse,
    TripScoreRequest,
    VehicleScoreRequest,
)
from app.scoring import (
    RiskAggregator,
    ScoreResult,
    TripFeatures,
    VehicleFeatures,
    summarise_fleet,
)

load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger("fleet-ml")


# ─── App lifecycle ───────────────────────────────────────────────────────────

# Initialised eagerly so tests and imports work without running the server
aggregator: RiskAggregator = RiskAggregator()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global aggregator
    aggregator = RiskAggregator()
    logger.info("RiskAggregator initialised")
    yield
    logger.info("Fleet ML service shutting down")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Fleet Intelligence ML Service",
    description="Statistical risk & efficiency scoring for Urban Fleet Intelligence Copilot",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _result_to_response(r: ScoreResult) -> ScoreResponse:
    return ScoreResponse(**asdict(r))


def _summary_response(results: list[ScoreResult]) -> FleetSummaryResponse:
    s = summarise_fleet(results)
    return FleetSummaryResponse(**asdict(s))


def _trip_features(req: TripScoreRequest) -> TripFeatures:
    return TripFeatures(**req.model_dump())


def _vehicle_features(req: VehicleScoreRequest) -> VehicleFeatures:
    return VehicleFeatures(**req.model_dump())


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    return HealthResponse()


@app.post("/score/trip", response_model=ScoreResponse, tags=["scoring"])
async def score_trip(req: TripScoreRequest) -> ScoreResponse:
    result = aggregator.score_trip(_trip_features(req))
    logger.debug("trip %s → %.1f (%s)", req.trip_id, result.overall_score, result.risk_level)
    return _result_to_response(result)


@app.post("/score/vehicle", response_model=ScoreResponse, tags=["scoring"])
async def score_vehicle(req: VehicleScoreRequest) -> ScoreResponse:
    result = aggregator.score_vehicle(_vehicle_features(req))
    logger.debug("vehicle %s → %.1f (%s)", req.vehicle_id, result.overall_score, result.risk_level)
    return _result_to_response(result)


@app.post("/score/trips/batch", response_model=BatchScoreResponse, tags=["scoring"])
async def score_trips_batch(req: BatchTripRequest) -> BatchScoreResponse:
    results = [aggregator.score_trip(_trip_features(t)) for t in req.trips]
    return BatchScoreResponse(
        results=[_result_to_response(r) for r in results],
        summary=_summary_response(results),
    )


@app.post("/score/vehicles/batch", response_model=BatchScoreResponse, tags=["scoring"])
async def score_vehicles_batch(req: BatchVehicleRequest) -> BatchScoreResponse:
    results = [aggregator.score_vehicle(_vehicle_features(v)) for v in req.vehicles]
    return BatchScoreResponse(
        results=[_result_to_response(r) for r in results],
        summary=_summary_response(results),
    )


@app.post("/score/fleet", tags=["scoring"])
async def score_fleet(
    trips_req:    BatchTripRequest,
    vehicles_req: BatchVehicleRequest,
) -> dict:
    """Score all trips AND vehicles in one call and return combined fleet summary."""
    trip_results    = [aggregator.score_trip(_trip_features(t))    for t in trips_req.trips]
    vehicle_results = [aggregator.score_vehicle(_vehicle_features(v)) for v in vehicles_req.vehicles]
    all_results = trip_results + vehicle_results
    return {
        "trips":    [_result_to_response(r).model_dump() for r in trip_results],
        "vehicles": [_result_to_response(r).model_dump() for r in vehicle_results],
        "summary":  _summary_response(all_results).model_dump(),
    }

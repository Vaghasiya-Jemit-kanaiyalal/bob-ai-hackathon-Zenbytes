
# Solution Overview

## What We Built

YatraDrishti ("Journey Vision" in Hindi) is an AI-powered Urban Fleet Intelligence Copilot for Indian logistics operators. It gives fleet managers and dispatchers a single unified platform where they can upload daily trip data as a CSV, instantly see AI-generated risk scores for every vehicle and trip, monitor live KPIs and analytics charts, and ask plain-language questions about their fleet through an conversational copilot — all without needing expensive enterprise telematics hardware or dedicated data teams.

## How It Works

1. **Upload trip data** — The dispatcher uploads a CSV file (columns: `vehicle_id`, `route`, `distance_km`, `expected_time`, `actual_time`, `fuel_used`, `traffic`) through the Data Center page. The system validates every row client-side before upload and server-side before processing.
2. **Parse, validate & store** — The Express backend parses the CSV, upserts vehicles and routes into MySQL if they don't already exist, inserts new trip records with computed delay and status fields, then updates each vehicle's trip count.
3. **ML risk scoring** — The backend immediately sends the imported trips and vehicles to the FastAPI ML microservice as batch requests. The ML service scores each entity across five dimensions — delay, fuel efficiency, traffic exposure, driver behaviour, and maintenance — and returns an `overall_score` (0–100) and a `risk_level` (LOW / MEDIUM / HIGH / CRITICAL) with specific risk factors and recommendations.
4. **Results stored & surfaced** — ML scores are persisted to the `ml_scores` MySQL table and the full import result (including all scores) is returned to the frontend, which stores it in a React context so every page — Dashboard, Analytics, Fleet, Trips — immediately shows real data without needing a page reload.
5. **Live dashboard & analytics** — The Dashboard shows KPI tiles (total vehicles, active, delayed trips, high-risk trips, on-time rate, fleet efficiency) plus route performance charts and a fleet risk overview table. The Analytics page shows delay trends, fuel consumption, vehicle utilisation, risk event distribution, and per-vehicle ML score breakdowns — all from the imported data.
6. **AI Copilot** —  Dispatchers can ask natural-language questions like *"Which vehicles on NH-48 are at critical risk?"*  and get instant, context-aware answers grounded in the fleet's own data.

## Architecture Diagram

> See [`architecture.md`](architecture.md) for the detailed diagram.

```
[Browser: React 19 + Vite]
        |  REST + JWT
        v
[Backend API: Express 4 + TypeScript :4000]
        |              |              |
   SQL queries    HTTP /score    Copilot queries
        v              v              v
  [MySQL 8]   [ML Service:       [fastAPI query]
               FastAPI :5000]
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Separate FastAPI ML microservice | Keeps the scoring logic (numpy / scipy) fully isolated from the Node.js backend; the ML service can be swapped for a watsonx.ai inference endpoint with no backend changes |
| Store import result in React context (`DataRefreshContext`) | The backend analytics read-APIs can be slow to reflect newly inserted data; caching the import result in context means all pages show real data instantly after upload with zero extra API calls |
| CSV-first data ingestion | Indian mid-market fleet operators export CSV from basic GPS trackers — meeting them at their existing workflow requires zero new hardware or integrations |
| JWT-only authentication (no OAuth) | Keeps the prototype self-contained and evaluator-friendly; every protected API route enforces Bearer token validation through a single Express middleware |
| Demo Mode toggle in TopNav | Lets evaluators see a fully populated UI without needing a running database, by switching all pages to static Indian mock data (Tata, Mahindra, Ashok Leyland vehicles; Pune/Bengaluru routes) at the click of a button |
| Five-dimension ML scoring model | Decomposing risk into delay, fuel, traffic, behaviour, and maintenance gives actionable, explainable scores rather than a single opaque number — operators can see exactly which dimension is driving risk |

## IBM Technologies Used

- **IBM Bob:** IBM Bob is the core AI-powered development and orchestration platform behind the entire YatraDrishti project. The project has been planned, designed, and developed using IBM Bob, with its features, modules, workflows, and overall system architecture created and managed through the Bob workspace and its agent capabilities. IBM Bob has been used throughout the development process to accelerate implementation, integrate different modules, and support the project's AI-driven functionality. In future iterations, we plan to further extend YatraDrishti by integrating Watsonx APIs to enhance its AI capabilities, intelligence, and enterprise-level scalability.



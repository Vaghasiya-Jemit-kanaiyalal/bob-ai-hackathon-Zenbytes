

# 🚚 Urban Fleet Intelligence Copilot

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | Zenbytes |
| **Track** | Open |
| **Team Lead** | Jemit Vaghasiya — 24dcs145@charusat.edu.in |
| **Members** | Jay Sohaliya , Yug Bhensadaiya , Yug Bhungaliya |

---

## 🎯 Problem Statement

Urban fleet operators managing multiple vehicles, routes, and deliveries lack a unified, intelligent way to detect inefficient routes, delayed vehicles, and high-risk trips in real time. Dispatchers and fleet managers spend excessive time manually cross-referencing spreadsheets, GPS logs, and trip records — resulting in increased fuel consumption, missed delivery windows, and avoidable safety incidents. Without proactive ML-driven insights, problems are identified only after they have already caused operational and financial damage.

---

## 💡 Solution

Urban Fleet Intelligence Copilot is an AI-powered fleet management platform that ingests structured CSV trip data, runs an ML risk-scoring pipeline across every vehicle and trip, and surfaces prioritised recommendations through an interactive dashboard and a natural-language AI Copilot. Fleet managers upload a single CSV file to instantly receive risk scores, delay analytics, fuel efficiency breakdowns, and actionable route optimisation advice — all powered by a FastAPI ML service and an Express + MySQL backend, with IBM Bob embedded as the AI Copilot interface.

---

## ✨ Key Features

- **CSV-driven Fleet Import & ML Scoring:** Upload a single CSV file (vehicle ID, route, distance, expected/actual time, fuel, traffic) and the platform immediately scores every trip and vehicle with multi-factor ML risk levels (LOW / MEDIUM / HIGH / CRITICAL).
- **Live Dashboard with KPI Tiles:** Real-time fleet health summary — total vehicles, active trips, delayed trips, high-risk alerts, fleet efficiency %, and on-time rate — all computed from imported data, no manual entry.
- **AI Copilot** Natural-language chat interface that queries the live MySQL fleet database to answer questions like "Which vehicles are at highest risk?" or "Which route causes the most delays?".
- **Analytics Page with Risk & Fuel Charts:** Delay trend lines, fuel consumption bar charts, vehicle utilisation breakdowns, risk event distribution donut, and per-vehicle ML score component breakdown — all rendered from real imported data.
- **Demo Mode:** One-click toggle in the navigation bar loads a full Indian fleet dataset (12 vehicles, 8 routes, 10 trips) so judges and users can explore all features without needing a backend connection.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | TypeScript, Python |
| **Frameworks** | React 19, Vite, Express 4, FastAPI |
| **IBM Technologies** | IBM Bob  |
| **Databases** | MySQL 8 |
| **Other** | Recharts, Lucide React, React Router v7, JWT Auth, Multer, NumPy, SciPy |

---

## 📁 Repository Structure

```
├── src/
│   ├── frontend/             # React 19 + Vite + TypeScript SPA
│   │   ├── src/
│   │   │   ├── pages/        # Dashboard, Fleet, Trips, Routes, Analytics, DataCenter, Copilot
│   │   │   ├── components/   # TopNav, Layout, KpiTile, Card, EmptyState, MlScoresPanel, …
│   │   │   ├── context/      # AuthContext, DataRefreshContext, DemoModeContext
│   │   │   └── data/         # api.ts (real backend), mockData.ts (demo mode)
│   │   └── public/datasets/  # Sample CSV files for quick testing
│   ├── backend/              # Express 4 + TypeScript REST API
│   │   ├── src/
│   │   │   ├── routes/       # auth, vehicles, routes, trips, analytics, ml, import, copilot
│   │   │   ├── middleware/   # JWT auth guard
│   │   │   └── mlClient.ts   # HTTP client for the Python ML service
│   │   └── schema.sql        # MySQL schema (run once)
│   └── ml/                   # FastAPI Python ML scoring service
│       ├── app/              # Scoring logic (delay, fuel, traffic, behaviour, maintenance)
│       └── main.py           # FastAPI entry point
├── docs/
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/
│   ├── screenshots/
│   ├── demo-video-link.txt
│   └── live-demo-url.txt
├── presentation/
└── submission.yaml
```

---

## ⚡ How to Run

> Full instructions in [`docs/setup-guide.md`](docs/setup-guide.md)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/bob-ai-hackathon-Zenbytes.git
cd bob-ai-hackathon-Zenbytes

# 2. Backend — install & configure
cd src/backend
cp .env.example .env          # fill in DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm install
mysql -u root -p fleet_db < schema.sql
npm run build
npm start                     # API on http://localhost:4000

# 3. ML service — install & run (separate terminal)
cd src/ml
pip install -r requirements.txt
uvicorn main:app --port 5000  # ML service on http://localhost:5000

# 4. Frontend — install & run (separate terminal)
cd src/frontend
npm install
npm run dev                   # App on http://localhost:5173
```

> **No backend?** Open the app, click the **Demo** button in the top nav to explore all features with built-in Indian fleet sample data.

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/](presentation/) |

---

## ⚠️ Known Limitations

- **ML service is rule-based, not a trained model:** The scoring engine uses NumPy/SciPy heuristics (delay ratio, fuel deviation, traffic penalty) rather than a trained neural network. Scores are accurate and meaningful but not learned from historical data.
- **Demo Mode uses static mock data:** The built-in Indian fleet dataset (Tata, Mahindra, Ashok Leyland vehicles on Pune/Delhi/Bengaluru routes) is hardcoded for offline exploration — it does not update with new uploads.
- **AI Copilot requires a running backend + MySQL:** natural-language answers query the live database; responses fall back to a helpful error message if the backend is offline.
- **No real-time GPS tracking:** Vehicle locations and speeds shown on the fleet page are from the imported CSV snapshot, not live telemetry.
- **Single-user session:** Authentication is JWT-based but role-based access control (dispatcher vs. analyst vs. viewer) is scaffolded in the schema and not yet enforced in the UI.

---

## 🏅 What We're Most Proud Of

The **zero-to-insights pipeline** — a fleet manager with no technical background can upload one CSV file and within seconds see ML-scored risk levels for every vehicle and trip, a populated analytics dashboard with delay trends and fuel charts, and get natural-language answers from the AI Copilot about their specific data. The entire flow from raw CSV → ML scoring → KPI dashboard → AI Q&A works end-to-end with a real Python ML service, a real MySQL-backed REST API, and a real-time React frontend — all in a single cohesive product. The **Demo Mode** ensures judges can explore everything without any infrastructure.

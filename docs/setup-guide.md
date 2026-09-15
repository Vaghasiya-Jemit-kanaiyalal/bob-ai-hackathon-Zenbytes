
# Setup Guide

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

Before you begin, ensure you have the following installed:

- [ ] Node.js 18+ (backend and frontend)
- [ ] Python 3.11+ (ML service)
- [ ] MySQL 8.0+ (local install or Docker)
- [ ] npm 9+ (comes with Node.js)
- [ ] pip / venv (comes with Python)

## Environment Variables

Copy `.env.example` to `.env` inside `src/backend/` and fill in your values:

```bash
cp src/backend/.env.example src/backend/.env
```

| Variable | Description | Required |
|---|---|---|
| `PORT` | Port for the Express API server | No (default: `4000`) |
| `DB_HOST` | MySQL host | Yes |
| `DB_PORT` | MySQL port | No (default: `3306`) |
| `DB_USER` | MySQL username | Yes |
| `DB_PASSWORD` | MySQL password | Yes |
| `DB_NAME` | MySQL database name | Yes (create as `fleet_db`) |
| `DB_POOL_MAX` | Max DB connection pool size | No (default: `10`) |
| `FRONTEND_URL` | Allowed CORS origin for the frontend | No (default: `http://localhost:5173`) |
| `JWT_SECRET` | Secret key used to sign JWT tokens | Yes (any long random string) |
| `ML_URL` | Base URL of the FastAPI ML service | No (default: `http://localhost:5000`) |
| `ML_TIMEOUT_MS` | Timeout for ML scoring requests in ms | No (default: `4000`) |

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Zenbytes/bob-ai-hackathon-Zenbytes.git
cd bob-ai-hackathon-Zenbytes

# 2. Create the MySQL database and apply schema
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS fleet_db;"
mysql -u root -p fleet_db < src/backend/schema.sql

# 3. Install and build the backend
cd src/backend
npm install
npm run build
cd ../..

# 4. Install frontend dependencies
cd src/frontend
npm install
cd ../..

# 5. Install ML service dependencies
cd src/ml
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

## Running the Application

Open **three terminals** — one per service:

```bash
# Terminal 1 — Backend API (port 4000)
cd src/backend
npm start

# Terminal 2 — ML service (port 5000)
cd src/ml
# activate venv first (see step 5 above)
uvicorn main:app --host 0.0.0.0 --port 5000 --reload

# Terminal 3 — Frontend (port 5173)
cd src/frontend
npm run dev
```

The application will be available at: `http://localhost:5173`

## Running Tests

```bash
# Backend — TypeScript type-check
cd src/backend
npm run lint

# ML service — pytest
cd src/ml
pytest -v
```

## Quick Demo (Optional)

The fastest way to see the full system end-to-end:

1. Start all three services (see **Running the Application** above)
2. Open `http://localhost:5173` and register a new account
3. Navigate to **Data Center** in the sidebar
4. Click **Download Sample CSV** to get `yatradrishti-sample.csv`
5. Upload the file and click **Import CSV**
6. Click **Go to Dashboard** — KPI tiles, charts, and risk tables populate instantly
7. Open **Copilot** and ask: *"Which vehicles are at critical risk?"*

## Troubleshooting

| Issue | Solution |
|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:3306` | MySQL is not running — start with `brew services start mysql` (macOS) or `net start MySQL80` (Windows) |
| `Cannot find module 'dist/server.js'` | Run `npm run build` inside `src/backend/` first |
| Backend DB endpoints return 500 | Check `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `src/backend/.env` and confirm schema was applied |
| Import returns 503 for ML scoring | Start the FastAPI ML service — backend logs `ML service offline` on startup if port 5000 is unreachable |
| CORS error in browser console | Set `FRONTEND_URL=http://localhost:5173` in `src/backend/.env` |
| `vite: command not found` | Run `npm install` inside `src/frontend/` — Vite is a dev dependency |
| Login always returns 401 | `JWT_SECRET` must be set in `src/backend/.env` — use `openssl rand -hex 32` to generate one |

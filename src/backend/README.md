# ThreatLens AI — Backend

FastAPI backend for the ThreatLens AI threat intelligence correlation and alert prioritisation system.

## Prerequisites

- Python 3.14 (recommended) or Python 3.11+
- pip

## Setup

```bash
# from repo root
cd src/backend

# create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# install dependencies
pip install -r requirements.txt

# copy and configure environment
cp .env.example .env
```

## Start the backend

```bash
# from src/backend/
uvicorn app.main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**

Interactive docs: **http://localhost:8000/docs**

## Start the frontend (separate terminal)

```bash
# from src/frontend/
npm install
npm run dev
```

The frontend will be available at **http://localhost:5173**

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Service health check |
| POST | `/api/v1/alerts/ingest` | Ingest raw alert feed(s) |
| GET | `/api/v1/alerts` | List all alerts (filterable) |
| GET | `/api/v1/alerts/{id}` | Single alert detail |
| GET | `/api/v1/incidents` | List all correlated incidents |
| GET | `/api/v1/incidents/{id}` | Single incident detail with timeline |
| GET | `/api/v1/priorities` | Priority queue (CRITICAL/HIGH first) |
| POST | `/api/v1/demo/simulate-attack` | Inject multi-stage attack scenario |
| GET | `/api/v1/mitre/coverage` | MITRE ATT&CK technique coverage |
| GET | `/api/v1/investigations/{id}` | Evidence-backed investigation + BLUF |
| POST | `/api/v1/investigations/{id}/refresh` | Refresh investigation package |
| GET | `/api/v1/reports` | Generate reports from correlated incidents |
| GET | `/api/v1/reports/{id}` | Get one BLUF report |
| GET | `/api/v1/threat-intelligence/search?q=...` | Search observed indicators |

## Ingest format

```json
[
  {
    "source": "SIEM",
    "payload": {
      "event": "Suspicious Domain Controller Login",
      "src_ip": "185.20.10.5",
      "dest_ip": "10.0.0.15",
      "host": "DC-GLOBAL-01",
      "severity": "HIGH"
    }
  }
]
```

Accepted `source` values: `SIEM`, `EDR`, `Network Sensor`, `Threat Intel`

## Run tests

```bash
# from src/backend/
pytest tests/ -v
```

## Database

SQLite file is written to `src/backend/threatlens.db` on first startup.
The database is seeded automatically with realistic demo data if it is empty.
Delete `threatlens.db` to reset to the seeded state.

## IBM Bob MCP integration

ThreatLens includes a dependency-light local MCP server at `mcp_server.py`. It exposes read-only tools for incidents, correlated alerts, investigations/BLUF, indicator search and MITRE coverage. The project-level `.bob/mcp.json` registers it for IBM Bob over STDIO. Start the FastAPI service first, then enable MCP servers in IBM Bob.

This makes Bob load-bearing for incident investigation without inventing a browser/runtime Bob API: Bob reads the same live ThreatLens evidence that powers the dashboard.

## ML threat assessment
On first backend startup, ThreatLens trains/loads a XGBoost threat classifier from `app/ml/`. The model is trained from a broad synthetic corpus (44 scenarios), with stratified validation, 5-fold CV, hyperparameter selection and an untouched test set. Runtime incidents expose `mlThreatProbability` and `mlModel`.

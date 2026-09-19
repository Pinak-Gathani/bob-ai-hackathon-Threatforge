# Setup Guide

## Prerequisites

Install:

- Git
- Node.js and npm
- Python 3.12 or later
- A modern web browser

The current backend dependency ranges support Python 3.14.

## 1. Clone

```bash
git clone https://github.com/Pinak-Gathani/bob-ai-hackathon-Threatforge.git
cd bob-ai-hackathon-Threatforge
```

## 2. Backend Setup

Open a terminal:

```powershell
cd src/backend
py -3.14 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Start FastAPI:

```powershell
uvicorn app.main:app --reload --port 8000
```

Verify:

```text
http://127.0.0.1:8000/api/v1/health
```

Open API documentation:

```text
http://127.0.0.1:8000/docs
```

## 3. Frontend Setup

Open a second terminal:

```powershell
cd src/frontend
npm install
npm run dev
```

If required, create:

```text
src/frontend/.env.local
```

with:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Open the Vite URL shown in the terminal.

## 4. Clean Demo Data

The application supports:

```text
POST /api/v1/demo/reset
```

This resets the demo state.

Use the Dashboard's simulation workflow to create fresh demonstration activity.

## 5. Run the End-to-End Demo

1. Start the backend.
2. Start the frontend.
3. Open Dashboard.
4. Click **Simulate Multi-Source Attack**.
5. Verify new alerts appear.
6. Verify a new correlated incident appears.
7. Open the incident.
8. Review severity, priority, evidence and indicators.
9. Review MITRE techniques.
10. Open Investigation / BLUF.
11. Review recommended actions.
12. Open Reports.
13. Open Threat Intelligence.

## 6. IBM Bob / MCP Setup

The Bob configuration is:

```text
.bob/mcp.json
```

The MCP implementation is:

```text
src/backend/mcp_server.py
```

The backend should be running on port 8000.

Available MCP tools:

```text
get_incident
get_correlated_alerts
get_investigation
search_indicator
get_mitre_coverage
```

See:

```text
src/backend/MCP-README.md
```

for the MCP-specific workflow.

## 7. Example Bob Investigation Prompt

```text
Investigate INC-001 using the ThreatForge incident, correlated alerts,
MITRE coverage and investigation tools. Explain the evidence, assess
whether this is a genuine threat, and produce a concise commander BLUF
with actions.
```

Use an incident ID that exists in the current database.

## 8. Backend Tests

```powershell
cd src/backend
.\.venv\Scripts\activate
pytest
```

The test suite covers core normalisation and correlation behaviour.

## 9. Important Environment Rules

Do not commit:

```text
.env
.env.local
.venv/
node_modules/
__pycache__/
*.pyc
*.db
*.db-shm
*.db-wal
dist/
```

Use the provided `.env.example` files as configuration references.

## 10. Troubleshooting

### Backend does not start

Check:

```powershell
python --version
pip install -r requirements.txt
```

Then:

```powershell
uvicorn app.main:app --reload --port 8000
```

### Port 8000 is already in use

Stop the process using port 8000 or start FastAPI on another port and update the frontend `VITE_API_URL`.

### Frontend cannot reach backend

Verify:

```text
http://127.0.0.1:8000/api/v1/health
```

Then check:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Restart the Vite development server after changing environment variables.

### Old demo data appears

Stop the backend and use the demo reset endpoint, or remove the runtime SQLite database files and restart the backend so the database is recreated.

## 11. Production Note

This guide is for the hackathon/demo environment. A production deployment should add hardened authentication and authorisation, secure secret storage, a production database, TLS, logging/monitoring, backup/recovery and deployment controls.

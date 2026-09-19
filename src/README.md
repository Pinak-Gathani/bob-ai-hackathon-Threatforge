# ThreatLens AI — Source Code

This directory contains the complete application source for ThreatLens AI.

## Structure

```text
src/
├── backend/
│   ├── app/
│   │   ├── routes.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   └── services/
│   ├── tests/
│   ├── mcp_server.py
│   ├── requirements.txt
│   ├── README.md
│   └── MCP-README.md
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   ├── hooks/
    │   └── types/
    ├── package.json
    └── vite.config.ts
```

## Backend

The FastAPI backend provides:

- Alert ingestion and normalisation
- Alert listing and filtering
- Correlation and incident creation
- Priority metrics
- MITRE ATT&CK coverage
- Evidence-backed investigations and BLUF
- Threat intelligence indicator search
- Reports
- Demo attack simulation and reset
- IBM Bob MCP tools

See [`backend/README.md`](backend/README.md).

## Frontend

The React/Vite frontend provides the SOC command-center interface:

- Dashboard
- Alerts
- Incidents
- Incident Details
- IBM Bob Investigation / BLUF
- Threat Intelligence
- MITRE coverage
- Reports
- Settings

The frontend consumes the live backend APIs and does not depend on the previous mock-data store for active application data.

## Environment Files

Use `.env.example` files as templates.

**Never commit real `.env` files, passwords, API keys or tokens.**

Typical frontend configuration:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## What Should Not Be Committed

- `node_modules/`
- `.venv/`
- `__pycache__/`
- `.pytest_cache/`
- `*.pyc`
- `dist/` or other build artifacts
- runtime SQLite database files
- `.env` files containing secrets

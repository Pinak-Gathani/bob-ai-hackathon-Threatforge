# Architecture

## System Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                 ThreatForge Frontend                  │
│ React + Vite + TypeScript + Tailwind + Recharts        │
│                                                         │
│ Dashboard | Alerts | Incidents | BLUF | MITRE | Reports│
└───────────────────────────┬─────────────────────────────┘
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Backend                      │
│                                                         │
│ Routes → Ingestion → Normalisation → Correlation       │
│                    → Priority → Investigation           │
└───────────────┬─────────────────────────────┬───────────┘
                │                             │
                ▼                             ▼
┌──────────────────────────┐       ┌─────────────────────┐
│ SQLite + SQLAlchemy      │       │ MITRE / Intelligence│
│ Alerts + Incidents       │       │ Context + Coverage  │
└──────────────────────────┘       └─────────────────────┘

                            ▲
                            │ MCP / JSON-RPC over STDIO
                            │
                  ┌─────────┴─────────┐
                  │ ThreatForge MCP    │
                  │ Server            │
                  └─────────┬─────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  IBM Bob    │
                     │ Investigation│
                     └─────────────┘
```

## Architecture Goals

ThreatForge is organised around four goals:

1. Convert heterogeneous security alerts into a common model.
2. Correlate related evidence without incorrectly merging unrelated alerts.
3. Turn correlated activity into prioritised, investigation-ready incidents.
4. Make the resulting security context available to both the web application and IBM Bob.

## Components

### Frontend

Location:

```text
src/frontend/
```

Responsibilities:

- SOC-style command center UI
- Dashboard metrics and charts
- Alert and incident views
- MITRE coverage presentation
- Threat intelligence search
- Investigation / BLUF presentation
- Reports
- Settings and analyst preferences
- API communication

Main technologies:

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide

The frontend uses the backend as its source of truth for alerts, incidents, priorities, MITRE coverage, investigations, threat intelligence and reports.

### Backend

Location:

```text
src/backend/
```

Responsibilities:

- REST APIs
- Alert ingestion
- Alert normalisation
- Correlation
- Incident creation
- Priority calculation
- MITRE coverage
- Investigation generation
- Threat intelligence search
- Report data
- Demo simulation/reset
- Health checks

Main technologies:

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- SQLite

### Database

The demo uses SQLite through SQLAlchemy.

The main persisted entities include:

- Alerts
- Incidents
- MITRE-related information used for coverage
- Investigation/report context derived from current incident data

Runtime database files are intentionally excluded from source control.

## Correlation Service

Location:

```text
src/backend/app/services/correlator.py
```

The correlator uses an entity-first strategy.

Related alerts are correlated when meaningful security entities overlap. Technique-only correlation is restricted to cases where usable network entities are unavailable.

This design prevents unrelated alerts from being merged solely because they share a MITRE technique.

The resulting correlated alert set is then used to create or update an incident.

## Ingestion and Normalisation

Locations:

```text
src/backend/app/services/ingestion.py
src/backend/app/services/normalizer.py
```

The ingestion workflow accepts alert records and normalises important fields such as:

- Source
- Timestamp
- Severity
- Confidence
- Source IP
- Destination IP
- Host
- User
- Indicator
- MITRE technique

The normalised representation gives the correlation and prioritisation layers a consistent input regardless of source format.

## Priority and Incident Creation

After correlation, ThreatForge creates an incident with a unique incident identifier.

Priority is based on available evidence including:

- Alert severity
- Confidence
- Source diversity
- Correlation evidence
- Number and relevance of related alerts

The system is designed to prioritise analyst attention rather than simply sort alerts by one field.

## Investigation Service

Location:

```text
src/backend/app/services/investigation.py
```

The investigation service builds structured, evidence-first investigation information.

It includes:

- Incident ID
- Generated timestamp
- BLUF
- Threat assessment
- Timeline
- MITRE techniques
- Indicators
- Evidence
- Recommended actions
- Priority
- Confidence
- Classification
- Correlation rationale

The frontend consumes this structure for the investigation page and reports.

## MCP Server

Location:

```text
src/backend/mcp_server.py
```

The MCP server exposes structured ThreatForge tools to IBM Bob over STDIO JSON-RPC.

Available tools:

```text
get_incident
get_correlated_alerts
get_investigation
search_indicator
get_mitre_coverage
```

The tools retrieve current ThreatForge data through the backend rather than embedding a static copy of incident information.

## Bob Configuration

Location:

```text
.bob/mcp.json
```

The configuration registers the ThreatForge MCP server with the Bob workspace.

The integration is therefore load-bearing: Bob can retrieve application-specific security context needed for an investigation.

## Data Flow

### Alert-to-Incident

```text
Alert
 ↓
Ingest
 ↓
Normalise
 ↓
Persist
 ↓
Compare entities / context
 ↓
Correlate
 ↓
Create / update incident
 ↓
Calculate priority
```

### Incident-to-BLUF

```text
Incident
 ↓
Correlated alerts
 ↓
Evidence
 ↓
Indicators
 ↓
MITRE techniques
 ↓
Investigation service
 ↓
BLUF + actions
```

### AI Investigation

The evaluator-facing investigation experience is named **AI Investigation**. IBM Bob remains the underlying hackathon AI integration through MCP, while the visible product feature is vendor-neutral.

```text
Bob
 ↓
MCP tool call
 ↓
ThreatForge MCP server
 ↓
FastAPI endpoint
 ↓
Current database state
 ↓
Structured result
 ↓
Bob investigation
```

## Key API Boundaries

```text
POST /api/v1/alerts/ingest
GET  /api/v1/alerts
GET  /api/v1/incidents
GET  /api/v1/incidents/{id}
GET  /api/v1/priorities
GET  /api/v1/mitre/coverage
GET  /api/v1/investigations/{id}
POST /api/v1/investigations/{id}/refresh
GET  /api/v1/threat-intelligence/indicators
GET  /api/v1/threat-intelligence/search
GET  /api/v1/reports
POST /api/v1/demo/simulate-attack
POST /api/v1/demo/reset
```

## Demonstration Data Flow

The built-in attack simulator provides repeatable multi-source activity:

```text
Simulate Multi-Source Attack
          ↓
6 related security alerts
          ↓
Entity-aware correlation
          ↓
1 new incident
          ↓
Priority + Evidence
          ↓
MITRE context
          ↓
Investigation / BLUF
          ↓
Recommended actions
```

A fresh source identity is generated for each simulation so repeated demonstrations create distinct activity.

## Testing

Backend tests are located under:

```text
src/backend/tests/
```

The test suite covers core normalisation and correlation behaviour.

API smoke testing also covers health, alerts, incidents, priorities, MITRE coverage, investigations, reports, threat intelligence and demo simulation endpoints.

## Security and Operational Notes

- Secrets should be kept outside source control.
- Runtime database files are not committed.
- Generated dependency/cache directories are not committed.
- The demo uses simulated security data.
- The MCP server should only be exposed to the intended local Bob workflow.
- Production deployment would require stronger authentication, authorisation, secret management, database hardening, TLS and operational monitoring.
- Analyst validation remains necessary before operational response.


### Incident Notification & Escalation

After correlation and priority scoring, eligible HIGH/CRITICAL incidents can be packaged into a single notification. Email and mobile SMS are supported; provider credentials are optional because demo mode records a safe simulated delivery. Duplicate incident/priority/channel sends are suppressed.

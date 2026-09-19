# ThreatForge — AI-Powered Threat Intelligence Command Center

> \\\\\\\\\\\\\\\*\\\\\\\\\\\\\\\*ThreatForge\\\\\\\\\\\\\\\*\\\\\\\\\\\\\\\* is an AI-powered threat intelligence command center that correlates multi-source security alerts, separates meaningful threats from noise, prioritises incidents, maps activity to MITRE ATT\\\\\\\\\\\\\\\&CK, and produces evidence-backed investigation and BLUF summaries.

## 👥 Team

|Field|Value|
|-|-|
|**Team Name**|ThreatForge|
|**Track**|AI Innovation Hackathon 2026|
|**Team Lead**|Vasta Odedara|
|**Members**|Pinak Gathani, Rupam Chavda, Krish Patel|

## 🎯 Problem Statement

Security teams receive large numbers of alerts from different sources such as SIEM, endpoint, network and threat-intelligence systems. Analysts must manually normalise these alerts, identify relationships, determine which activity represents a genuine threat, understand its MITRE ATT\&CK context, and decide what deserves immediate attention.

This creates alert fatigue, duplicated investigations and slower response to high-impact activity.

## 💡 Solution

ThreatForge turns fragmented alerts into a structured investigation workflow:

**Multi-source Feeds → Ingestion → Normalisation → Correlation → Incident Creation → Priority Scoring → MITRE ATT\&CK → AI Investigation → BLUF → Recommended Actions → Incident Notification**

The FastAPI backend provides the data and correlation services, while the React command center visualises live alerts, incidents, threat intelligence, MITRE coverage, investigations and reports.

The system also includes a genuine **IBM Bob integration through Model Context Protocol (MCP)**. Bob can retrieve live ThreatForge incident evidence and use it during investigation rather than being included only as a project label.

## ✨ Key Features

* **Multi-source alert ingestion** — Accept and normalise security events from multiple sources.
* **Alert correlation** — Group related activity into incidents using security entities and relevant techniques.
* **Incident prioritisation** — Calculate and expose priority information from severity, confidence, source diversity and correlation evidence.
* **Threat assessment** — Present evidence and classification to help analysts distinguish meaningful activity from noise.
* **MITRE ATT\&CK mapping** — Connect observed techniques with tactics and coverage information.
* **Threat intelligence** — Search observed indicators and their associated incidents.
* **Evidence-first investigation** — Build a timeline with indicators, evidence, rationale, confidence and response actions.
* **BLUF reporting** — Produce a concise commander-level summary of the situation and recommended actions.
* **IBM Bob + MCP** — Expose live security context to IBM Bob through read-only MCP tools.
* **Incident notifications** — Deliver the correlated incident as one email/mobile notification package for eligible HIGH/CRITICAL incidents, with deduplication and escalation support.
* **Attack simulation** — Generate a realistic multi-source attack sequence for demonstrations and testing.
* **Dynamic SOC dashboard** — Dashboard, alerts, incidents, reports and intelligence views are driven by backend APIs rather than hardcoded incident data.

## 🧠 AI Investigation + IBM Bob MCP Integration

IBM Bob is integrated as an investigation assistant through MCP.

The repository contains:

```text
.bob/mcp.json
src/backend/mcp\\\\\\\\\\\\\\\_server.py
src/backend/MCP-README.md
```

The MCP server exposes read-only tools:

|MCP Tool|Purpose|
|-|-|
|`get\\\\\\\\\\\\\\\_incident`|Retrieve a live incident|
|`get\\\\\\\\\\\\\\\_correlated\\\\\\\\\\\\\\\_alerts`|Retrieve alerts correlated to an incident|
|`get\\\\\\\\\\\\\\\_investigation`|Retrieve evidence-backed investigation / BLUF data|
|`search\\\\\\\\\\\\\\\_indicator`|Search observed threat indicators|
|`get\\\\\\\\\\\\\\\_mitre\\\\\\\\\\\\\\\_coverage`|Retrieve current MITRE coverage|

The workflow is:

```text
Live ThreatForge Incident
        ↓
ThreatForge REST API
        ↓
Local MCP Server
        ↓
IBM Bob
        ↓
Incident Evidence + Indicators + MITRE Context
        ↓
Investigation / BLUF / Actions
```

Example Bob investigation prompt:

```text
Investigate INC-001 using the ThreatForge incident, correlated alerts,
MITRE coverage and investigation tools. Explain the evidence, assess
whether this is a genuine threat, and produce a concise commander BLUF
with recommended actions.
```

See [`src/backend/MCP-README.md`](src/backend/MCP-README.md) for the MCP setup and tool details.

## 🏗️ Architecture

```text
┌───────────────────────────────┐
│ Multi-source Security Feeds   │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ FastAPI Alert Ingestion API   │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Normalisation + SQLite        │
│ SQLAlchemy Data Layer         │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Correlation + Priority Logic  │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Incidents + MITRE ATT\\\\\\\\\\\\\\\&CK      │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Investigation + BLUF Service  │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ React SOC Command Center      │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ IBM Bob via MCP               │
└───────────────────────────────┘
```

## 🛠️ Technology Stack

|Category|Technologies|
|-|-|
|**Languages**|Python, TypeScript, HTML, CSS|
|**Frontend**|React, Vite, React Router, Tailwind CSS, Recharts, Lucide|
|**Backend**|FastAPI, Pydantic, SQLAlchemy|
|**Database**|SQLite|
|**IBM Technology**|IBM Bob, Model Context Protocol (MCP)|
|**Security Context**|MITRE ATT\&CK, alert correlation, threat indicators|
|**Testing**|Pytest|
|**Development**|Git, GitHub|

## 📁 Repository Structure

```text
├── .bob/                       # IBM Bob MCP configuration
├── .github/                    # GitHub workflows
├── docs/                       # Problem, solution, architecture and setup docs
├── demo/                       # Demo links, screenshots and demo guidance
├── presentation/               # Presentation materials
├── src/
│   ├── backend/
│   │   ├── app/               # FastAPI application
│   │   ├── tests/             # Backend tests
│   │   ├── mcp\\\\\\\\\\\\\\\_server.py      # MCP server for IBM Bob
│   │   ├── requirements.txt   # Python dependencies
│   │   └── MCP-README.md      # MCP setup and usage
│   └── frontend/
│       ├── src/               # React application
│       ├── package.json       # Frontend dependencies
│       └── vite.config.ts
├── submission.yaml             # Hackathon submission metadata
├── README.md
└── CONTRIBUTING.md
```

## ⚡ How to Run

### Prerequisites

* Python 3.11+; the current backend dependency ranges also support Python 3.14.
* Node.js and npm.
* Git.

### 1\. Clone the repository

```bash
git clone https://github.com/Pinak-Gathani/bob-ai-hackathon-Threatforge.git
cd bob-ai-hackathon-Threatforge
```

### 2\. Start the backend

Windows:

```powershell
cd src/backend
py -3.14 -m venv .venv
.\\\\\\\\\\\\\\\\.venv\\\\\\\\\\\\\\\\Scripts\\\\\\\\\\\\\\\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend health:

```text
http://127.0.0.1:8000/api/v1/health
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3\. Start the frontend

Open a second terminal:

```powershell
cd src/frontend
npm install
npm run dev
```

If needed, create `src/frontend/.env.local`:

```env
VITE\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\_URL=http://127.0.0.1:8000
```

Open the Vite URL displayed in the terminal.

### 4\. Run the demo

1. Open the ThreatForge Dashboard.
2. Select **Simulate Multi-Source Attack**.
3. Confirm that new alerts are ingested.
4. Confirm that a new correlated incident is created.
5. Open the incident details.
6. Review priority, evidence, indicators and MITRE techniques.
7. Open the Investigation / BLUF view.
8. Review recommended response actions.
9. Review Threat Intelligence and Reports.

### 5\. IBM Bob / MCP

Start the FastAPI backend first. The project-level `.bob/mcp.json` registers the local MCP server over STDIO.

Then enable the ThreatForge MCP server in IBM Bob and use the investigation tools with a live incident.

See [`src/backend/MCP-README.md`](src/backend/MCP-README.md).

## 🔌 Important API Endpoints

|Method|Endpoint|Purpose|
|-|-|-|
|GET|`/api/v1/health`|Backend and MCP configuration health|
|POST|`/api/v1/alerts/ingest`|Ingest raw alert feeds|
|GET|`/api/v1/alerts`|List/filter alerts|
|GET|`/api/v1/alerts/{id}`|Retrieve one alert|
|GET|`/api/v1/incidents`|List correlated incidents|
|GET|`/api/v1/incidents/{id}`|Retrieve incident details|
|GET|`/api/v1/priorities`|Priority metrics|
|GET|`/api/v1/mitre/coverage`|MITRE technique coverage|
|GET|`/api/v1/investigations/{id}`|Investigation and BLUF|
|POST|`/api/v1/investigations/{id}/refresh`|Refresh investigation|
|GET|`/api/v1/reports`|Current incident reports|
|GET|`/api/v1/reports/{id}`|One report|
|GET|`/api/v1/threat-intelligence/indicators`|Observed indicators|
|GET|`/api/v1/threat-intelligence/search?q=...`|Search indicators|
|POST|`/api/v1/demo/simulate-attack`|Generate demo attack|
|POST|`/api/v1/demo/reset`|Reset demo data|

## 🧪 Testing

Backend tests are under `src/backend/tests/`.

```powershell
cd src/backend
.\\\\\\\\\\\\\\\\.venv\\\\\\\\\\\\\\\\Scripts\\\\\\\\\\\\\\\\activate
pytest
```

The development build was validated with the backend test suite and API smoke tests.

## 🖥️ Demo Artifacts

|Artifact|Location|
|-|-|
|📹 Demo Video|`demo/demo-video-link.txt`|
|🌐 Live Demo|`demo/live-demo-url.txt`|
|🖼️ Screenshots|`demo/screenshots/`|
|📊 Presentation|`presentation/`|


## ⚠️ Known Limitations

* The hackathon demonstration uses simulated security alert data rather than classified production feeds.
* SQLite is suitable for the local demo; production deployment would use a hardened multi-user database.
* The application supports analyst decision-making; operational response still requires human validation.
* IBM Bob/MCP integration depends on the local Bob configuration and a running ThreatForge backend.
* Production authentication, access control and deployment hardening would require additional work.

## 🏅 What We're Most Proud Of

ThreatForge closes the loop from:

**Alert Ingestion → Correlation → Prioritisation → MITRE Context → Evidence-backed Investigation → BLUF → Recommended Actions**

Our strongest differentiator is the genuine **IBM Bob MCP integration**. Bob can access structured, live ThreatForge security context through dedicated investigation tools, making the integration functional and useful for the core analyst workflow rather than simply naming IBM Bob in the project.





## Live ML Feed Demo

The dashboard can run a simulated live feed when no external SIEM/EDR connection is available. With **LIVE · ON**, it calls `POST /api/v1/demo/live-tick` every 6 seconds. Each tick generates events from SIEM, EDR, Network Sensor and Threat Intel, runs ML inference for every incoming alert, correlates related events, and refreshes dashboard statistics. This is simulated data for demonstration; real integrations can use the existing `/api/v1/alerts/ingest` endpoint.

## Final evaluator build

See **DEMO-RUNBOOK.md** for the recommended judging flow and **FINAL-CHANGES.md** for the final engineering changes. Windows users can also use `START-BACKEND.bat` and `START-FRONTEND.bat`.


## PDF-aligned Feed Bot update
The demo feed bot now rotates through 40 context-aware scenarios aligned to the supplied ThreatForge Alert Classification and Scenarios document: authentication, user/session behavior, unknown IP/location anomalies, network/endpoint/data activity, satellite/RF anomalies, and intelligence correlation. The catalog is in `src/backend/data/feeds/pdf_scenario_catalog.json`.

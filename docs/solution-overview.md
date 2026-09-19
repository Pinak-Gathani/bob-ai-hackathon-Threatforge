# Solution Overview

## ThreatForge

ThreatForge is an AI-powered threat intelligence command center that provides an end-to-end workflow for multi-source alert correlation and incident prioritisation.

### Core Workflow

```text
Multi-source Threat Feeds
          ↓
Alert Ingestion
          ↓
Alert Normalisation
          ↓
Correlation
          ↓
Incident Creation
          ↓
Risk / Priority Scoring
          ↓
MITRE ATT&CK Context
          ↓
Investigation + BLUF
          ↓
Recommended Actions
```

## 1. Alert Ingestion

The FastAPI backend accepts security alerts and converts incoming records into a common internal representation.

The ingestion layer supports the application's demonstration of multiple alert sources and provides a consistent data model for downstream processing.

## 2. Normalisation

The normalisation service standardises important fields such as:

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

This allows alerts from different sources to be analysed consistently.

## 3. Correlation

ThreatForge correlates related alerts into incidents.

The current correlation approach prioritises shared security entities. Relevant technique information is also used when suitable network entities are unavailable.

This prevents unrelated alerts from being grouped merely because they share a common MITRE technique.

## 4. Incident Creation and Prioritisation

When related alerts form a meaningful cluster, ThreatForge creates an incident.

Priority is derived from available evidence including:

- Severity
- Confidence
- Source diversity
- Correlation evidence
- Number and relevance of related alerts

The result is a prioritised incident queue for analysts.

## 5. MITRE ATT&CK Mapping

Observed techniques are connected to MITRE ATT&CK context.

The MITRE view provides coverage information so analysts can understand the tactics and techniques represented in the current data.

## 6. Investigation and BLUF

The investigation service builds an evidence-first investigation containing:

- BLUF
- Threat assessment
- Priority
- Confidence
- Timeline
- Indicators
- Evidence
- MITRE techniques
- Correlation rationale
- Recommended actions

The BLUF is designed to give a decision maker a concise explanation of what matters and what should happen next.

## 7. IBM Bob + MCP Integration

ThreatForge includes a genuine IBM Bob integration through Model Context Protocol.

```text
ThreatForge APIs
     ↓
MCP Server
     ↓
IBM Bob
     ↓
Live Incident Context
     ↓
Investigation Reasoning
```

The MCP server provides tools for:

- `get_incident`
- `get_correlated_alerts`
- `get_investigation`
- `search_indicator`
- `get_mitre_coverage`

This makes Bob useful for investigating ThreatForge data rather than merely appearing as a named technology.

## 8. Dashboard and Analyst Experience

The React frontend provides live views for:

- Dashboard
- Alerts
- Incidents
- Incident details
- Investigation / BLUF
- Threat intelligence
- MITRE coverage
- Reports
- Settings

The pages consume backend APIs rather than relying on hardcoded incident data.

## 9. Demonstration

The built-in simulation creates a realistic multi-source attack sequence so judges can observe the full workflow:

```text
Simulate Attack
      ↓
New Alerts
      ↓
Correlated Incident
      ↓
Priority + Evidence
      ↓
MITRE
      ↓
BLUF
      ↓
Recommended Actions
```


## 8. Incident Notification & Escalation

ThreatForge notifies analysts from the incident layer, not from raw alert ingestion. A correlated HIGH/CRITICAL incident can produce a single email and/or mobile SMS containing the BLUF, priority, confidence, affected assets, MITRE context and evidence rationale. Escalation is supported through priority changes, and notification history records delivery state.

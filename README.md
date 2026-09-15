# ThreatLens AI — D2 Threat Intelligence Correlation & Alert Prioritisation Assistant

ThreatLens is a self-contained hackathon MVP for correlating heterogeneous security telemetry, prioritising genuine threats, mapping observations to MITRE ATT&CK, and producing commander-ready BLUF reports with Bob AI.

## What is implemented

- Multi-source event normalisation for SIEM, EDR, Network Sensor and Threat Intel feeds.
- Deterministic cross-source correlation using shared IP/host/entity, a 15-minute window and MITRE overlap.
- Explainable threat scoring and classification (genuine threat / investigating / likely false positive).
- Automatic MITRE ATT&CK technique mapping for common behaviours such as PowerShell, LSASS access, ransomware, DNS tunnelling and HTTPS C2.
- Live dashboard statistics backed by application state rather than fixed KPI values.
- One-click **Simulate Multi-Source Attack** demo: injects SIEM + EDR + network + threat-intel evidence and creates a correlated incident.
- Bob investigation workflow with incident-specific context.
- Automatic BLUF report creation for newly correlated incidents.
- Browser-print PDF workflow from the report viewer (`Print → Save as PDF`).
- Local persistence via `localStorage`, so a refresh does not erase the investigation state.
- Reset Demo button for repeatable judging/demo sessions.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Recommended judging demo

1. Open Dashboard.
2. Click **Simulate Multi-Source Attack**.
3. Show the alert count increasing and the new correlated incident.
4. Open the incident and explain the cross-source evidence.
5. Open the MITRE page to show mapped techniques.
6. Open **Investigate with Bob** and ask why the incident is critical.
7. Open Reports and show the generated BLUF.
8. Use **Export PDF** and choose **Save as PDF** in the browser print dialog.
9. Click **Reset Demo** and repeat if needed.

## Architecture

`Feed → Normalizer → Correlation Engine → Threat Score → MITRE Mapper → Incident → Bob Investigation → BLUF Report`

The correlation and prioritisation logic is intentionally deterministic and explainable for an offline hackathon demo. Real SIEM/EDR connectors and an external LLM can be added behind the same `RawFeed` and incident interfaces without changing the dashboard workflow.

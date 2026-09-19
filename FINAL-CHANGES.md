# ThreatForge Final — Changes & Validation

This version keeps `ThreatForge-main` as the base and selectively incorporates the strongest ideas from `ThreatLens-AI-Enhanced`.

## Backend changes

### `src/backend/app/services/correlator.py`
- Replaced single-pass grouping with a time-bounded evidence graph / connected-component approach.
- Added explicit edge reasons: shared network entity, shared host, ATT&CK overlap, cross-source corroboration.
- Added evidence-link scores and evidence-edge records.
- Added evidence-fused classification guardrails so XGBoost is advisory rather than the sole decision gate.
- Added deterministic handling for likely false positives.
- Added transparent evidence scoring and priority calculation.
- Fixed the stale incident update bug: an existing incident is only returned as updated when the current ingestion actually adds new alerts.
- Kept the tested semantics for unrelated alerts: they are not forced into incidents.

### `src/backend/app/services/normalizer.py`
- Added support for supplied timestamps (`timestamp`, `timestampUtc`, `event_time`, `time`).
- Expanded ATT&CK keyword coverage for common execution, credential access, persistence, web-shell, phishing, RCE, PsExec and ransomware signals.

### `src/backend/app/services/ml_threat_model.py`
- Added `/ml/model-info` support through a new `model_info()` method.
- Explicitly exposes the XGBoost model as an advisory probability signal.

### `src/backend/app/models.py`
- Added persisted `correlation_evidence` and `evidence_edges` JSON fields to incidents.

### `src/backend/app/database.py`
- Added lightweight SQLite migrations for the two new incident evidence fields, preserving compatibility with an existing demo database.

### `src/backend/app/services/ingestion.py`
- Persists evidence-fusion data and evidence graph edges.

### `src/backend/app/routes.py`
- Live simulator is now deterministic and cycles through:
  1. credential access + C2,
  2. ransomware,
  3. benign operations,
  4. DNS exfiltration.
- Live events use unique demo entities so separate ticks do not accidentally merge into old incidents.
- Simulated attacks receive staged timestamps for a more realistic attack timeline.

## Frontend changes

### `src/frontend/src/pages/IncidentDetails.tsx`
- Added **Evidence Fusion & Correlation Graph** section.
- Shows decision evidence and alert-to-alert evidence links.
- Renamed AI correlation confidence to **Correlation Confidence** to avoid overstating model certainty.

### `src/frontend/src/types/index.ts`
- Added `correlationEvidence` and `evidenceEdges` to the Incident type.

### `src/frontend/src/pages/Dashboard.tsx`
- Fixed existing TypeScript issues around the undefined `storeIngest` fallback and severity chart data shape.
- Updated threat-classification wording to reflect evidence fusion.

### `src/frontend/src/pages/Settings.tsx`
- Fixed the source-set TypeScript type mismatch.

## Demo support

- Added `DEMO-RUNBOOK.md`.
- Added `START-BACKEND.bat`, `START-FRONTEND.bat`, and `RESET-DEMO.bat` for Windows demo setup.

## Validation performed

- Backend Python compile check: passed.
- Backend unit tests: **28 passed**.
- Fresh SQLite startup + seed: passed.
- `/health`: passed.
- `/priorities`: passed.
- `/ml/model-info`: passed.
- `/demo/simulate-attack`: passed and produced a fresh CRITICAL genuine-threat incident.
- Incident evidence graph retrieval: passed.
- Investigation/BLUF endpoint: passed.
- Live simulator: passed for attack, ransomware, benign and DNS-exfiltration cycles.
- Reports and Threat Intelligence endpoints: passed.

The container used for final validation could not complete a fresh npm dependency download, so the Vite production bundle was not executed in this environment. The frontend changes were kept small and source-checked against the project's existing TypeScript configuration; the final package intentionally does not include the incomplete `node_modules` directory.


## Final evaluator release — AI Investigation + Incident Notifications
- Renamed all user-facing Bob Investigation labels to **AI Investigation**; legacy `/bob-investigation` is not exposed by the UI.
- Added incident-level **Intelligent Incident Notification & Escalation** workflow.
- Added Email + Mobile SMS channels with safe demo simulation when providers are not configured.
- Added notification policy UI, delivery history, test delivery, and manual incident notification.
- Automatic delivery is triggered only for new eligible incidents and HIGH/CRITICAL priority escalations; raw alerts are never individually notified.
- Added deduplication by incident + priority + channel to prevent notification spam.
- Added `docs/incident-notifications.md` and provider environment examples.

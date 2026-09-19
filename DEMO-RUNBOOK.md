# ThreatForge — Evaluator Demo Runbook

## 1. Start backend

```powershell
cd src\backend
python -m uvicorn app.main:app --reload --port 8000
```

## 2. Start frontend (second terminal)

```powershell
cd src\frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## 3. Recommended evaluator flow

1. Open **Dashboard** and point out the four heterogeneous sources: SIEM, EDR, Network Sensor, Threat Intel.
2. Click **Simulate Multi-Source Attack**. The backend generates a fresh, deterministic multi-stage attack with shared entities and staged timestamps.
3. Show the new alert count and incident count.
4. Open the new **CRITICAL/HIGH** incident.
5. Explain **Evidence Fusion & Correlation Graph**: temporal proximity, shared entity, cross-source corroboration and MITRE overlap.
6. Open **MITRE ATT&CK** techniques.
7. Click **Investigate with IBM Bob** and show the BLUF, evidence, timeline, indicators and recommended actions.
8. Return to Dashboard and enable the live simulator. It cycles through credential/C2, ransomware, benign operations and DNS-exfiltration scenarios.
9. Open **Alerts** to show per-alert XGBoost probability. Explain that XGBoost is an advisory signal; commander-facing classification is evidence-fused, not model-only.
10. Open **Threat Intelligence** and **Reports** to show indicator and reporting workflows.

## 4. Reset before a fresh judging run

Use the **Reset Demo** control on Dashboard. This rebuilds the deterministic seed data through the same ingestion/correlation pipeline used for live data.

## 5. Verification

From `src/backend`:

```powershell
python -m pytest -q
```

The evaluator should see all tests passing before the demo.

## Incident Notification Demo

1. Open **Incident Notifications** from the sidebar.
2. Set **Minimum priority** to `HIGH`.
3. Keep **Demo delivery (safe)** enabled by leaving the provider credentials empty.
4. Enter any clearly-labelled evaluator demo recipient, e.g. `evaluator@example.com`, and an SMS demo number if desired; save the policy.
5. Return to Dashboard and click **Simulate Multi-Source Attack** or use the live feed.
6. Open **Incident Notifications → Notification History**. The correlated HIGH/CRITICAL incident appears as a single EMAIL/MOBILE_SMS `SIMULATED` delivery.
7. To deliver for real, configure SMTP/Twilio in `src/backend/.env` and set `THREATFORGE_NOTIFICATION_DEMO=false`.

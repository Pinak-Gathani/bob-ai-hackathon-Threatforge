# ThreatForge Final Evaluator Build

This build uses ThreatForge as the evaluator-facing product name and presents the analyst feature as **AI Investigation**. IBM Bob + MCP remain in the technical integration because the hackathon requires a Bob solution, but Bob is not used as the visible feature label.

## Main changes

### AI Investigation naming
- `src/frontend/src/pages/AIInvestigation.tsx` replaces the visible Bob-branded investigation screen.
- `src/frontend/src/App.tsx` exposes `/ai-investigation`.
- Sidebar, Dashboard, Incidents, Alerts, Incident Details, MITRE, and workflow labels use **AI Investigation** terminology.
- The old Bob-branded route is not used by the UI.

### Incident notifications
- `src/backend/app/services/notifications.py` is the incident-level notification engine.
- `src/backend/app/models.py` adds `NotificationSettingsModel` and `IncidentNotificationModel`.
- `src/backend/app/schemas.py` adds notification settings/history schemas.
- `src/backend/app/routes.py` adds notification settings, history, test delivery and manual incident notification APIs.
- `src/backend/app/services/ingestion.py` automatically evaluates notifications after incident creation/priority escalation.
- `src/frontend/src/pages/Notifications.tsx` provides notification policy, recipient settings, test delivery and delivery history.
- `src/frontend/src/services/api.ts` adds notification API calls.
- `src/frontend/src/pages/IncidentDetails.tsx` and `src/frontend/src/pages/AIInvestigation.tsx` add incident-level `Notify Incident` actions.

## Notification logic
- Notifications operate on **correlated incidents**, not individual raw alerts.
- Default threshold is HIGH.
- Repeated updates do not spam the same incident/channel/priority.
- A priority escalation can trigger a new notification event.
- Email and mobile SMS are supported.
- Demo mode records `SIMULATED` deliveries when provider credentials are absent.

## Real delivery configuration
Set provider variables in `src/backend/.env`. Keep `THREATFORGE_NOTIFICATION_DEMO=true` while rehearsing the evaluator demo. Set it to `false` only when intentionally using real SMTP/Twilio credentials.

## Validation performed
- Backend tests: **28 passed**.
- Python static compile: passed.
- Frontend TS/TSX source parse: **24 files, 0 diagnostics**.
- Fresh backend startup: health endpoint returned 200.
- Notification API: settings/history/test endpoints returned 200.
- Demo attack: produced a CRITICAL correlated incident and simulated EMAIL + MOBILE_SMS notifications.
- Repeated demo attack: did not create duplicate notification records for the same incident/priority/channel.

A full Vite production build could not be executed in the build container because the npm dependency installation timed out and left an incomplete `node_modules`; the ZIP intentionally excludes `node_modules` so the evaluator can run `npm install` in a normal networked environment.

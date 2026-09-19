# Incident Notifications

ThreatForge notifies analysts at the **incident layer**, after alerts have been normalised, correlated, classified and prioritised. Raw alerts are never individually emailed/SMSed by this feature.

## Default policy

- LOW: dashboard only
- MEDIUM: dashboard / optional policy
- HIGH: email and/or mobile SMS
- CRITICAL: email and/or mobile SMS, with priority-escalation support

The service deduplicates notifications by incident + priority + channel, so repeated ingestion does not create a notification storm.

## Demo mode

Demo mode is safe by default. Without provider credentials, the backend records `SIMULATED` deliveries in Notification History. This lets evaluators see the complete workflow without sending external messages.

## Real email

Set these variables in `src/backend/.env`:

```env
THREATFORGE_SMTP_HOST=smtp.example.com
THREATFORGE_SMTP_PORT=587
THREATFORGE_SMTP_USERNAME=...
THREATFORGE_SMTP_PASSWORD=...
THREATFORGE_SMTP_FROM=threatforge@example.com
THREATFORGE_SMTP_TLS=true
```

## Real mobile SMS

Set the Twilio variables:

```env
THREATFORGE_TWILIO_ACCOUNT_SID=...
THREATFORGE_TWILIO_AUTH_TOKEN=...
THREATFORGE_TWILIO_FROM_NUMBER=+1...
```

Then open **Incident Notifications** in the frontend and set the analyst email/mobile recipient.

## API

- `GET /api/v1/notifications/settings`
- `PUT /api/v1/notifications/settings`
- `GET /api/v1/notifications/history`
- `POST /api/v1/notifications/test`
- `POST /api/v1/incidents/{incident_id}/notify`

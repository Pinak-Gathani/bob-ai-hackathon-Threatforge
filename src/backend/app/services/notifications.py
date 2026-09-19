"""Incident-level notification and escalation service.

The service is intentionally safe-by-default:
- Notifications are generated from correlated incidents, never raw alerts.
- Email/SMS providers are optional; without credentials, demo mode records a
  simulated delivery so the evaluator can see the workflow without failures.
- The same incident/priority/channel is only notified once, preventing alert spam.
"""
from __future__ import annotations

import os
import smtplib
import ssl
import urllib.parse
import urllib.request
import base64
from email.message import EmailMessage
from typing import Iterable, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from ..models import IncidentModel, IncidentNotificationModel, NotificationSettingsModel

PRIORITY_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def _get_settings(db: Session) -> NotificationSettingsModel:
    settings = db.query(NotificationSettingsModel).filter(NotificationSettingsModel.id == 1).first()
    if settings is None:
        settings = NotificationSettingsModel(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def get_settings(db: Session) -> NotificationSettingsModel:
    return _get_settings(db)


def update_settings(db: Session, payload: Dict[str, Any]) -> NotificationSettingsModel:
    settings = _get_settings(db)
    allowed = {
        "enabled", "min_priority", "email_enabled", "email_recipient",
        "sms_enabled", "sms_recipient",
    }
    for key, value in payload.items():
        if key in allowed and value is not None:
            setattr(settings, key, value)
    if settings.min_priority not in PRIORITY_RANK:
        settings.min_priority = "HIGH"
    db.commit()
    db.refresh(settings)
    return settings


def _mask_recipient(value: str) -> str:
    if not value:
        return "Not configured"
    if "@" in value:
        name, domain = value.split("@", 1)
        return f"{name[:1]}***@{domain}"
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) >= 4:
        return f"***{digits[-4:]}"
    return "***"


def settings_out(settings: NotificationSettingsModel) -> dict:
    return {
        "enabled": bool(settings.enabled),
        "minPriority": settings.min_priority,
        "emailEnabled": bool(settings.email_enabled),
        "emailRecipient": settings.email_recipient or "",
        "emailRecipientMasked": _mask_recipient(settings.email_recipient or ""),
        "smsEnabled": bool(settings.sms_enabled),
        "smsRecipient": settings.sms_recipient or "",
        "smsRecipientMasked": _mask_recipient(settings.sms_recipient or ""),
        "updatedAt": settings.updated_at.isoformat() if settings.updated_at else "",
        "demoMode": os.getenv("THREATFORGE_NOTIFICATION_DEMO", "true").lower() != "false",
        "emailProviderConfigured": bool(os.getenv("THREATFORGE_SMTP_HOST")),
        "smsProviderConfigured": bool(os.getenv("THREATFORGE_TWILIO_ACCOUNT_SID")),
    }


def _build_message(incident: IncidentModel) -> tuple[str, str]:
    sources = list(dict.fromkeys(
        str(edge.get("source", "")) for edge in (incident.timeline or []) if edge.get("source")
    ))
    if not sources:
        sources = ["Correlated telemetry"]
    techniques = ", ".join(incident.mitre_techniques or []) or "None mapped"
    assets = ", ".join(incident.affected_assets or []) or "Affected environment"
    evidence = incident.why_correlated or "Correlated evidence supports analyst investigation."
    subject = f"[{incident.priority}] ThreatForge Incident {incident.id} — {incident.title}"
    body = (
        f"THREATFORGE INCIDENT NOTIFICATION\n\n"
        f"BLUF\n"
        f"{incident.priority} priority incident {incident.id} requires analyst attention. "
        f"The incident is assessed as {incident.classification.replace('_', ' ').lower()} "
        f"with {incident.confidence}% confidence and threat score {incident.threat_score}/100.\n\n"
        f"Incident: {incident.id}\n"
        f"Title: {incident.title}\n"
        f"Priority: {incident.priority}\n"
        f"Confidence: {incident.confidence}%\n"
        f"Affected assets: {assets}\n"
        f"MITRE ATT&CK: {techniques}\n"
        f"Telemetry sources: {', '.join(sources)}\n"
        f"Correlated alerts: {incident.related_alerts_count}\n\n"
        f"WHY THIS INCIDENT MATTERS\n"
        f"{evidence}\n\n"
        f"Recommended next step\n"
        f"Open the incident in ThreatForge, review the evidence graph and timeline, and follow the investigation guidance before taking containment actions.\n\n"
        f"Generated: {datetime.now(timezone.utc).isoformat()}"
    )
    return subject, body


def _record(db: Session, incident: IncidentModel, channel: str, status: str, recipient: str, subject: str, message: str, provider: str, details: str) -> IncidentNotificationModel:
    row = IncidentNotificationModel(
        id=f"N-{uuid.uuid4().hex[:8].upper()}",
        incident_id=incident.id,
        priority=incident.priority,
        channel=channel,
        status=status,
        recipient=recipient,
        subject=subject,
        message=message,
        provider=provider,
        details=details,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _send_email(recipient: str, subject: str, body: str) -> tuple[str, str]:
    host = os.getenv("THREATFORGE_SMTP_HOST", "")
    port = int(os.getenv("THREATFORGE_SMTP_PORT", "587"))
    username = os.getenv("THREATFORGE_SMTP_USERNAME", "")
    password = os.getenv("THREATFORGE_SMTP_PASSWORD", "")
    sender = os.getenv("THREATFORGE_SMTP_FROM", username or "threatforge@localhost")
    use_tls = os.getenv("THREATFORGE_SMTP_TLS", "true").lower() != "false"
    if not host:
        return "demo", "SMTP not configured; simulated delivery."
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient
    msg.set_content(body)
    if use_tls:
        context = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=12) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            if username:
                smtp.login(username, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=12) as smtp:
            if username:
                smtp.login(username, password)
            smtp.send_message(msg)
    return "smtp", "Delivered through configured SMTP server."


def _send_sms(recipient: str, body: str) -> tuple[str, str]:
    account_sid = os.getenv("THREATFORGE_TWILIO_ACCOUNT_SID", "")
    auth_token = os.getenv("THREATFORGE_TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("THREATFORGE_TWILIO_FROM_NUMBER", "")
    if not (account_sid and auth_token and from_number):
        return "demo", "SMS provider not configured; simulated mobile delivery."
    data = urllib.parse.urlencode({"To": recipient, "From": from_number, "Body": body[:1500]}).encode()
    url = f"https://api.twilio.com/2010-04-01/Accounts/{urllib.parse.quote(account_sid)}/Messages.json"
    req = urllib.request.Request(url, data=data, method="POST")
    auth = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
    req.add_header("Authorization", f"Basic {auth}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=12) as response:
        response.read()
    return "twilio", "Delivered through configured Twilio SMS."


def _existing_delivery(db: Session, incident_id: str, priority: str, channel: str) -> bool:
    return db.query(IncidentNotificationModel).filter(
        IncidentNotificationModel.incident_id == incident_id,
        IncidentNotificationModel.priority == priority,
        IncidentNotificationModel.channel == channel,
        IncidentNotificationModel.status.in_(["SIMULATED", "SENT"]),
    ).first() is not None


def notify_incident(db: Session, incident: IncidentModel, force: bool = False) -> list[IncidentNotificationModel]:
    settings = _get_settings(db)
    if not settings.enabled and not force:
        return []
    if not force and PRIORITY_RANK.get(incident.priority, 0) < PRIORITY_RANK.get(settings.min_priority, 3):
        return []

    subject, body = _build_message(incident)
    rows: list[IncidentNotificationModel] = []
    channels = []
    if settings.email_enabled and settings.email_recipient:
        channels.append(("EMAIL", settings.email_recipient, _send_email))
    if settings.sms_enabled and settings.sms_recipient:
        channels.append(("MOBILE_SMS", settings.sms_recipient, _send_sms))

    if not channels and force:
        # Make manual test/re-send visible even when contacts are not configured.
        return [_record(db, incident, "SYSTEM", "SKIPPED", "", subject, body, "demo", "No notification recipient is configured.")]

    for channel, recipient, sender in channels:
        if not force and _existing_delivery(db, incident.id, incident.priority, channel):
            continue
        try:
            provider, details = sender(recipient, subject, body) if channel == "EMAIL" else sender(recipient, body)
            status = "SIMULATED" if provider == "demo" else "SENT"
            rows.append(_record(db, incident, channel, status, recipient, subject, body, provider, details))
        except Exception as exc:
            rows.append(_record(db, incident, channel, "FAILED", recipient, subject, body, "error", str(exc)[:300]))
    return rows


def notify_incidents(db: Session, incidents: Iterable[IncidentModel]) -> list[IncidentNotificationModel]:
    rows: list[IncidentNotificationModel] = []
    for incident in incidents:
        rows.extend(notify_incident(db, incident, force=False))
    return rows


def test_notification(db: Session) -> list[IncidentNotificationModel]:
    incident = db.query(IncidentModel).order_by(IncidentModel.created_at.desc()).first()
    if not incident:
        return []
    return notify_incident(db, incident, force=True)


def notification_history(db: Session, limit: int = 100) -> list[IncidentNotificationModel]:
    return db.query(IncidentNotificationModel).order_by(IncidentNotificationModel.created_at.desc()).limit(limit).all()

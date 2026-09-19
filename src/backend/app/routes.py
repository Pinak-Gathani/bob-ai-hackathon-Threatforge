"""
FastAPI route handlers for the ThreatForge backend.
All paths are prefixed with /api/v1 in main.py.
"""
from __future__ import annotations
from typing import List, Optional
from pathlib import Path
from copy import deepcopy
from datetime import datetime, timezone
import random
import uuid
import itertools

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .database import get_db
from .models import AlertModel, IncidentModel, MitreTechniqueModel
from .schemas import (
    AlertOut, IncidentOut, MitreCoverageOut, MitreTechniqueOut,
    PriorityQueueOut, DashboardStatsOut, IngestRequest, IngestResponse,
    RawFeedIn, HealthOut, TimelineStep, InvestigationOut, IndicatorOut, ReportOut, IndicatorListOut, ResetOut, NotificationSettingsOut, NotificationSettingsIn, NotificationOut, NotificationHistoryOut,
)
from .services.ingestion import ingest_feeds, _alert_row_to_dict, _incident_row_to_dict
from .services.correlator import calculate_dashboard
from .config import settings
from .services.investigation import investigate
from .services.notifications import get_settings as get_notification_settings, update_settings as update_notification_settings, settings_out as notification_settings_out, notification_history, notify_incident, test_notification
from .services.feed_bot import next_event as feed_bot_next_event, status as feed_bot_status, reset as feed_bot_reset


router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────

def _to_alert_out(a: AlertModel) -> AlertOut:
    return AlertOut(
        id=a.id,
        timestamp=a.timestamp,
        source=a.source,
        event=a.event,
        srcIp=a.src_ip,
        destIp=a.dest_ip,
        host=a.host,
        severity=a.severity,
        correlationId=a.correlation_id,
        status=a.status,
        rawEvent=a.raw_event,
        normalizedEvent=a.normalized_event,
        mitreTechniques=a.mitre_techniques or [],
        mlModel=getattr(a, "ml_model", None),
        mlThreatProbability=getattr(a, "ml_threat_probability", None),
        mlClassification=getattr(a, "ml_classification", None),
        mlPriority=getattr(a, "ml_priority", None),
    )


def _to_incident_out(i: IncidentModel) -> IncidentOut:
    raw_timeline = i.timeline or []
    timeline = [
        TimelineStep(
            time=step.get("time", ""),
            title=step.get("title", ""),
            description=step.get("description", ""),
            source=step.get("source", ""),
            severity=step.get("severity", "MEDIUM"),
            techniqueId=step.get("techniqueId"),
        )
        for step in raw_timeline
    ]
    return IncidentOut(
        id=i.id,
        title=i.title,
        priority=i.priority,
        confidence=i.confidence,
        relatedAlertsCount=i.related_alerts_count,
        mitreTechniques=i.mitre_techniques or [],
        status=i.status,
        classification=i.classification,
        firstSeen=i.first_seen,
        lastSeen=i.last_seen,
        affectedAssets=i.affected_assets or [],
        whyCorrelated=i.why_correlated or "",
        timeline=timeline,
        threatScore=i.threat_score,
        sourceCount=i.source_count,
        mlModel=getattr(i, "ml_model", None),
        mlThreatProbability=getattr(i, "ml_threat_probability", None),
        correlationEvidence=getattr(i, "correlation_evidence", None) or [],
        evidenceEdges=getattr(i, "evidence_edges", None) or [],
    )


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthOut, tags=["system"])
def health(db: Session = Depends(get_db)):
    return HealthOut(
        status="ok",
        version="1.0.0",
        environment=settings.app_env,
        alertCount=db.query(AlertModel).count(),
        incidentCount=db.query(IncidentModel).count(),
        mcpConfigured=(Path(__file__).resolve().parents[1] / "mcp_server.py").exists(),
    )


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.post("/alerts/ingest", response_model=IngestResponse, tags=["alerts"])
def ingest(body: IngestRequest, db: Session = Depends(get_db)):
    feeds = [{"source": f.source, "payload": f.payload} for f in body.feeds]
    new_alerts, new_incidents, updated_incidents = ingest_feeds(feeds, db)
    return IngestResponse(
        ingested=len(new_alerts),
        newIncidents=len(new_incidents),
        updatedIncidents=len(updated_incidents),
        alerts=[_to_alert_out(a) for a in new_alerts],
        incidents=[_to_incident_out(i) for i in new_incidents + updated_incidents],
    )


@router.get("/alerts", response_model=List[AlertOut], tags=["alerts"])
def list_alerts(
    source: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(AlertModel).order_by(AlertModel.timestamp.desc())
    if source:
        q = q.filter(AlertModel.source == source)
    if severity:
        q = q.filter(AlertModel.severity == severity)
    if status:
        q = q.filter(AlertModel.status == status)
    return [_to_alert_out(a) for a in q.all()]


@router.get("/alerts/{alert_id}", response_model=AlertOut, tags=["alerts"])
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    a = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _to_alert_out(a)


# ── Incidents ─────────────────────────────────────────────────────────────────

@router.get("/incidents", response_model=List[IncidentOut], tags=["incidents"])
def list_incidents(
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(IncidentModel).order_by(
        IncidentModel.threat_score.desc(),
        IncidentModel.created_at.desc(),
    )
    if priority:
        q = q.filter(IncidentModel.priority == priority)
    if status:
        q = q.filter(IncidentModel.status == status)
    return [_to_incident_out(i) for i in q.all()]


@router.get("/incidents/{incident_id}", response_model=IncidentOut, tags=["incidents"])
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    i = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _to_incident_out(i)


# ── Priority queue ────────────────────────────────────────────────────────────

@router.get("/priorities", response_model=PriorityQueueOut, tags=["incidents"])
def priority_queue(db: Session = Depends(get_db)):
    incidents = (
        db.query(IncidentModel)
        .order_by(IncidentModel.threat_score.desc())
        .all()
    )
    alerts = db.query(AlertModel).all()
    alert_dicts = [_alert_row_to_dict(a) for a in alerts]
    incident_dicts = [_incident_row_to_dict(i) for i in incidents]
    stats = calculate_dashboard(alert_dicts, incident_dicts)
    return PriorityQueueOut(
        incidents=[_to_incident_out(i) for i in incidents],
        stats=DashboardStatsOut(**stats),
    )



@router.get("/ml/model-info", tags=["ml"])
def ml_model_info():
    """Return model type, validation/test metrics and feature information."""
    from .services.ml_threat_model import MODEL
    return MODEL.model_info()

# ── MITRE coverage ────────────────────────────────────────────────────────────

@router.get("/mitre/coverage", response_model=MitreCoverageOut, tags=["mitre"])
def mitre_coverage(db: Session = Depends(get_db)):
    techniques = (
        db.query(MitreTechniqueModel)
        .order_by(MitreTechniqueModel.count.desc())
        .all()
    )
    out = [
        MitreTechniqueOut(
            id=t.id,
            name=t.name,
            tactic=t.tactic,
            count=t.count,
            severity=t.severity,
            lastObserved=t.last_observed or "",
            description=t.description or "",
        )
        for t in techniques
    ]
    critical_count = sum(1 for t in techniques if t.severity == "CRITICAL")
    tactics = {t.tactic for t in techniques}
    return MitreCoverageOut(
        techniques=out,
        totalTechniques=len(out),
        tacticsCount=len(tactics),
        criticalCount=critical_count,
    )




# ── Investigation / BLUF ─────────────────────────────────────────────────────

@router.get("/investigations/{incident_id}", response_model=InvestigationOut, tags=["investigation"])
def get_investigation(incident_id: str, db: Session = Depends(get_db)):
    result = investigate(db, incident_id)
    if not result:
        raise HTTPException(status_code=404, detail="Incident not found")
    return InvestigationOut(**result)


@router.post("/investigations/{incident_id}/refresh", response_model=InvestigationOut, tags=["investigation"])
def refresh_investigation(incident_id: str, db: Session = Depends(get_db)):
    result = investigate(db, incident_id)
    if not result:
        raise HTTPException(status_code=404, detail="Incident not found")
    return InvestigationOut(**result)


# ── Incident notifications ───────────────────────────────────────────────────

def _to_notification_out(n):
    return NotificationOut(
        id=n.id, incidentId=n.incident_id, priority=n.priority, channel=n.channel, status=n.status,
        recipient=n.recipient, subject=n.subject, provider=n.provider, details=n.details,
        createdAt=n.created_at.isoformat() if n.created_at else "",
    )


@router.get("/notifications/settings", response_model=NotificationSettingsOut, tags=["notifications"])
def notification_settings(db: Session = Depends(get_db)):
    return NotificationSettingsOut(**notification_settings_out(get_notification_settings(db)))


@router.put("/notifications/settings", response_model=NotificationSettingsOut, tags=["notifications"])
def save_notification_settings(body: NotificationSettingsIn, db: Session = Depends(get_db)):
    payload = body.model_dump(exclude_none=True)
    payload = {
        ("min_priority" if k == "minPriority" else
         "email_enabled" if k == "emailEnabled" else
         "email_recipient" if k == "emailRecipient" else
         "sms_enabled" if k == "smsEnabled" else
         "sms_recipient" if k == "smsRecipient" else k): v
        for k, v in payload.items()
    }
    return NotificationSettingsOut(**notification_settings_out(update_notification_settings(db, payload)))


@router.get("/notifications/history", response_model=NotificationHistoryOut, tags=["notifications"])
def notifications(limit: int = Query(100, ge=1, le=250), db: Session = Depends(get_db)):
    rows = notification_history(db, limit)
    return NotificationHistoryOut(notifications=[_to_notification_out(r) for r in rows], total=len(rows))


@router.post("/notifications/test", response_model=NotificationHistoryOut, tags=["notifications"])
def send_test_notification(db: Session = Depends(get_db)):
    rows = test_notification(db)
    return NotificationHistoryOut(notifications=[_to_notification_out(r) for r in rows], total=len(rows))


@router.post("/incidents/{incident_id}/notify", response_model=NotificationHistoryOut, tags=["notifications"])
def notify_incident_now(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    rows = notify_incident(db, incident, force=True)
    return NotificationHistoryOut(notifications=[_to_notification_out(r) for r in rows], total=len(rows))


# ── Reports ───────────────────────────────────────────────────────────────────

@router.get("/reports", response_model=List[ReportOut], tags=["reports"])
def list_reports(db: Session = Depends(get_db)):
    incidents = db.query(IncidentModel).order_by(IncidentModel.updated_at.desc()).all()
    reports = []
    for incident in incidents:
        result = investigate(db, incident.id)
        if result:
            reports.append(ReportOut(id=f"RPT-{incident.id}", incidentTitle=incident.title, **result))
    return reports


@router.get("/reports/{report_id}", response_model=ReportOut, tags=["reports"])
def get_report(report_id: str, db: Session = Depends(get_db)):
    incident_id = report_id.removeprefix("RPT-")
    result = investigate(db, incident_id)
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    return ReportOut(id=f"RPT-{incident.id}", incidentTitle=incident.title, **result)


# ── Threat intelligence ──────────────────────────────────────────────────────

@router.get("/threat-intelligence/indicators", response_model=IndicatorListOut, tags=["threat-intelligence"])
def list_indicators(db: Session = Depends(get_db)):
    alerts = db.query(AlertModel).all()
    grouped = {}
    for a in alerts:
        candidates = [x for x in [a.src_ip, a.dest_ip] if x and x != "unknown"]
        for value in candidates:
            item = grouped.setdefault(value, {"value": value, "matches": [], "incidents": set(), "techniques": set()})
            item["matches"].append(a)
            if a.correlation_id: item["incidents"].add(a.correlation_id)
            item["techniques"].update(a.mitre_techniques or [])
    results = []
    sev_weight = {"CRITICAL":5,"HIGH":4,"MEDIUM":3,"LOW":2,"INFORMATIONAL":1}
    for value, item in grouped.items():
        matches = sorted(item["matches"], key=lambda x: x.timestamp)
        max_sev = max((a.severity for a in matches), key=lambda x: sev_weight.get(x,0))
        confidence = min(99, 55 + len(matches)*5 + len(item["incidents"])*8)
        reputation = "MALICIOUS" if max_sev in {"CRITICAL","HIGH"} and item["incidents"] else ("SUSPICIOUS" if max_sev != "INFORMATIONAL" else "BENIGN")
        if value.startswith("http"): typ="URL"
        elif len(value)==64: typ="SHA256"
        elif value.count(".")==3 and all(part.isdigit() for part in value.split(".")): typ="IPv4"
        else: typ="Domain"
        results.append(IndicatorOut(value=value,type=typ,reputation=reputation,confidence=confidence,firstSeen=matches[0].timestamp,lastSeen=matches[-1].timestamp,associatedIncidents=list(item["incidents"]),relatedMitre=list(item["techniques"])))
    results.sort(key=lambda x:(x.reputation != "MALICIOUS", -x.confidence, x.value))
    return IndicatorListOut(indicators=results,total=len(results))

@router.get("/threat-intelligence/search", response_model=IndicatorOut, tags=["threat-intelligence"])
def search_indicator(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    needle = q.strip().lower()
    alerts = db.query(AlertModel).all()
    matches = [a for a in alerts if needle in (a.src_ip or "").lower() or needle in (a.dest_ip or "").lower() or needle in (a.raw_event or "").lower() or needle in (a.event or "").lower()]
    if not matches:
        return IndicatorOut(value=q, type="Unknown", reputation="UNKNOWN", confidence=0, firstSeen="", lastSeen="", associatedIncidents=[], relatedMitre=[])
    matches.sort(key=lambda a: a.timestamp)
    incidents = list(dict.fromkeys(a.correlation_id for a in matches if a.correlation_id))
    techniques = list(dict.fromkeys(t for a in matches for t in (a.mitre_techniques or [])))
    max_sev = max((a.severity for a in matches), key=lambda x: {"CRITICAL":5,"HIGH":4,"MEDIUM":3,"LOW":2,"INFORMATIONAL":1}.get(x,0))
    confidence = min(99, 55 + len(matches)*5 + len(incidents)*8)
    reputation = "MALICIOUS" if max_sev in {"CRITICAL","HIGH"} and incidents else "SUSPICIOUS"
    if "." in q and all(part.isdigit() for part in q.split(".") if part): indicator_type = "IPv4"
    elif q.startswith("http"): indicator_type = "URL"
    elif len(q) == 64: indicator_type = "SHA256"
    else: indicator_type = "Domain"
    return IndicatorOut(value=q, type=indicator_type, reputation=reputation, confidence=confidence, firstSeen=matches[0].timestamp, lastSeen=matches[-1].timestamp, associatedIncidents=incidents, relatedMitre=techniques)


# ── Live threat-feed simulator ───────────────────────────────────────────────

_LIVE_COUNTER = itertools.count()

LIVE_SCENARIOS = [
    ("SIEM", "Suspicious PowerShell encoded command execution", "HIGH", "powershell -enc QWxhZGRpbjpPcGVuU2VzYW1l"),
    ("EDR", "LSASS credential memory dump detected", "CRITICAL", "rundll32.exe comsvcs.dll MiniDump lsass.exe"),
    ("Network Sensor", "HTTPS C2 beacon observed", "CRITICAL", "periodic callback to external endpoint"),
    ("Threat Intel", "Known malicious C2 indicator match", "HIGH", "indicator reputation match"),
    ("SIEM", "Scheduled task created for persistence", "HIGH", "task scheduler persistence"),
    ("EDR", "Normal Windows administration PowerShell", "LOW", "internal maintenance command"),
    ("Network Sensor", "Routine vulnerability scanner activity", "LOW", "scheduled vulnerability scan"),
    ("SIEM", "Successful VPN login from known device", "LOW", "normal authentication"),
    ("Threat Intel", "Suspicious DNS tunneling indicator", "HIGH", "dns tunneling possible exfiltration"),
    ("EDR", "Ransomware file encryption behaviour", "CRITICAL", "ransomware file encryption shadow copy"),
]


def _live_feed_batch() -> List[Dict[str, Any]]:
    """Generate deterministic, safe-to-demo multi-source attack or benign telemetry."""
    tick = next(_LIVE_COUNTER)
    now = datetime.now(timezone.utc)
    scenarios = [
        ("Credential Access + C2", [
            ("SIEM", "Suspicious PowerShell encoded command execution", "HIGH", "powershell -enc demo"),
            ("EDR", "LSASS credential memory dump detected", "CRITICAL", "rundll32.exe MiniDump lsass.exe"),
            ("Network Sensor", "HTTPS C2 beacon observed", "CRITICAL", "periodic callback to external endpoint"),
            ("Threat Intel", "Known malicious C2 indicator match", "HIGH", "indicator reputation match", 96),
        ]),
        ("Ransomware", [
            ("EDR", "Ransomware file encryption behaviour", "CRITICAL", "shadow copy deletion + encryption"),
            ("SIEM", "Mass file renaming and encryption activity", "CRITICAL", "high file-operation rate"),
            ("Network Sensor", "Outbound ransomware C2 callback", "HIGH", "HTTPS callback"),
            ("Threat Intel", "Known ransomware infrastructure match", "HIGH", "malicious infrastructure", 94),
        ]),
        ("Benign Operations", [
            ("SIEM", "Scheduled backup batch process", "LOW", "approved backup window"),
            ("EDR", "Normal Windows administration PowerShell", "LOW", "internal maintenance command"),
            ("Network Sensor", "Routine vulnerability scanner activity", "LOW", "scheduled vulnerability scan"),
        ]),
        ("DNS Exfiltration", [
            ("Network Sensor", "DNS tunneling and data exfiltration detection", "HIGH", "TXT queries with long encoded labels"),
            ("SIEM", "Unusual DNS query volume from endpoint", "HIGH", "repeated TXT requests"),
            ("Threat Intel", "Suspicious exfiltration domain indicator", "HIGH", "domain reputation match", 91),
        ]),
    ]
    label, records = scenarios[tick % len(scenarios)]
    host = f"LIVE-{['SOC','OPS','FIN','WEB'][tick % 4]}-{tick % 90 + 10:02d}"
    ip = f"198.51.100.{10 + (tick % 220)}" if label != "Benign Operations" else f"10.20.{tick % 20 + 1}.{20 + tick % 200}"
    dest = f"10.30.{tick % 20 + 1}.{10 + tick % 200}"
    feeds = []
    for idx, rec in enumerate(records):
        source, event, severity, detail, *extra = rec
        payload = {"event": event, "src_ip": ip, "dest_ip": dest, "host": host, "severity": severity, "detail": detail, "timestamp": (now.replace(microsecond=0) + __import__('datetime').timedelta(seconds=idx * 40)).strftime("%Y-%m-%d %H:%M:%S")}
        if extra:
            payload["confidence"] = extra[0]
        feeds.append({"source": source, "payload": payload})
    return feeds

@router.post("/demo/live-tick", response_model=IngestResponse, tags=["demo", "live-feed"])
def live_feed_tick(db: Session = Depends(get_db)):
    """Generate one live-feed tick and send it through the same production ingestion path."""
    feeds = _live_feed_batch()
    new_alerts, new_incidents, updated_incidents = ingest_feeds(feeds, db)
    return IngestResponse(
        ingested=len(new_alerts),
        newIncidents=len(new_incidents),
        updatedIncidents=len(updated_incidents),
        alerts=[_to_alert_out(a) for a in new_alerts],
        incidents=[_to_incident_out(i) for i in new_incidents + updated_incidents],
    )


@router.get("/demo/live-status", tags=["demo", "live-feed"])
def live_feed_status(db: Session = Depends(get_db)):
    return {
        "enabled": True,
        "mode": "simulated_live",
        "sources": ["SIEM", "EDR", "Network Sensor", "Threat Intel"],
        "alertCount": db.query(AlertModel).count(),
        "incidentCount": db.query(IncidentModel).count(),
    }


# ── Feed Bot demo ─────────────────────────────────────────────────────────────

@router.post("/demo/feed-bot/tick", response_model=IngestResponse, tags=["demo", "feed-bot"])
def feed_bot_tick(db: Session = Depends(get_db)):
    """Emit one refreshed event from the four source JSON feeds."""
    item = feed_bot_next_event()
    new_alerts, new_incidents, updated_incidents = ingest_feeds(
        [{"source": item["source"], "payload": item["payload"]}], db
    )
    return IngestResponse(
        ingested=len(new_alerts),
        newIncidents=len(new_incidents),
        updatedIncidents=len(updated_incidents),
        alerts=[_to_alert_out(a) for a in new_alerts],
        incidents=[_to_incident_out(i) for i in new_incidents + updated_incidents],
    )


@router.get("/demo/feed-bot/status", tags=["demo", "feed-bot"])
def feed_bot_state():
    return feed_bot_status()


@router.post("/demo/feed-bot/reset", tags=["demo", "feed-bot"])
def feed_bot_reset_state():
    feed_bot_reset()
    return feed_bot_status()


# ── Demo simulate-attack ──────────────────────────────────────────────────────

DEMO_ATTACK_FEEDS = [
    {"source": "SIEM",           "payload": {"event": "Suspicious Domain Controller Login",     "src_ip": "203.0.113.77", "dest_ip": "10.0.2.44", "host": "WS-OPS-17", "severity": "HIGH",     "user": "ops_admin"}},
    {"source": "EDR",            "payload": {"event": "PowerShell encoded command execution",   "src_ip": "203.0.113.77", "dest_ip": "10.0.2.44", "host": "WS-OPS-17", "severity": "HIGH",     "process": "powershell.exe -enc AAECAwQ="}},
    {"source": "Network Sensor", "payload": {"event": "HTTPS beacon to suspicious C2",          "src_ip": "203.0.113.77", "dest_ip": "10.0.2.44", "host": "WS-OPS-17", "severity": "CRITICAL", "destination": "203.0.113.77:443"}},
    {"source": "Threat Intel",   "payload": {"event": "Known malicious C2 indicator match",     "src_ip": "203.0.113.77", "dest_ip": "10.0.2.44", "host": "WS-OPS-17", "severity": "HIGH",     "indicator": "203.0.113.77", "confidence": 97}},
    {"source": "EDR",            "payload": {"event": "LSASS memory dump via rundll32",         "src_ip": "203.0.113.77", "dest_ip": "10.0.2.44", "host": "WS-OPS-17", "severity": "CRITICAL", "process": "rundll32.exe", "target": "lsass.exe"}},
    {"source": "SIEM",           "payload": {"event": "Scheduled task created for persistence", "src_ip": "203.0.113.77", "dest_ip": "10.0.2.44", "host": "WS-OPS-17", "severity": "HIGH",     "task": "WindowsUpdateHelper"}},
]


@router.post("/demo/simulate-attack", response_model=IngestResponse, tags=["demo"])
def simulate_attack(db: Session = Depends(get_db)):
    # Give every simulation a fresh attack identity so repeated demo clicks
    # create a new incident rather than merging into the previous simulation.
    existing_simulations = db.query(AlertModel).filter(AlertModel.src_ip.like("203.0.113.%")).count()
    host_number = 17 + (existing_simulations // 6)
    host = f"WS-OPS-{host_number:02d}"
    ip_octet = 77 + (existing_simulations // 6)
    if ip_octet > 250:
        ip_octet = 77 + ((existing_simulations // 6) % 170)
    feeds = deepcopy(DEMO_ATTACK_FEEDS)
    base_time = datetime.now(timezone.utc).replace(microsecond=0)
    for idx, feed in enumerate(feeds):
        payload = feed["payload"]
        payload["src_ip"] = f"203.0.113.{ip_octet}"
        payload["host"] = host
        payload["timestamp"] = (base_time + __import__('datetime').timedelta(seconds=idx * 45)).strftime("%Y-%m-%d %H:%M:%S")
    new_alerts, new_incidents, updated_incidents = ingest_feeds(feeds, db)
    return IngestResponse(
        ingested=len(new_alerts),
        newIncidents=len(new_incidents),
        updatedIncidents=len(updated_incidents),
        alerts=[_to_alert_out(a) for a in new_alerts],
        incidents=[_to_incident_out(i) for i in new_incidents + updated_incidents],
    )


@router.post("/demo/reset", response_model=ResetOut, tags=["demo"])
def reset_demo(db: Session = Depends(get_db)):
    # Rebuild the deterministic demo dataset through the same production ingestion path.
    from .seed import DEMO_FEEDS
    from .models import IncidentNotificationModel
    db.query(IncidentNotificationModel).delete()
    db.query(AlertModel).delete()
    db.query(IncidentModel).delete()
    db.commit()
    ingest_feeds(DEMO_FEEDS, db)
    return ResetOut(status="ok", alertCount=db.query(AlertModel).count(), incidentCount=db.query(IncidentModel).count())

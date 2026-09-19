"""
Alert ingestion service — coordinates normalisation, correlation, and DB persistence.
"""
from __future__ import annotations
import uuid
from typing import Any, Dict, List, Tuple

from sqlalchemy.orm import Session

from ..models import AlertModel, IncidentModel, MitreTechniqueModel
from .normalizer import normalize_feed
from .correlator import correlate, calculate_dashboard


# ── helpers ──────────────────────────────────────────────────────────────────

def _alert_row_to_dict(a: AlertModel) -> Dict:
    return {
        "id": a.id,
        "timestamp": a.timestamp,
        "source": a.source,
        "event": a.event,
        "src_ip": a.src_ip,
        "dest_ip": a.dest_ip,
        "host": a.host,
        "severity": a.severity,
        "status": a.status,
        "correlation_id": a.correlation_id,
        "raw_event": a.raw_event,
        "normalized_event": a.normalized_event,
        "mitre_techniques": a.mitre_techniques or [],
        "ml_model": getattr(a, "ml_model", None),
        "ml_threat_probability": getattr(a, "ml_threat_probability", 0),
        "ml_classification": getattr(a, "ml_classification", "INVESTIGATING"),
        "ml_priority": getattr(a, "ml_priority", "MEDIUM"),
    }


def _incident_row_to_dict(i: IncidentModel) -> Dict:
    return {
        "id": i.id,
        "title": i.title,
        "priority": i.priority,
        "confidence": i.confidence,
        "threat_score": i.threat_score,
        "related_alerts_count": i.related_alerts_count,
        "mitre_techniques": i.mitre_techniques or [],
        "status": i.status,
        "classification": i.classification,
        "first_seen": i.first_seen,
        "last_seen": i.last_seen,
        "affected_assets": i.affected_assets or [],
        "why_correlated": i.why_correlated,
        "timeline": i.timeline or [],
        "source_count": i.source_count,
        "ml_model": i.ml_model,
        "ml_threat_probability": i.ml_threat_probability,
        "correlation_evidence": getattr(i, "correlation_evidence", None) or [],
        "evidence_edges": getattr(i, "evidence_edges", None) or [],
    }


# ── public API ────────────────────────────────────────────────────────────────

def ingest_feeds(
    feeds: List[Dict[str, Any]],
    db: Session,
) -> Tuple[List[AlertModel], List[IncidentModel], List[IncidentModel]]:
    """Normalise, correlate, and persist a batch of raw feed records."""
    new_alert_dicts = []
    for feed in feeds:
        alert_id = f"A{uuid.uuid4().hex[:6].upper()}"
        new_alert_dicts.append(normalize_feed(feed["payload"], feed["source"], alert_id))

    # Run ML inference for every newly ingested alert before correlation.
    from .ml_threat_model import MODEL
    for a in new_alert_dicts:
        pred = MODEL.predict(a, [a])
        a["ml_model"] = "XGBClassifier"
        a["ml_threat_probability"] = pred["threat_probability"]
        a["ml_classification"] = pred["classification"]
        a["ml_priority"] = pred["priority"]

    existing_alerts = [_alert_row_to_dict(a) for a in db.query(AlertModel).all()]
    existing_incident_rows = db.query(IncidentModel).all()
    existing_priority_map = {i.id: i.priority for i in existing_incident_rows}
    existing_incidents = [_incident_row_to_dict(i) for i in existing_incident_rows]
    updated_new, new_incidents, updated_incidents = correlate(
        new_alert_dicts, existing_alerts, existing_incidents
    )

    # Incidents must exist before alerts reference them via the foreign key.
    new_incident_rows: List[IncidentModel] = []
    for inc in new_incidents:
        row = IncidentModel(
            id=inc["id"], title=inc["title"], priority=inc["priority"], confidence=inc["confidence"],
            threat_score=inc.get("threat_score", 0), related_alerts_count=inc["related_alerts_count"],
            mitre_techniques=inc["mitre_techniques"], status=inc["status"], classification=inc["classification"],
            first_seen=inc["first_seen"], last_seen=inc["last_seen"], affected_assets=inc["affected_assets"],
            why_correlated=inc["why_correlated"], timeline=inc["timeline"], source_count=inc.get("source_count", 1),
            ml_model=inc.get("ml_model", "XGBClassifier"), ml_threat_probability=inc.get("ml_threat_probability", inc.get("threat_score", 0)),
            correlation_evidence=inc.get("correlation_evidence", []), evidence_edges=inc.get("evidence_edges", []),
        )
        db.add(row)
        new_incident_rows.append(row)
    db.flush()

    new_alert_rows: List[AlertModel] = []
    for a in updated_new:
        row = AlertModel(
            id=a["id"], timestamp=a["timestamp"], source=a["source"], event=a["event"],
            src_ip=a["src_ip"], dest_ip=a["dest_ip"], host=a["host"], severity=a["severity"],
            status=a["status"], correlation_id=a.get("correlation_id"), raw_event=a["raw_event"],
            normalized_event=a["normalized_event"], mitre_techniques=a["mitre_techniques"],
            ml_model=a.get("ml_model", "XGBClassifier"),
            ml_threat_probability=a.get("ml_threat_probability", 0),
            ml_classification=a.get("ml_classification", "INVESTIGATING"),
            ml_priority=a.get("ml_priority", "MEDIUM"),
        )
        db.add(row)
        new_alert_rows.append(row)

    updated_incident_rows: List[IncidentModel] = []
    for inc in updated_incidents:
        row = db.query(IncidentModel).filter(IncidentModel.id == inc["id"]).first()
        if row:
            row.title = inc["title"]; row.priority = inc["priority"]; row.confidence = inc["confidence"]
            row.threat_score = inc.get("threat_score", row.threat_score)
            row.related_alerts_count = inc["related_alerts_count"]; row.mitre_techniques = inc["mitre_techniques"]
            row.status = inc["status"]; row.classification = inc["classification"]
            row.first_seen = inc["first_seen"]; row.last_seen = inc["last_seen"]
            row.affected_assets = inc["affected_assets"]; row.why_correlated = inc["why_correlated"]
            row.timeline = inc["timeline"]; row.source_count = inc.get("source_count", row.source_count)
            row.ml_model = inc.get("ml_model", row.ml_model); row.ml_threat_probability = inc.get("ml_threat_probability", row.ml_threat_probability)
            row.correlation_evidence = inc.get("correlation_evidence", row.correlation_evidence or []); row.evidence_edges = inc.get("evidence_edges", row.evidence_edges or [])
            updated_incident_rows.append(row)

    _update_mitre_counts(new_alert_rows, db)
    db.commit()
    for r in new_alert_rows + new_incident_rows + updated_incident_rows:
        db.refresh(r)

    # Notify only at the incident layer. New incidents and priority escalations
    # are eligible; the notification service deduplicates repeated updates.
    from .notifications import notify_incidents
    eligible = list(new_incident_rows)
    for row in updated_incident_rows:
        previous = existing_priority_map.get(row.id, "LOW")
        if row.priority != previous and row.priority in {"HIGH", "CRITICAL"}:
            eligible.append(row)
    notify_incidents(db, eligible)
    return new_alert_rows, new_incident_rows, updated_incident_rows


def _update_mitre_counts(alert_rows: List[AlertModel], db: Session) -> None:
    """Increment observation counts for every technique seen in new alerts."""
    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).strftime("%H:%M %p")
    for alert in alert_rows:
        for tech_id in (alert.mitre_techniques or []):
            row = db.query(MitreTechniqueModel).filter(
                MitreTechniqueModel.id == tech_id
            ).first()
            if row:
                row.count += 1
                row.last_observed = now_str
            # Unknown technique IDs from live ingestion are silently skipped

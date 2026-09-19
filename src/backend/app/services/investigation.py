"""Evidence-first incident investigation and BLUF generation.

The service is deterministic by default so the demo works without external AI
credentials. It is deliberately structured as an AI-ready evidence package:
all facts supplied to a future model are derived from the correlated incident.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Dict, List

from sqlalchemy.orm import Session

from ..models import AlertModel, IncidentModel


def _incident_evidence(incident: IncidentModel, alerts: List[AlertModel]) -> List[str]:
    evidence = []
    for a in alerts:
        evidence.append(
            f"[{a.severity}] {a.source}: {a.event} | {a.src_ip} -> {a.dest_ip} | host={a.host}"
        )
    return evidence


def build_investigation(incident: IncidentModel, alerts: List[AlertModel]) -> Dict:
    evidence = _incident_evidence(incident, alerts)
    sources = list(dict.fromkeys(a.source for a in alerts))
    indicators = list(dict.fromkeys(
        x for a in alerts for x in (a.src_ip, a.dest_ip) if x and x != "unknown"
    ))
    techniques = incident.mitre_techniques or []
    assets = incident.affected_assets or []

    if incident.classification == "GENUINE_THREAT":
        assessment = (
            f"The evidence supports a genuine multi-stage threat against "
            f"{', '.join(assets) or 'the affected environment'}. "
            f"{incident.related_alerts_count} alerts from {len(sources)} independent "
            f"sources were correlated within the detection window. The resulting "
            f"threat score is {incident.threat_score}/100 with {incident.confidence}% confidence."
        )
    elif incident.classification == "LIKELY_FALSE_POSITIVE":
        assessment = (
            f"The incident has limited corroborating evidence and is currently assessed "
            f"as a likely false positive. Score {incident.threat_score}/100 and confidence "
            f"{incident.confidence}%. Analyst validation is recommended before containment."
        )
    else:
        assessment = (
            f"The activity is suspicious and requires analyst investigation. "
            f"Current score is {incident.threat_score}/100 with {incident.confidence}% confidence."
        )

    bluf = (
        f"{incident.priority} priority: {incident.title}. "
        f"ThreatForge correlated {incident.related_alerts_count} alerts across {len(sources)} "
        f"source feeds affecting {', '.join(assets) or 'identified assets'}. "
        f"The evidence indicates {incident.classification.replace('_', ' ').lower()} activity "
        f"with {incident.confidence}% confidence and a threat score of {incident.threat_score}/100. "
        f"Observed MITRE ATT&CK techniques: {', '.join(techniques) or 'none mapped'}."
    )

    actions = []
    if incident.priority in {"CRITICAL", "HIGH"}:
        actions.extend([
            f"Contain or isolate: {', '.join(assets) or 'affected endpoints'}.",
            "Block or investigate confirmed malicious network indicators.",
            "Validate and reset credentials associated with the affected activity.",
            "Preserve telemetry and hunt for the observed MITRE techniques across adjacent hosts.",
        ])
    else:
        actions.extend([
            "Validate the alert chain against endpoint and network telemetry.",
            "Continue monitoring the affected assets for corroborating evidence.",
            "Close as false positive only after analyst review confirms benign activity.",
        ])

    return {
        "incidentId": incident.id,
        "generatedBy": "ThreatForge Evidence Engine",
        "created": datetime.now(timezone.utc).isoformat(),
        "bluf": bluf,
        "threatAssessment": assessment,
        "attackTimeline": incident.timeline or [],
        "mitreTechniques": techniques,
        "indicators": indicators,
        "evidence": evidence,
        "recommendedActions": actions,
        "priority": incident.priority,
        "confidence": incident.confidence,
        "classification": incident.classification,
        "whyCorrelated": incident.why_correlated,
    }


def investigate(db: Session, incident_id: str) -> Dict | None:
    incident = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not incident:
        return None
    alerts = db.query(AlertModel).filter(AlertModel.correlation_id == incident_id).order_by(AlertModel.timestamp.asc()).all()
    return build_investigation(incident, alerts)

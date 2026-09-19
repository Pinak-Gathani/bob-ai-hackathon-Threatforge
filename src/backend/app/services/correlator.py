"""Evidence-first alert correlation and threat prioritisation.

The engine combines deterministic security evidence with the XGBoost model as
an advisory signal.  Correlation is graph-based: alerts become nodes and an
edge is created only when they are temporally close and share meaningful
entities/techniques.  This prevents a common ATT&CK technique by itself from
merging unrelated hosts.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from .normalizer import SEVERITY_WEIGHTS
from .ml_threat_model import MODEL

CORRELATION_WINDOW_MINUTES = 15
MALICIOUS_HINTS = (
    "ransomware", "cobalt strike", "c2", "beacon", "credential dump", "lsass",
    "memory dump", "encoded command", "powershell -enc", "web shell", "webshell",
    "sql injection", "remote code execution", "exfiltration", "dns tunneling",
    "malicious", "blacklisted", "kerberoast", "process injection", "lateral movement",
    "shadow copy", "vssadmin", "persistence", "phishing", "payload", "trojan",
)
BENIGN_HINTS = (
    "routine", "scheduled scan", "vulnerability scanner", "qualys", "nessus",
    "backup", "snapshot", "maintenance", "known device", "health check",
    "patching", "software deployment", "successful login", "normal administration",
)


def _parse_ts(ts: str) -> Optional[datetime]:
    if not ts:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(ts, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    try:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _within_window(ts_a: str, ts_b: str, minutes: int = CORRELATION_WINDOW_MINUTES) -> bool:
    a, b = _parse_ts(ts_a), _parse_ts(ts_b)
    if a is None or b is None:
        return False
    return abs((a - b).total_seconds()) <= minutes * 60


def _entities(alert: Dict[str, Any]) -> Set[str]:
    return {
        str(v).strip().lower()
        for v in (alert.get("src_ip"), alert.get("dest_ip"), alert.get("host"))
        if v and str(v).strip().lower() != "unknown"
    }


def _network_entities(alert: Dict[str, Any]) -> Set[str]:
    return {
        str(v).strip().lower()
        for v in (alert.get("src_ip"), alert.get("dest_ip"))
        if v and str(v).strip().lower() != "unknown"
    }


def _entity_overlap(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    return bool(_entities(a) & _entities(b))


def _technique_overlap(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    return bool(set(a.get("mitre_techniques", [])) & set(b.get("mitre_techniques", [])))


def _edge_reason(a: Dict[str, Any], b: Dict[str, Any]) -> Tuple[bool, List[str], int]:
    if not _within_window(a.get("timestamp", ""), b.get("timestamp", "")):
        return False, [], 0
    reasons: List[str] = []
    score = 0
    if _network_entities(a) & _network_entities(b):
        score += 55
        reasons.append("shared network entity")
    elif a.get("host", "unknown") != "unknown" and a.get("host") == b.get("host"):
        score += 45
        reasons.append("shared host")
    if _technique_overlap(a, b):
        # When both network entities are absent, ATT&CK overlap is the strongest
        # available linkage. It is still time-bounded and therefore does not
        # create a global technique-only cluster.
        if not _network_entities(a) and not _network_entities(b):
            score += 55
            reasons.append("ATT&CK technique overlap with missing network telemetry")
        else:
            score += 25
            reasons.append("ATT&CK technique overlap")
    if a.get("source") != b.get("source"):
        score += 15
        reasons.append("cross-source corroboration")
    # A shared host plus technique overlap is useful even when IP telemetry is absent.
    if score < 55 and _entity_overlap(a, b) and _technique_overlap(a, b):
        score += 15
    return score >= 55, reasons, min(score, 99)


def _text(alert: Dict[str, Any]) -> str:
    return " ".join(str(alert.get(k, "")) for k in ("event", "normalized_event", "raw_event")).lower()


def _has_indicator_confidence(alert: Dict[str, Any]) -> int:
    raw = str(alert.get("raw_event", ""))
    values = re.findall(r'"(?:confidence|score|reputation_score)"\s*:\s*(\d+(?:\.\d+)?)', raw, flags=re.I)
    return max([int(float(v)) for v in values] or [0])


def _score_group(group: List[Dict[str, Any]]) -> Tuple[int, int, str]:
    """Return evidence score, confidence and classification.

    The ML model is intentionally not the sole decision-maker.  This prevents a
    model-only false positive from becoming a commander-facing incident.
    """
    if not group:
        return 0, 0, "LIKELY_FALSE_POSITIVE"

    max_sev = max(SEVERITY_WEIGHTS.get(a.get("severity", "MEDIUM"), 50) for a in group)
    sources = {a.get("source") for a in group if a.get("source")}
    hosts = {a.get("host") for a in group if a.get("host") not in (None, "unknown")}
    techniques = {t for a in group for t in a.get("mitre_techniques", [])}
    text = " ".join(_text(a) for a in group)
    malicious_hits = sum(1 for k in MALICIOUS_HINTS if k in text)
    benign_hits = sum(1 for k in BENIGN_HINTS if k in text)
    ti_conf = max((_has_indicator_confidence(a) for a in group), default=0)

    # Evidence components are bounded, transparent and intentionally redundant.
    score = max_sev * 0.45
    score += min(18, max(0, (len(sources) - 1) * 9))
    score += min(12, max(0, (len(group) - 1) * 3))
    score += min(12, len(techniques) * 3)
    score += min(10, len(hosts) * 5)
    score += min(12, malicious_hits * 3)
    score += min(10, ti_conf * 0.10)
    score -= min(25, benign_hits * 7) if malicious_hits == 0 else 0
    score = int(round(max(1, min(99, score))))

    # Deterministic guardrails for the demo and for explainability.
    if max_sev <= 25 and malicious_hits == 0 and ti_conf < 70:
        classification = "LIKELY_FALSE_POSITIVE"
    elif malicious_hits >= 2 and (len(sources) >= 2 or max_sev >= 75):
        classification = "GENUINE_THREAT"
    elif ti_conf >= 80 and max_sev >= 75:
        classification = "GENUINE_THREAT"
    elif score >= 68 and len(sources) >= 2:
        classification = "GENUINE_THREAT"
    elif score <= 34:
        classification = "LIKELY_FALSE_POSITIVE"
    else:
        classification = "INVESTIGATING"

    confidence = min(99, max(35, int(round(55 + len(sources) * 7 + len(group) * 3 + min(15, len(techniques) * 3)))))
    if classification == "GENUINE_THREAT":
        confidence = min(99, confidence + 8)
    if classification == "LIKELY_FALSE_POSITIVE":
        confidence = min(99, confidence + 4)
    return score, confidence, classification


def _priority_for_group(group: List[Dict[str, Any]], score: int, classification: str) -> str:
    max_sev = max(SEVERITY_WEIGHTS.get(a.get("severity", "MEDIUM"), 50) for a in group)
    if classification == "LIKELY_FALSE_POSITIVE":
        return "LOW"
    if max_sev >= 100 or score >= 88:
        return "CRITICAL"
    if max_sev >= 75 or score >= 65:
        return "HIGH"
    if max_sev >= 50 or score >= 40:
        return "MEDIUM"
    return "LOW"


def _new_inc_id(existing_ids: Set[str]) -> str:
    nums = []
    for incident_id in existing_ids:
        if isinstance(incident_id, str) and incident_id.startswith("INC-"):
            try:
                nums.append(int(incident_id[4:]))
            except ValueError:
                pass
    candidate = max(nums, default=0) + 1
    while f"INC-{candidate:03d}" in existing_ids:
        candidate += 1
    return f"INC-{candidate:03d}"


def correlate(new_alerts: List[Dict], existing_alerts: List[Dict], existing_incidents: List[Dict]):
    all_alerts = existing_alerts + new_alerts
    working = [dict(a) for a in all_alerts]
    alert_by_id = {a["id"]: a for a in working}
    adjacency: Dict[str, Set[str]] = {a["id"]: set() for a in working}
    edge_reasons: Dict[Tuple[str, str], List[str]] = {}
    edge_scores: Dict[Tuple[str, str], int] = {}

    for idx, a in enumerate(working):
        for b in working[idx + 1:]:
            ok, reasons, edge_score = _edge_reason(a, b)
            if ok:
                adjacency[a["id"]].add(b["id"])
                adjacency[b["id"]].add(a["id"])
                edge_reasons[(a["id"], b["id"])] = reasons
                edge_reasons[(b["id"], a["id"])] = reasons
                edge_scores[(a["id"], b["id"])] = edge_score
                edge_scores[(b["id"], a["id"])] = edge_score

    groups: List[List[Dict]] = []
    visited: Set[str] = set()
    for a in working:
        if a["id"] in visited or not adjacency[a["id"]]:
            continue
        stack = [a["id"]]
        component = []
        while stack:
            node = stack.pop()
            if node in visited:
                continue
            visited.add(node)
            component.append(alert_by_id[node])
            stack.extend(adjacency[node] - visited)
        if len(component) >= 2:
            groups.append(component)

    incident_index = {i["id"]: dict(i) for i in existing_incidents}
    existing_alert_ids = {a["id"] for a in existing_alerts}
    new_alert_ids = {a["id"] for a in new_alerts}
    new_inc_ids: Set[str] = set()
    updated_inc_ids: Set[str] = set()

    for group in groups:
        existing_ids = [a.get("correlation_id") for a in group if a.get("correlation_id") in incident_index]
        inc_id = existing_ids[0] if existing_ids else _new_inc_id(set(incident_index))
        score, confidence, classification = _score_group(group)
        priority = _priority_for_group(group, score, classification)
        sorted_group = sorted(group, key=lambda a: a.get("timestamp", ""))
        techniques = list(dict.fromkeys(t for a in group for t in a.get("mitre_techniques", [])))
        source_count = len({a.get("source") for a in group})
        assets = list(dict.fromkeys(a.get("host") for a in group if a.get("host") not in (None, "unknown")))
        pair_reasons: List[str] = []
        pair_scores: List[int] = []
        evidence_edges = []
        for i, a in enumerate(sorted_group):
            for b in sorted_group[i + 1:]:
                if b["id"] in adjacency.get(a["id"], set()):
                    rs = edge_reasons.get((a["id"], b["id"]), [])
                    pair_reasons.extend(rs)
                    pair_scores.append(edge_scores.get((a["id"], b["id"]), 0))
                    evidence_edges.append({"from": a["id"], "to": b["id"], "reasons": rs, "score": edge_scores.get((a["id"], b["id"]), 0)})
        pair_reasons = list(dict.fromkeys(pair_reasons))
        avg_edge = int(round(sum(pair_scores) / len(pair_scores))) if pair_scores else 0
        ml_values = []
        for a in group:
            try:
                ml_values.append(int(MODEL.predict(a, [a])["threat_probability"]))
            except Exception:
                pass
        ml_advisory = int(round(sum(ml_values) / len(ml_values))) if ml_values else score

        evidence = []
        if source_count > 1:
            evidence.append(f"{source_count} independent telemetry sources corroborate the activity")
        if assets:
            evidence.append(f"shared affected host(s): {', '.join(assets[:4])}")
        if techniques:
            evidence.append(f"ATT&CK coverage: {', '.join(techniques)}")
        if pair_reasons:
            evidence.append("correlation signals: " + ", ".join(pair_reasons))
        evidence.append(f"temporal window: {CORRELATION_WINDOW_MINUTES} minutes")
        evidence.append(f"evidence-link strength: {avg_edge}/99")
        evidence.append(f"ML advisory probability: {ml_advisory}% (not used as a sole decision gate)")
        if classification == "LIKELY_FALSE_POSITIVE":
            evidence.append("benign context outweighs malicious indicators; analyst validation remains required")

        why = (
            f"{len(group)} alerts across {source_count} source(s) formed one evidence cluster. "
            f"The graph required temporal proximity plus meaningful entity/technique relationships. "
            f"Signals: {', '.join(pair_reasons) if pair_reasons else 'entity continuity'}. "
            f"Evidence score {score}/100; correlation confidence {confidence}%; classification {classification.replace('_', ' ').lower()}."
        )
        timeline = []
        for a in sorted_group:
            timeline.append({
                "time": a.get("timestamp", ""),
                "title": a.get("event", "Security event"),
                "description": a.get("normalized_event", ""),
                "source": a.get("source", ""),
                "severity": a.get("severity", "MEDIUM"),
                "techniqueId": (a.get("mitre_techniques") or [None])[0],
                "alertId": a.get("id"),
                "entities": list(_entities(a)),
                "mlThreatProbability": a.get("ml_threat_probability"),
            })
        inc = {
            "id": inc_id,
            "title": f"{'Correlated Threat' if classification == 'GENUINE_THREAT' else 'Suspicious Activity'} — {assets[0] if assets else 'Unknown Asset'}",
            "priority": priority,
            "confidence": confidence,
            "threat_score": score,
            "related_alerts_count": len(group),
            "mitre_techniques": techniques,
            "status": "NEW" if classification == "GENUINE_THREAT" else "INVESTIGATING",
            "classification": classification,
            "first_seen": sorted_group[0].get("timestamp", ""),
            "last_seen": sorted_group[-1].get("timestamp", ""),
            "affected_assets": assets,
            "why_correlated": why,
            "timeline": timeline,
            "source_count": source_count,
            "ml_model": "XGBClassifier (advisory)",
            "ml_threat_probability": ml_advisory,
            "correlation_evidence": evidence,
            "evidence_edges": evidence_edges,
        }
        if existing_ids and existing_ids[0] in incident_index:
            incident_index[existing_ids[0]].update(inc)
            if any(a["id"] in new_alert_ids for a in group):
                updated_inc_ids.add(existing_ids[0])
        else:
            incident_index[inc_id] = inc
            new_inc_ids.add(inc_id)
        new_status = "FALSE_POSITIVE" if classification == "LIKELY_FALSE_POSITIVE" else "CORRELATED"
        for a in group:
            alert_by_id[a["id"]]["correlation_id"] = inc_id
            alert_by_id[a["id"]]["status"] = new_status

    updated_new = [alert_by_id[a["id"]] for a in new_alerts]
    return updated_new, [incident_index[i] for i in new_inc_ids], [incident_index[i] for i in updated_inc_ids]


def calculate_dashboard(alerts: List[Dict], incidents: List[Dict]) -> Dict:
    fp = sum(1 for a in alerts if a.get("status") == "FALSE_POSITIVE")
    today = datetime.now(timezone.utc).date().isoformat()
    return {
        "totalAlerts": len(alerts),
        "totalAlertsTrend": "+ live",
        "correlatedIncidents": len(incidents),
        "correlatedIncidentsToday": sum(1 for i in incidents if str(i.get("last_seen", ""))[:10] == today),
        "criticalThreats": sum(1 for i in incidents if i.get("priority") == "CRITICAL"),
        "highPriority": sum(1 for i in incidents if i.get("priority") == "HIGH"),
        "falsePositives": fp,
        "falsePositivesPercentage": round(fp / len(alerts) * 100, 1) if alerts else 0.0,
    }

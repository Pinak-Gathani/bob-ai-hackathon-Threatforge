"""
Alert normalisation and MITRE ATT&CK technique mapping.

Converts raw heterogeneous feed payloads into a uniform Alert schema and maps
observable keywords to ATT&CK technique IDs — matching the logic already
present in src/frontend/src/services/threatEngine.ts so the backend and
frontend produce consistent results.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone


# ── MITRE keyword → technique ID map ─────────────────────────────────────────
# Mirrors the `techniqueMap` in the TypeScript threat engine exactly.
TECHNIQUE_MAP: Dict[str, List[str]] = {
    "powershell":        ["T1059.001"],
    "encoded command":   ["T1059.001"],
    "lsass":             ["T1003", "T1003.001"],
    "memory dump":       ["T1003", "T1003.001"],
    "scheduled task":    ["T1053.005"],
    "shadow copy":       ["T1490"],
    "vssadmin":          ["T1490"],
    "ransomware":        ["T1486"],
    "file encryption":   ["T1486"],
    "dns tunneling":     ["T1071.004"],
    "dns exfiltration":  ["T1041", "T1071.004"],
    "http c2":           ["T1071.001"],
    "https beacon":      ["T1071.001"],
    "cobalt strike":     ["T1071.001"],
    "mfa fatigue":       ["T1621"],
    "credential":        ["T1078"],
    "kerberos":          ["T1078", "T1558.003"],
    "kerberoast":        ["T1558.003"],
    "lateral movement":  ["T1021.002"],
    "smb":               ["T1021.002", "T1046"],
    "port scan":         ["T1046"],
    "dns tunnel":        ["T1071.004"],
    "exfiltrat":         ["T1041"],
    "tor":               ["T1090"],
    "sql injection":     ["T1190"],
    "vulnerability scan":["T1595"],
    "obfuscat":          ["T1027"],
    "password spray":    ["T1110.003"],
    "brute-force":       ["T1110"],
    "data export":       ["T1041"],
    "sensitive data":    ["T1041"],
    "replication":       ["T1029"],
}

SEVERITY_WEIGHTS = {
    "CRITICAL": 100,
    "HIGH": 75,
    "MEDIUM": 50,
    "LOW": 25,
    "INFORMATIONAL": 10,
}

VALID_SOURCES = {"SIEM", "EDR", "Network Sensor", "Threat Intel", "Satellite / RF"}
VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"}


def map_mitre(text: str) -> List[str]:
    """Return deduplicated ATT&CK technique IDs matched against `text`."""
    lower = text.lower()
    seen: set = set()
    result: List[str] = []
    for keyword, techniques in TECHNIQUE_MAP.items():
        if keyword in lower:
            for t in techniques:
                if t not in seen:
                    seen.add(t)
                    result.append(t)
    return result


def _str(value: Any, fallback: str = "unknown") -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def normalize_feed(payload: Dict[str, Any], source: str, alert_id: str) -> Dict[str, Any]:
    """
    Normalise a raw feed payload dict into our internal Alert shape.
    Returns a plain dict (not an ORM model) so it can be used before DB commit.
    """
    p = payload
    src_ip  = _str(p.get("srcIp") or p.get("src_ip") or p.get("sourceAddress") or
                   p.get("source_ip") or p.get("indicator"))
    dest_ip = _str(p.get("destIp") or p.get("dest_ip") or p.get("destinationAddress") or
                   p.get("destination_ip"))
    host    = _str(p.get("host") or p.get("device") or p.get("hostname") or
                   p.get("targetHost"))
    event   = _str(p.get("event") or p.get("event_type") or p.get("alert") or
                   p.get("process") or p.get("description"),
                   fallback=f"{source} security event")

    import json
    raw_event = json.dumps(p)
    parts = [event]
    if host != "unknown":
        parts.append(f"Host {host}.")
    if src_ip != "unknown":
        parts.append(f"Source {src_ip}.")
    if dest_ip != "unknown":
        parts.append(f"Destination {dest_ip}.")
    normalized_event = " ".join(parts)

    techniques = map_mitre(f"{event} {raw_event}")

    # Severity resolution — explicit > technique-implied > source-implied > default MEDIUM
    explicit = _str(p.get("severity"), "").upper()
    if explicit in VALID_SEVERITIES:
        severity = explicit
    elif any(t in techniques for t in ["T1490", "T1486", "T1003", "T1003.001"]):
        severity = "CRITICAL"
    elif techniques or source == "Threat Intel":
        severity = "HIGH"
    else:
        severity = "MEDIUM"

    timestamp_value = p.get("timestamp") or p.get("timestampUtc") or p.get("event_time") or p.get("time")
    if isinstance(timestamp_value, str) and timestamp_value.strip():
        timestamp = timestamp_value.strip().replace("T", " ").replace("Z", "")[:19]
    else:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    return {
        "id": alert_id,
        "timestamp": timestamp,
        "source": source,
        "event": event,
        "src_ip": src_ip,
        "dest_ip": dest_ip,
        "host": host,
        "severity": severity,
        "status": "UNPROCESSED",
        "raw_event": raw_event,
        "normalized_event": normalized_event,
        "mitre_techniques": techniques,
        "correlation_id": None,
    }

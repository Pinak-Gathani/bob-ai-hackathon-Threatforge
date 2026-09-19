"""
ThreatForge XGBoost session classifier.

Trained from:
- ThreatForge_XGBoost_Session_Dataset_15000.csv (primary session-level data)
- ThreatForge_Event_Log_Dataset_80000.csv (session-level event aggregation)

The model predicts the three dataset labels:
FP, Needs Investigation, TP.

session_id and user_id are never used as model features.  Evaluation uses
grouped train/validation/test splits by user_id to prevent the same user
appearing across splits.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier

MODEL_DIR = Path(__file__).resolve().parents[2] / "ml"
MODEL_FILE = MODEL_DIR / "threat_model.joblib"
META_FILE = MODEL_DIR / "model_metrics.json"

LABELS = ["FP", "Needs Investigation", "TP"]
LABEL_TO_ID = {v: i for i, v in enumerate(LABELS)}
ID_TO_LABEL = {i: v for i, v in enumerate(LABELS)}

SEVERITY_TO_NUM = {
    "INFORMATIONAL": 0.0,
    "LOW": 1.0,
    "MEDIUM": 2.0,
    "HIGH": 3.0,
    "CRITICAL": 4.0,
}
SOURCE_VALUES = ["SIEM", "EDR", "Network Sensor", "Threat Intel"]

# These are the exact session-level columns used by the trained artifact.
BASE_FEATURES = [
    "user_role", "source", "location", "protocol",
    "known_ip", "known_device", "vpn_used", "session_minutes",
    "event_count", "failed_attempts", "successful_logins",
    "request_rate_per_min", "unique_targets", "port_count",
    "sensitive_access_count", "data_volume_mb", "new_ip", "new_device",
    "impossible_travel", "threat_intel_hits", "endpoint_process_events",
    "lateral_hosts", "request_burst_score", "api_key_access",
    "credential_change", "data_export", "process_download_execute",
    "suspicious_dns", "encryption_event", "approved_activity",
    "mitre_technique", "risk_signal",
    "event_rows", "event_type_nunique", "event_source_nunique",
    "event_location_nunique", "event_known_ip_mean", "event_known_device_mean",
    "event_threat_indicator_sum", "event_mitre_nunique",
    "event_user_role_nunique", "event_time_span_min",
]


def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        if v is None or (isinstance(v, str) and not v.strip()):
            return default
        x = float(v)
        return default if not np.isfinite(x) else x
    except (TypeError, ValueError):
        return default


def _raw(alert: Dict[str, Any]) -> Dict[str, Any]:
    value = alert.get("raw_event", {})
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _first(d: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in d and d[key] not in (None, ""):
            return d[key]
    return default


def _event_type(alert: Dict[str, Any], raw: Dict[str, Any]) -> str:
    return str(_first(raw, "event_type", "eventType", default=alert.get("event", "UNKNOWN"))).upper()


def _mitre(alert: Dict[str, Any], raw: Dict[str, Any]) -> str:
    existing = alert.get("mitre_techniques") or raw.get("mitre_technique")
    if isinstance(existing, list) and existing:
        return str(existing[0])
    return str(existing or "UNKNOWN")


def _build_inference_row(alert: Dict[str, Any], group: List[Dict[str, Any]] | None) -> Dict[str, Any]:
    group = group or [alert]
    raws = [_raw(a) for a in group]
    raw = _raw(alert)

    text = " ".join(
        str(alert.get(k, "")) for k in ("event", "normalized_event", "raw_event")
    ).lower()

    severity = str(alert.get("severity", "MEDIUM")).upper()
    source = str(alert.get("source") or "SIEM")
    if source not in SOURCE_VALUES:
        source = "SIEM"

    # Prefer explicit session fields from the feed when present.
    def val(name: str, default: Any = None) -> Any:
        aliases = {
            "user_role": ("user_role", "userRole"),
            "location": ("location", "geo", "city"),
            "protocol": ("protocol", "network_protocol"),
            "known_ip": ("known_ip", "knownIp"),
            "known_device": ("known_device", "knownDevice"),
            "vpn_used": ("vpn_used", "vpnUsed"),
            "session_minutes": ("session_minutes", "sessionMinutes"),
            "event_count": ("event_count", "eventCount"),
            "failed_attempts": ("failed_attempts", "failedAttempts"),
            "successful_logins": ("successful_logins", "successfulLogins"),
            "request_rate_per_min": ("request_rate_per_min", "requestRatePerMin"),
            "unique_targets": ("unique_targets", "uniqueTargets"),
            "port_count": ("port_count", "portCount"),
            "sensitive_access_count": ("sensitive_access_count", "sensitiveAccessCount"),
            "data_volume_mb": ("data_volume_mb", "dataVolumeMb"),
            "new_ip": ("new_ip", "newIp"),
            "new_device": ("new_device", "newDevice"),
            "impossible_travel": ("impossible_travel", "impossibleTravel"),
            "threat_intel_hits": ("threat_intel_hits", "threatIntelHits"),
            "endpoint_process_events": ("endpoint_process_events", "endpointProcessEvents"),
            "lateral_hosts": ("lateral_hosts", "lateralHosts"),
            "request_burst_score": ("request_burst_score", "requestBurstScore"),
            "api_key_access": ("api_key_access", "apiKeyAccess"),
            "credential_change": ("credential_change", "credentialChange"),
            "data_export": ("data_export", "dataExport"),
            "process_download_execute": ("process_download_execute", "processDownloadExecute"),
            "suspicious_dns": ("suspicious_dns", "suspiciousDns"),
            "encryption_event": ("encryption_event", "encryptionEvent"),
            "approved_activity": ("approved_activity", "approvedActivity"),
            "risk_signal": ("risk_signal", "riskSignal"),
        }
        keys = aliases.get(name, (name,))
        x = _first(raw, *keys, default=None)
        if x is None:
            for rr in raws:
                x = _first(rr, *keys, default=None)
                if x is not None:
                    break
        return default if x is None else x

    user_role = str(val("user_role", "user"))
    location = str(val("location", "UNKNOWN"))
    protocol = str(val("protocol", "UNKNOWN"))

    row: Dict[str, Any] = {
        "user_role": user_role,
        "source": source,
        "location": location,
        "protocol": protocol,
        "known_ip": _safe_float(val("known_ip", int("known device" in text))),
        "known_device": _safe_float(val("known_device", int("known device" in text))),
        "vpn_used": _safe_float(val("vpn_used", int("vpn" in text))),
        "session_minutes": _safe_float(val("session_minutes", 0.0)),
        "event_count": _safe_float(val("event_count", len(group))),
        "failed_attempts": _safe_float(val("failed_attempts", int("failed login" in text or "login failure" in text))),
        "successful_logins": _safe_float(val("successful_logins", int("successful login" in text))),
        "request_rate_per_min": _safe_float(val("request_rate_per_min", 0.0)),
        "unique_targets": _safe_float(val("unique_targets", 0.0)),
        "port_count": _safe_float(val("port_count", int("port scan" in text or "scanning" in text))),
        "sensitive_access_count": _safe_float(val("sensitive_access_count", int(any(k in text for k in ("sensitive", "credential", "api key"))))),
        "data_volume_mb": _safe_float(val("data_volume_mb", 0.0)),
        "new_ip": _safe_float(val("new_ip", int("new ip" in text or "unknown ip" in text))),
        "new_device": _safe_float(val("new_device", int("new device" in text or "unknown device" in text))),
        "impossible_travel": _safe_float(val("impossible_travel", int("impossible travel" in text))),
        "threat_intel_hits": _safe_float(val("threat_intel_hits", int(source == "Threat Intel"))),
        "endpoint_process_events": _safe_float(val("endpoint_process_events", int("process" in text or "powershell" in text))),
        "lateral_hosts": _safe_float(val("lateral_hosts", int("lateral movement" in text))),
        "request_burst_score": _safe_float(val("request_burst_score", 0.0)),
        "api_key_access": _safe_float(val("api_key_access", int("api key" in text))),
        "credential_change": _safe_float(val("credential_change", int("credential change" in text))),
        "data_export": _safe_float(val("data_export", int("data export" in text or "exfiltration" in text))),
        "process_download_execute": _safe_float(val("process_download_execute", int("download" in text and ("execute" in text or "payload" in text)))),
        "suspicious_dns": _safe_float(val("suspicious_dns", int("dns tunnel" in text or "dns tunneling" in text))),
        "encryption_event": _safe_float(val("encryption_event", int("encryption" in text or "ransomware" in text))),
        "approved_activity": _safe_float(val("approved_activity", int(any(k in text for k in ("approved", "maintenance", "scheduled", "routine"))))),
        "mitre_technique": _mitre(alert, raw),
        "risk_signal": _safe_float(val("risk_signal", SEVERITY_TO_NUM.get(severity, 2.0))),
        "event_rows": float(len(group)),
        "event_type_nunique": float(len({_event_type(a, _raw(a)) for a in group})),
        "event_source_nunique": float(len({str(a.get("source") or "SIEM") for a in group})),
        "event_location_nunique": float(len({str(_first(_raw(a), "location", "geo", "city", default="UNKNOWN")) for a in group})),
        "event_known_ip_mean": float(np.mean([_safe_float(_first(_raw(a), "known_ip", "knownIp", default=0)) for a in group])),
        "event_known_device_mean": float(np.mean([_safe_float(_first(_raw(a), "known_device", "knownDevice", default=0)) for a in group])),
        "event_threat_indicator_sum": float(sum(_safe_float(_first(_raw(a), "threat_indicator", "threatIndicator", default=0)) for a in group)),
        "event_mitre_nunique": float(len({_mitre(a, _raw(a)) for a in group})),
        "event_user_role_nunique": float(len({str(_first(_raw(a), "user_role", "userRole", default="user")) for a in group})),
        "event_time_span_min": 0.0,
    }

    # Derive event type count features from the training artifact's feature list.
    for feature in _FEATURE_NAMES:
        if feature.startswith("evt_type__"):
            wanted = feature[len("evt_type__"):]
            row[feature] = float(sum(_event_type(a, _raw(a)) == wanted for a in group))

    return row


def _prepare_frame(row: Dict[str, Any]) -> pd.DataFrame:
    frame = pd.DataFrame([row])
    for c in _FEATURE_NAMES:
        if c not in frame:
            frame[c] = 0.0
    frame = frame[_FEATURE_NAMES].copy()
    frame[_NUMERIC_FEATURES] = frame[_NUMERIC_FEATURES].apply(pd.to_numeric, errors="coerce").fillna(0.0)
    frame[_CATEGORICAL_FEATURES] = frame[_CATEGORICAL_FEATURES].fillna("UNKNOWN").astype(str)
    frame[_CATEGORICAL_FEATURES] = _ENCODER.transform(frame[_CATEGORICAL_FEATURES])
    return frame


_ARTIFACT = None
_MODEL = None
_ENCODER = None
_FEATURE_NAMES: List[str] = []
_CATEGORICAL_FEATURES: List[str] = []
_NUMERIC_FEATURES: List[str] = []
_METADATA: Dict[str, Any] = {}


def _load() -> None:
    global _ARTIFACT, _MODEL, _ENCODER, _FEATURE_NAMES, _CATEGORICAL_FEATURES, _NUMERIC_FEATURES, _METADATA
    if _MODEL is not None:
        return
    if not MODEL_FILE.exists():
        raise FileNotFoundError(f"XGBoost model not found: {MODEL_FILE}")
    _ARTIFACT = joblib.load(MODEL_FILE)
    _MODEL = _ARTIFACT["model"]
    _ENCODER = _ARTIFACT["encoder"]
    _FEATURE_NAMES = list(_ARTIFACT["feature_names"])
    _CATEGORICAL_FEATURES = list(_ARTIFACT["categorical_features"])
    _NUMERIC_FEATURES = list(_ARTIFACT["numeric_features"])
    if META_FILE.exists():
        _METADATA = json.loads(META_FILE.read_text(encoding="utf-8"))


class ThreatMLModel:
    def __init__(self):
        _load()

    def model_info(self) -> Dict[str, Any]:
        _load()
        return {
            "model": "XGBClassifier",
            "algorithm": "XGBoost",
            "features": _FEATURE_NAMES,
            "metrics": _METADATA,
            "role": "3-class session classifier; TP probability is exposed as the primary threat signal",
        }

    def predict(self, alert: Dict[str, Any], group: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        _load()
        row = _build_inference_row(alert, group)
        X = _prepare_frame(row)
        probabilities = _MODEL.predict_proba(X)[0]
        pred_id = int(np.argmax(probabilities))
        label = ID_TO_LABEL[pred_id]

        p_fp, p_investigating, p_tp = [float(x) for x in probabilities]
        # Threat score treats Needs Investigation as partial threat evidence.
        threat_probability = int(round(np.clip((p_tp + 0.5 * p_investigating) * 100.0, 1, 99)))
        confidence = int(round(np.clip(np.max(probabilities) * 100.0, 1, 99)))

        classification = {
            "FP": "LIKELY_FALSE_POSITIVE",
            "Needs Investigation": "INVESTIGATING",
            "TP": "GENUINE_THREAT",
        }[label]

        if label == "TP":
            priority = "CRITICAL" if p_tp >= 0.75 else "HIGH"
        elif label == "Needs Investigation":
            priority = "MEDIUM"
        else:
            priority = "LOW"

        return {
            "threat_probability": threat_probability,
            "confidence": confidence,
            "classification": classification,
            "priority": priority,
            "predicted_label": label,
            "class_probabilities": {
                "FP": round(p_fp, 6),
                "Needs Investigation": round(p_investigating, 6),
                "TP": round(p_tp, 6),
            },
        }


MODEL = ThreatMLModel()

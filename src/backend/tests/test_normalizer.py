"""
Tests for the alert normalisation service.
"""
import pytest
from app.services.normalizer import normalize_feed, map_mitre


# ── map_mitre ─────────────────────────────────────────────────────────────────

def test_map_mitre_powershell():
    result = map_mitre("PowerShell encoded command execution")
    assert "T1059.001" in result


def test_map_mitre_lsass():
    result = map_mitre("LSASS memory dump attempt detected")
    assert "T1003" in result


def test_map_mitre_ransomware():
    result = map_mitre("ransomware file encryption detected")
    assert "T1486" in result
    assert "T1490" not in result  # shadow copy not mentioned


def test_map_mitre_multiple():
    result = map_mitre("kerberoasting credential harvesting via scheduled task")
    assert "T1078" in result
    assert "T1053.005" in result


def test_map_mitre_no_match():
    result = map_mitre("routine backup completed successfully")
    assert result == []


# ── normalize_feed ────────────────────────────────────────────────────────────

def test_normalize_severity_explicit():
    payload = {"event": "test", "src_ip": "1.2.3.4", "severity": "CRITICAL"}
    alert = normalize_feed(payload, "SIEM", "A001")
    assert alert["severity"] == "CRITICAL"


def test_normalize_severity_implied_critical():
    payload = {"event": "LSASS memory dump", "src_ip": "1.2.3.4"}
    alert = normalize_feed(payload, "EDR", "A002")
    assert alert["severity"] == "CRITICAL"


def test_normalize_severity_threat_intel_default():
    payload = {"event": "IOC match", "indicator": "evil.com"}
    alert = normalize_feed(payload, "Threat Intel", "A003")
    assert alert["severity"] == "HIGH"


def test_normalize_fields_extracted():
    payload = {
        "event": "Port scan detected",
        "src_ip": "10.1.1.1",
        "dest_ip": "10.2.2.2",
        "host": "WORKSTATION-01",
        "severity": "MEDIUM",
    }
    alert = normalize_feed(payload, "Network Sensor", "A004")
    assert alert["src_ip"] == "10.1.1.1"
    assert alert["dest_ip"] == "10.2.2.2"
    assert alert["host"] == "WORKSTATION-01"
    assert alert["source"] == "Network Sensor"
    assert alert["id"] == "A004"
    assert alert["status"] == "UNPROCESSED"
    assert alert["correlation_id"] is None


def test_normalize_fallback_unknown():
    payload = {"event": "something happened"}
    alert = normalize_feed(payload, "SIEM", "A005")
    assert alert["src_ip"] == "unknown"
    assert alert["host"] == "unknown"


def test_normalize_raw_event_is_json():
    import json
    payload = {"event": "test", "val": 42}
    alert = normalize_feed(payload, "SIEM", "A006")
    parsed = json.loads(alert["raw_event"])
    assert parsed["val"] == 42

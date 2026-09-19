"""
Tests for the correlation engine and priority scoring.
"""
import pytest
from app.services.correlator import (
    correlate, calculate_dashboard, _within_window, _entity_overlap,
    _technique_overlap, _score_group,
)
from app.services.normalizer import normalize_feed


# ── helpers ───────────────────────────────────────────────────────────────────

def make_alert(
    alert_id: str,
    src_ip: str = "unknown",
    host: str = "HOST-01",
    source: str = "SIEM",
    severity: str = "HIGH",
    mitre: list = None,
    timestamp: str = "2026-09-14 10:00:00",
) -> dict:
    return {
        "id": alert_id,
        "timestamp": timestamp,
        "source": source,
        "event": "test event",
        "src_ip": src_ip,
        "dest_ip": "unknown",
        "host": host,
        "severity": severity,
        "status": "UNPROCESSED",
        "raw_event": "{}",
        "normalized_event": "test",
        "mitre_techniques": mitre or [],
        "correlation_id": None,
    }


# ── temporal window ───────────────────────────────────────────────────────────

def test_within_window_same_time():
    assert _within_window("2026-09-14 10:00:00", "2026-09-14 10:00:00") is True


def test_within_window_14_minutes():
    assert _within_window("2026-09-14 10:00:00", "2026-09-14 10:14:00") is True


def test_within_window_16_minutes():
    assert _within_window("2026-09-14 10:00:00", "2026-09-14 10:16:00") is False


# ── entity overlap ────────────────────────────────────────────────────────────

def test_entity_overlap_shared_ip():
    a = make_alert("A1", src_ip="1.2.3.4")
    b = make_alert("A2", src_ip="1.2.3.4")
    assert _entity_overlap(a, b) is True


def test_entity_overlap_no_match():
    a = make_alert("A1", src_ip="1.2.3.4", host="HOST-A")
    b = make_alert("A2", src_ip="9.9.9.9", host="HOST-B")
    assert _entity_overlap(a, b) is False


def test_entity_overlap_shared_host():
    a = make_alert("A1", host="WS-FINANCE-04")
    b = make_alert("A2", host="WS-FINANCE-04")
    assert _entity_overlap(a, b) is True


# ── technique overlap ─────────────────────────────────────────────────────────

def test_technique_overlap_match():
    a = make_alert("A1", mitre=["T1059.001", "T1003"])
    b = make_alert("A2", mitre=["T1003"])
    assert _technique_overlap(a, b) is True


def test_technique_overlap_no_match():
    a = make_alert("A1", mitre=["T1059.001"])
    b = make_alert("A2", mitre=["T1486"])
    assert _technique_overlap(a, b) is False


# ── score group ───────────────────────────────────────────────────────────────

def test_score_single_source_low_evidence():
    group = [make_alert("A1"), make_alert("A2")]
    score, confidence, classification = _score_group(group)
    assert 0 <= score <= 99
    assert 0 <= confidence <= 99


def test_score_critical_multisource_genuine():
    group = [
        make_alert("A1", severity="CRITICAL", source="SIEM",           mitre=["T1059.001"]),
        make_alert("A2", severity="HIGH",     source="EDR",            mitre=["T1003"]),
        make_alert("A3", severity="CRITICAL", source="Network Sensor", mitre=["T1071.001"]),
        make_alert("A4", severity="HIGH",     source="Threat Intel",   mitre=["T1059.001"]),
    ]
    score, confidence, classification = _score_group(group)
    assert classification == "GENUINE_THREAT"
    assert score >= 65
    assert confidence >= 80


def test_score_false_positive_low_severity():
    group = [
        make_alert("A1", severity="INFORMATIONAL", source="SIEM", mitre=[]),
        make_alert("A2", severity="LOW",           source="SIEM", mitre=[]),
    ]
    score, confidence, classification = _score_group(group)
    assert classification == "LIKELY_FALSE_POSITIVE"


# ── full correlation flow ─────────────────────────────────────────────────────

def test_correlate_groups_same_ip():
    """Alerts sharing a source IP within the time window should be correlated."""
    a1 = make_alert("A1", src_ip="185.20.10.5", source="SIEM",    timestamp="2026-09-14 10:01:00")
    a2 = make_alert("A2", src_ip="185.20.10.5", source="EDR",     timestamp="2026-09-14 10:03:00")
    a3 = make_alert("A3", src_ip="185.20.10.5", source="Network Sensor", timestamp="2026-09-14 10:05:00")

    updated, new_incidents, updated_incidents = correlate([a1, a2, a3], [], [])
    assert len(new_incidents) == 1
    inc = new_incidents[0]
    assert inc["related_alerts_count"] == 3
    assert all(a["correlation_id"] == inc["id"] for a in updated)


def test_correlate_no_correlation_different_entities():
    """Alerts with completely different IPs, hosts and no technique overlap should not correlate."""
    a1 = make_alert("A1", src_ip="1.1.1.1", host="HOST-A", mitre=["T1059.001"])
    a2 = make_alert("A2", src_ip="2.2.2.2", host="HOST-B", mitre=["T1486"])

    updated, new_incidents, _ = correlate([a1, a2], [], [])
    assert len(new_incidents) == 0
    assert all(a["correlation_id"] is None for a in updated)


def test_correlate_outside_time_window():
    """Same IP but alerts far apart in time should NOT be correlated."""
    a1 = make_alert("A1", src_ip="1.1.1.1", timestamp="2026-09-14 08:00:00")
    a2 = make_alert("A2", src_ip="1.1.1.1", timestamp="2026-09-14 12:00:00")  # 4 hours apart

    updated, new_incidents, _ = correlate([a1, a2], [], [])
    assert len(new_incidents) == 0


def test_correlate_technique_overlap_without_ip():
    """Two alerts with overlapping MITRE techniques within the window should correlate."""
    a1 = make_alert("A1", host="HOST-X", src_ip="unknown", mitre=["T1059.001"], timestamp="2026-09-14 10:00:00")
    a2 = make_alert("A2", host="HOST-Y", src_ip="unknown", mitre=["T1059.001"], timestamp="2026-09-14 10:05:00")

    updated, new_incidents, _ = correlate([a1, a2], [], [])
    assert len(new_incidents) == 1


# ── dashboard calculation ─────────────────────────────────────────────────────

def test_calculate_dashboard_empty():
    stats = calculate_dashboard([], [])
    assert stats["totalAlerts"] == 0
    assert stats["falsePositivesPercentage"] == 0.0


def test_calculate_dashboard_with_data():
    alerts = [
        make_alert("A1"),
        {**make_alert("A2"), "status": "FALSE_POSITIVE"},
        {**make_alert("A3"), "status": "FALSE_POSITIVE"},
    ]
    incidents = [
        {"id": "I1", "priority": "CRITICAL", "last_seen": "2026-01-01"},
        {"id": "I2", "priority": "HIGH",     "last_seen": "2026-01-01"},
    ]
    stats = calculate_dashboard(alerts, incidents)
    assert stats["totalAlerts"] == 3
    assert stats["falsePositives"] == 2
    assert stats["criticalThreats"] == 1
    assert stats["highPriority"] == 1
    assert abs(stats["falsePositivesPercentage"] - 66.7) < 0.1

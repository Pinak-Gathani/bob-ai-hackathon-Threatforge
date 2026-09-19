"""
Demo seed data — mirrors the mock data in src/frontend/src/data/mockData.ts.
Inserted on first startup when the database is empty.
"""
from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from .models import AlertModel, IncidentModel, MitreTechniqueModel
from .services.ingestion import ingest_feeds


# ── MITRE technique catalogue ─────────────────────────────────────────────────

MITRE_TECHNIQUES = [
    {"id": "T1190",     "name": "Exploit Public-Facing Application",              "tactic": "Initial Access",       "severity": "MEDIUM",   "count": 14, "last_observed": "07:44 AM", "description": "Adversaries may attempt to exploit a weakness in an Internet-facing application or service to gain access."},
    {"id": "T1078",     "name": "Valid Accounts",                                  "tactic": "Initial Access",       "severity": "HIGH",     "count": 22, "last_observed": "10:01 AM", "description": "Adversaries may obtain and abuse credentials of existing accounts to gain initial access or elevate privileges."},
    {"id": "T1059.001", "name": "Command & Scripting Interpreter: PowerShell",    "tactic": "Execution",            "severity": "CRITICAL", "count": 38, "last_observed": "10:03 AM", "description": "Adversaries may abuse PowerShell commands and scripts to execute payloads, interact with services, and control endpoints."},
    {"id": "T1053.005", "name": "Scheduled Task/Job: Scheduled Task",             "tactic": "Persistence",          "severity": "HIGH",     "count": 9,  "last_observed": "05:30 AM", "description": "Adversaries may create scheduled tasks to execute programs at system boot or on a recurring schedule."},
    {"id": "T1068",     "name": "Exploitation for Privilege Escalation",          "tactic": "Privilege Escalation", "severity": "HIGH",     "count": 5,  "last_observed": "Yesterday", "description": "Adversaries may exploit software vulnerabilities in an effort to elevate privileges."},
    {"id": "T1027",     "name": "Obfuscated Files or Information",                "tactic": "Defense Evasion",      "severity": "HIGH",     "count": 19, "last_observed": "10:03 AM", "description": "Adversaries may attempt to make an executable or script difficult to discover or analyze by encoding or encrypting contents."},
    {"id": "T1003",     "name": "OS Credential Dumping",                          "tactic": "Credential Access",    "severity": "CRITICAL", "count": 17, "last_observed": "10:08 AM", "description": "Adversaries may attempt to dump credentials from memory (e.g., LSASS) or disk to obtain account logon hashes."},
    {"id": "T1003.001", "name": "OS Credential Dumping: LSASS Memory",           "tactic": "Credential Access",    "severity": "CRITICAL", "count": 12, "last_observed": "10:08 AM", "description": "Adversaries may attempt to access credential material stored in the process memory of the Local Security Authority Subsystem Service (LSASS)."},
    {"id": "T1558.003", "name": "Steal or Forge Kerberos Tickets: Kerberoasting", "tactic": "Credential Access",    "severity": "HIGH",     "count": 12, "last_observed": "05:00 AM", "description": "Adversaries may request service tickets (TGS) for SPNs and crack them offline to recover plaintext service account passwords."},
    {"id": "T1046",     "name": "Network Service Discovery",                      "tactic": "Discovery",            "severity": "MEDIUM",   "count": 15, "last_observed": "06:12 AM", "description": "Adversaries may attempt to get a listing of services running on remote hosts to identify target targets."},
    {"id": "T1021.002", "name": "Remote Services: SMB/Windows Admin Shares",     "tactic": "Lateral Movement",     "severity": "HIGH",     "count": 8,  "last_observed": "10:10 AM", "description": "Adversaries may use SMB administrative shares to move laterally between hosts."},
    {"id": "T1005",     "name": "Data from Local System",                         "tactic": "Collection",           "severity": "MEDIUM",   "count": 11, "last_observed": "10:11 AM", "description": "Adversaries may search local system sources to locate sensitive files."},
    {"id": "T1071.001", "name": "Application Layer Protocol: Web Protocols",     "tactic": "Command & Control",    "severity": "CRITICAL", "count": 45, "last_observed": "10:05 AM", "description": "Adversaries may communicate using application layer web protocols (HTTP/HTTPS) to blend in with normal network traffic."},
    {"id": "T1071.004", "name": "Application Layer Protocol: DNS",               "tactic": "Command & Control",    "severity": "HIGH",     "count": 11, "last_observed": "09:15 AM", "description": "Adversaries may communicate using DNS queries and responses to convey C2 instructions and exfiltrate data."},
    {"id": "T1041",     "name": "Exfiltration Over C2 Channel",                  "tactic": "Exfiltration",         "severity": "HIGH",     "count": 7,  "last_observed": "09:25 AM", "description": "Adversaries may steal data by transferring it over an existing command and control channel."},
    {"id": "T1090",     "name": "Proxy",                                          "tactic": "Command & Control",    "severity": "MEDIUM",   "count": 3,  "last_observed": "08:22 AM", "description": "Adversaries may use a connection proxy to direct network traffic between systems."},
    {"id": "T1621",     "name": "Multi-Factor Authentication Request Generation", "tactic": "Credential Access",    "severity": "HIGH",     "count": 5,  "last_observed": "08:50 AM", "description": "Adversaries may abuse MFA mechanisms by repeatedly sending authentication requests until accepted."},
    {"id": "T1490",     "name": "Inhibit System Recovery",                        "tactic": "Impact",               "severity": "CRITICAL", "count": 8,  "last_observed": "09:40 AM", "description": "Adversaries may delete or remove built-in operating system data and turn off services designed to aid recovery."},
    {"id": "T1486",     "name": "Data Encrypted for Impact",                      "tactic": "Impact",               "severity": "CRITICAL", "count": 12, "last_observed": "09:42 AM", "description": "Adversaries may encrypt data on target systems or large numbers of systems in a network to interrupt availability."},
    {"id": "T1595",     "name": "Active Scanning",                                "tactic": "Reconnaissance",       "severity": "LOW",      "count": 4,  "last_observed": "07:10 AM", "description": "Adversaries may execute active reconnaissance scans to gather information that can be used during targeting."},
    {"id": "T1110",     "name": "Brute Force",                                    "tactic": "Credential Access",    "severity": "MEDIUM",   "count": 3,  "last_observed": "04:10 AM", "description": "Adversaries may use brute force techniques to gain access to accounts."},
]


# ── Raw feed records matching mockData.ts alerts ──────────────────────────────

DEMO_FEEDS = [
    # INC-042 cluster — Coordinated Credential Compromise
    {"source": "SIEM",           "payload": {"event": "Suspicious Domain Controller Login",           "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "DC-GLOBAL-01",   "severity": "HIGH",     "user": "admin_svc",           "EventID": 4624}},
    {"source": "EDR",            "payload": {"event": "PowerShell Encoded Command Execution",          "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "WS-FINANCE-04",  "severity": "HIGH",     "process": "powershell.exe",    "CommandLine": "powershell.exe -e aW52b2tlLW1pbWlrYXR6"}},
    {"source": "Network Sensor", "payload": {"event": "C2 Communication Outbound Beaconing",           "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "WS-FINANCE-04",  "severity": "CRITICAL", "Protocol": "HTTPS",            "DstPort": 8443}},
    {"source": "Threat Intel",   "payload": {"event": "Blacklisted IP Match (APT29 / Cozy Bear)",      "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "WS-FINANCE-04",  "severity": "HIGH",     "Feed": "IBM_XForce",           "ThreatActor": "APT29", "confidence": 98}},
    {"source": "EDR",            "payload": {"event": "LSASS Memory Dump Attempt",                     "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "WS-FINANCE-04",  "severity": "CRITICAL", "TargetProcess": "lsass.exe",   "SourceProcess": "rundll32.exe"}},
    {"source": "EDR",            "payload": {"event": "Persistence via Scheduled Task Creation",       "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "WS-FINANCE-04",  "severity": "HIGH",     "TaskName": "WindowsUpdateHealthCheck"}},
    {"source": "SIEM",           "payload": {"event": "Kerberoasting Service Ticket Request Batch",    "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "DC-GLOBAL-01",   "severity": "HIGH",     "TicketEncryptionType": "0x17", "SPN": "MSSQLSvc/db-cluster.corp"}},
    {"source": "Threat Intel",   "payload": {"event": "Cobalt Strike Malleable C2 Beacon Profile",    "src_ip": "185.20.10.5",  "dest_ip": "10.0.0.15", "host": "WS-FINANCE-04",  "severity": "CRITICAL", "BeaconWatermark": 305419896,   "URI": "/jquery-3.3.1.min.js"}},

    # INC-038 cluster — Ransomware
    {"source": "EDR",            "payload": {"event": "Ransomware Canary File Modification",            "src_ip": "194.26.29.112","dest_ip": "10.0.2.88", "host": "SRV-FILE-02",    "severity": "CRITICAL", "Process": "vssadmin.exe",      "Arguments": "delete shadows /all /quiet"}},
    {"source": "SIEM",           "payload": {"event": "Mass File Renaming & Encryption Activity",       "src_ip": "194.26.29.112","dest_ip": "10.0.2.88", "host": "SRV-FILE-02",    "severity": "CRITICAL", "FileOpsPerSec": 450,            "Extension": ".locked_enc"}},

    # INC-031 cluster — DNS Tunneling
    {"source": "Network Sensor", "payload": {"event": "DNS Tunneling / Data Exfiltration Detection",   "src_ip": "45.33.32.156", "dest_ip": "10.0.1.45", "host": "DEV-NODE-09",    "severity": "HIGH",     "QueryType": "TXT",             "Domain": "*.exfil.darkdata-c2.top"}},

    # INC-025 cluster — MFA Fatigue
    {"source": "SIEM",           "payload": {"event": "Multi-Factor Authentication Fatigue Attack",     "src_ip": "103.152.18.4", "dest_ip": "10.0.0.5",  "host": "VPN-GATEWAY-01", "severity": "HIGH",     "PushRequestsSent": 47,         "Account": "ceo_office"}},

    # INC-019 single — TOR
    {"source": "Threat Intel",   "payload": {"event": "TOR Exit Node Connection Attempt",               "src_ip": "185.220.101.5","dest_ip": "10.0.0.1",  "host": "EDGE-ROUTER-01", "severity": "MEDIUM",   "TorNode": True}},

    # INC-014 — SQL injection (resolved)
    {"source": "SIEM",           "payload": {"event": "SQL Injection Attack Sequence",                  "src_ip": "92.118.160.17","dest_ip": "10.0.4.12", "host": "WEB-PORTAL-01",  "severity": "MEDIUM",   "URI": "/api/users?id=1 OR 1=1", "HTTPStatus": 200}},

    # False positives
    {"source": "EDR",            "payload": {"event": "Routine Vulnerability Scanner Execution",         "src_ip": "10.0.10.50",  "dest_ip": "10.0.10.100","host": "SEC-SCANNER-01", "severity": "INFORMATIONAL","Tool": "QualysScanner"}},
    {"source": "SIEM",           "payload": {"event": "Scheduled Backup Batch Process Execution",        "src_ip": "10.0.0.20",   "dest_ip": "10.0.5.10", "host": "BACKUP-SRV-01",  "severity": "LOW",      "Process": "robocopy.exe",       "Volume": "250GB"}},

    # INC-009 — Internal SMB sweep
    {"source": "Network Sensor", "payload": {"event": "Unusual Port Sweep (TCP/445 SMB)",                "src_ip": "10.0.3.15",   "dest_ip": "10.0.3.0/24","host": "IT-ADMIN-WS",   "severity": "MEDIUM",   "PortsScanned": [135, 139, 445],"HostCount": 112}},
]


def seed_database(db: Session) -> None:
    """Insert MITRE catalogue and demo alerts only when the DB is empty."""
    if db.query(AlertModel).count() > 0:
        return  # already seeded

    # 1 — MITRE technique catalogue (idempotent, so a partially-created DB can recover)
    for t in MITRE_TECHNIQUES:
        row = db.query(MitreTechniqueModel).filter(MitreTechniqueModel.id == t["id"]).first()
        if row is None:
            row = MitreTechniqueModel(id=t["id"])
            db.add(row)
        row.name = t["name"]
        row.tactic = t["tactic"]
        row.severity = t["severity"]
        row.count = t["count"]
        row.last_observed = t["last_observed"]
        row.description = t["description"]
    db.commit()

    # 2 — Demo alerts → normalise + correlate + persist
    ingest_feeds(DEMO_FEEDS, db)

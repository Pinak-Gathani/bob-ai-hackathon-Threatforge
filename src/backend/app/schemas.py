"""
Pydantic request/response schemas — mirror the TypeScript types in src/frontend/src/types/index.ts
so the frontend can use responses without transformation.
"""
from __future__ import annotations
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime


# ── Enums (kept as plain strings to stay JSON-friendly) ──────────────────────
# Severity: CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL
# AlertStatus: CORRELATED | ANALYZED | UNPROCESSED | FALSE_POSITIVE
# IncidentStatus: NEW | INVESTIGATING | MONITORING | RESOLVED
# Classification: GENUINE_THREAT | LIKELY_FALSE_POSITIVE | INVESTIGATING
# AlertSource: SIEM | EDR | Network Sensor | Threat Intel


# ── Inbound ──────────────────────────────────────────────────────────────────

class RawFeedIn(BaseModel):
    source: str
    payload: Dict[str, Any]


class IngestRequest(BaseModel):
    feeds: List[RawFeedIn]


# ── Alert ────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: str
    timestamp: str
    source: str
    event: str
    srcIp: str
    destIp: str
    host: str
    severity: str
    correlationId: Optional[str] = None
    status: str
    rawEvent: str
    normalizedEvent: str
    mitreTechniques: List[str]
    mlModel: Optional[str] = None
    mlThreatProbability: Optional[int] = None
    mlClassification: Optional[str] = None
    mlPriority: Optional[str] = None

    class Config:
        from_attributes = True


# ── Timeline step ─────────────────────────────────────────────────────────────

class TimelineStep(BaseModel):
    time: str
    title: str
    description: str
    source: str
    severity: str
    techniqueId: Optional[str] = None


# ── Incident ──────────────────────────────────────────────────────────────────

class IncidentOut(BaseModel):
    id: str
    title: str
    priority: str
    confidence: int
    relatedAlertsCount: int
    mitreTechniques: List[str]
    status: str
    classification: str
    firstSeen: str
    lastSeen: str
    affectedAssets: List[str]
    whyCorrelated: str
    timeline: List[TimelineStep]
    threatScore: Optional[int] = None
    sourceCount: Optional[int] = None
    mlModel: Optional[str] = None
    mlThreatProbability: Optional[int] = None
    correlationEvidence: List[str] = []
    evidenceEdges: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True


# ── MITRE ─────────────────────────────────────────────────────────────────────

class MitreTechniqueOut(BaseModel):
    id: str
    name: str
    tactic: str
    count: int
    severity: str
    lastObserved: str
    description: str

    class Config:
        from_attributes = True


class MitreCoverageOut(BaseModel):
    techniques: List[MitreTechniqueOut]
    totalTechniques: int
    tacticsCount: int
    criticalCount: int


# ── Dashboard / Priorities ────────────────────────────────────────────────────

class DashboardStatsOut(BaseModel):
    totalAlerts: int
    totalAlertsTrend: str
    correlatedIncidents: int
    correlatedIncidentsToday: int
    criticalThreats: int
    highPriority: int
    falsePositives: int
    falsePositivesPercentage: float


class PriorityQueueOut(BaseModel):
    incidents: List[IncidentOut]
    stats: DashboardStatsOut


# ── Ingest response ───────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    ingested: int
    newIncidents: int
    updatedIncidents: int
    alerts: List[AlertOut]
    incidents: List[IncidentOut]


# ── Health ────────────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str
    version: str
    environment: str
    alertCount: int
    incidentCount: int
    mcpConfigured: bool = False

class InvestigationOut(BaseModel):
    incidentId: str
    generatedBy: str
    created: str
    bluf: str
    threatAssessment: str
    attackTimeline: List[Dict[str, Any]]
    mitreTechniques: List[str]
    indicators: List[str]
    evidence: List[str]
    recommendedActions: List[str]
    priority: str
    confidence: int
    classification: str
    whyCorrelated: str


class IndicatorOut(BaseModel):
    value: str
    type: str
    reputation: str
    confidence: int
    firstSeen: str
    lastSeen: str
    associatedIncidents: List[str]
    relatedMitre: List[str]




class NotificationSettingsOut(BaseModel):
    enabled: bool
    minPriority: str
    emailEnabled: bool
    emailRecipient: str
    emailRecipientMasked: str
    smsEnabled: bool
    smsRecipient: str
    smsRecipientMasked: str
    updatedAt: str
    demoMode: bool
    emailProviderConfigured: bool
    smsProviderConfigured: bool

class NotificationSettingsIn(BaseModel):
    enabled: Optional[bool] = None
    minPriority: Optional[str] = None
    emailEnabled: Optional[bool] = None
    emailRecipient: Optional[str] = None
    smsEnabled: Optional[bool] = None
    smsRecipient: Optional[str] = None

class NotificationOut(BaseModel):
    id: str
    incidentId: str
    priority: str
    channel: str
    status: str
    recipient: str
    subject: str
    provider: str
    details: str
    createdAt: str

class NotificationHistoryOut(BaseModel):
    notifications: List[NotificationOut]
    total: int


class ReportOut(InvestigationOut):
    id: str
    incidentTitle: str


class IndicatorListOut(BaseModel):
    indicators: List[IndicatorOut]
    total: int

class ResetOut(BaseModel):
    status: str
    alertCount: int
    incidentCount: int
    mcpConfigured: bool = False

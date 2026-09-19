export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export type IncidentStatus = 'NEW' | 'INVESTIGATING' | 'MONITORING' | 'RESOLVED';

export type AlertStatus = 'CORRELATED' | 'ANALYZED' | 'UNPROCESSED' | 'FALSE_POSITIVE';

export type Classification = 'GENUINE_THREAT' | 'LIKELY_FALSE_POSITIVE' | 'INVESTIGATING';

export type AlertSource = 'SIEM' | 'EDR' | 'Network Sensor' | 'Threat Intel';

export interface Alert {
  id: string;
  timestamp: string;
  source: AlertSource;
  event: string;
  srcIp: string;
  destIp: string;
  host: string;
  severity: Severity;
  correlationId?: string;
  status: AlertStatus;
  rawEvent: string;
  normalizedEvent: string;
  mitreTechniques: string[];
  threatScore?: number;
  falsePositiveReason?: string;
  mlModel?: string;
  mlThreatProbability?: number;
  mlClassification?: Classification;
  mlPriority?: Severity;
}

export interface TimelineStep {
  time: string;
  title: string;
  description: string;
  source: AlertSource;
  severity: Severity;
  techniqueId?: string;
}

export interface Incident {
  id: string;
  title: string;
  priority: Severity;
  confidence: number; // e.g. 94 for 94%
  relatedAlertsCount: number;
  mitreTechniques: string[];
  status: IncidentStatus;
  classification: Classification;
  firstSeen: string;
  lastSeen: string;
  affectedAssets: string[];
  whyCorrelated: string;
  timeline: TimelineStep[];
  threatScore?: number;
  sourceCount?: number;
  mlModel?: string;
  mlThreatProbability?: number;
  correlationEvidence?: string[];
  evidenceEdges?: { from: string; to: string; reasons: string[]; score: number }[];
}

export interface Indicator {
  value: string;
  type: 'IPv4' | 'Domain' | 'SHA256' | 'URL';
  reputation: 'MALICIOUS' | 'SUSPICIOUS' | 'BENIGN';
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  associatedIncidents: string[];
  relatedMitre: string[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  count: number;
  severity: Severity;
  lastObserved: string;
  description: string;
}

export interface Report {
  id: string;
  incidentId: string;
  incidentTitle: string;
  priority: Severity;
  confidence: number;
  generatedBy: string;
  created: string;
  bluf: string;
  threatAssessment: string;
  attackTimeline: TimelineStep[];
  mitreTechniques: string[];
  indicators: string[];
  evidence: string[];
  recommendedActions: string[];
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  blufSummary?: {
    narrative: string;
    priority: Severity;
    classification: Classification;
    confidence: number;
    mitre: string[];
    actions: string[];
  };
}

export interface DashboardStats {
  totalAlerts: number;
  totalAlertsTrend: string;
  correlatedIncidents: number;
  correlatedIncidentsToday: number;
  criticalThreats: number;
  highPriority: number;
  falsePositives: number;
  falsePositivesPercentage: number;
}

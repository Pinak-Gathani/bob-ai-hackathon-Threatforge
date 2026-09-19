/**
 * Central API service for ThreatForge frontend.
 *
 * All backend calls go through this file. The base URL is read from the
 * VITE_API_URL environment variable (default: http://localhost:8000).
 *
 * Shape of every response matches the Pydantic schemas in
 * src/backend/app/schemas.py which in turn mirror the TypeScript types
 * in src/frontend/src/types/index.ts — no mapping needed in components.
 */
import type {
  Alert,
  Incident,
  MitreTechnique,
  DashboardStats,
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
const API = `${BASE_URL}/api/v1`;

// ── generic fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── health ────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
  alertCount: number;
  incidentCount: number;
  mcpConfigured: boolean;
}

export function fetchHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>('/health');
}

// ── alerts ────────────────────────────────────────────────────────────────────

export interface AlertsFilter {
  source?: string;
  severity?: string;
  status?: string;
}

export function fetchAlerts(filter: AlertsFilter = {}): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (filter.source)   params.set('source',   filter.source);
  if (filter.severity) params.set('severity', filter.severity);
  if (filter.status)   params.set('status',   filter.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Alert[]>(`/alerts${qs}`);
}

export function fetchAlert(id: string): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${id}`);
}

export interface RawFeed {
  source: string;
  payload: Record<string, unknown>;
}

export interface IngestResponse {
  ingested: number;
  newIncidents: number;
  updatedIncidents: number;
  alerts: Alert[];
  incidents: Incident[];
}

export function ingestAlerts(feeds: RawFeed[]): Promise<IngestResponse> {
  return apiFetch<IngestResponse>('/alerts/ingest', {
    method: 'POST',
    body: JSON.stringify({ feeds }),
  });
}

// ── incidents ─────────────────────────────────────────────────────────────────

export interface IncidentsFilter {
  priority?: string;
  status?: string;
}

export function fetchIncidents(filter: IncidentsFilter = {}): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filter.priority) params.set('priority', filter.priority);
  if (filter.status)   params.set('status',   filter.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Incident[]>(`/incidents${qs}`);
}

export function fetchIncident(id: string): Promise<Incident> {
  return apiFetch<Incident>(`/incidents/${id}`);
}

// ── priorities / dashboard stats ──────────────────────────────────────────────

export interface PriorityQueueResponse {
  incidents: Incident[];
  stats: DashboardStats;
}

export function fetchPriorityQueue(): Promise<PriorityQueueResponse> {
  return apiFetch<PriorityQueueResponse>('/priorities');
}

// ── MITRE coverage ────────────────────────────────────────────────────────────

export interface MitreCoverageResponse {
  techniques: MitreTechnique[];
  totalTechniques: number;
  tacticsCount: number;
  criticalCount: number;
}

export function fetchMitreCoverage(): Promise<MitreCoverageResponse> {
  return apiFetch<MitreCoverageResponse>('/mitre/coverage');
}

// ── demo simulate-attack ──────────────────────────────────────────────────────

export function simulateAttackApi(): Promise<IngestResponse> {
  return apiFetch<IngestResponse>('/demo/simulate-attack', { method: 'POST' });
}

export function liveFeedTickApi(): Promise<IngestResponse> {
  return apiFetch<IngestResponse>('/demo/live-tick', { method: 'POST' });
}

export function feedBotTickApi(): Promise<IngestResponse> {
  return apiFetch<IngestResponse>('/demo/feed-bot/tick', { method: 'POST' });
}

export interface FeedBotStatus {
  enabled: boolean;
  intervalSeconds: number;
  sources: Array<{ source: string; file: string; events: number }>;
  nextSequence: number;
}

export function fetchFeedBotStatus(): Promise<FeedBotStatus> {
  return apiFetch<FeedBotStatus>('/demo/feed-bot/status');
}

export function resetFeedBotApi(): Promise<FeedBotStatus> {
  return apiFetch<FeedBotStatus>('/demo/feed-bot/reset', { method: 'POST' });
}

export interface LiveFeedStatus {
  enabled: boolean;
  mode: string;
  sources: string[];
  alertCount: number;
  incidentCount: number;
}

export function fetchLiveFeedStatus(): Promise<LiveFeedStatus> {
  return apiFetch<LiveFeedStatus>('/demo/live-status');
}

export interface InvestigationResult {
  incidentId: string;
  generatedBy: string;
  created: string;
  bluf: string;
  threatAssessment: string;
  attackTimeline: Array<{ time: string; title: string; description: string; source: string; severity: string; techniqueId?: string }>;
  mitreTechniques: string[];
  indicators: string[];
  evidence: string[];
  recommendedActions: string[];
  priority: string;
  confidence: number;
  classification: string;
  whyCorrelated: string;
}

export function fetchInvestigation(id: string): Promise<InvestigationResult> {
  return apiFetch<InvestigationResult>(`/investigations/${id}`);
}

export function refreshInvestigation(id: string): Promise<InvestigationResult> {
  return apiFetch<InvestigationResult>(`/investigations/${id}/refresh`, { method: 'POST' });
}

export interface ReportResult extends InvestigationResult {
  id: string;
  incidentTitle: string;
}

export function fetchReports(): Promise<ReportResult[]> {
  return apiFetch<ReportResult[]>('/reports');
}

export function fetchReport(id: string): Promise<ReportResult> {
  return apiFetch<ReportResult>(`/reports/${id}`);
}

export interface IndicatorResult {
  value: string;
  type: string;
  reputation: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  associatedIncidents: string[];
  relatedMitre: string[];
}

export function searchThreatIndicator(query: string): Promise<IndicatorResult> {
  return apiFetch<IndicatorResult>(`/threat-intelligence/search?q=${encodeURIComponent(query)}`);
}


export interface IndicatorListResponse { indicators: IndicatorResult[]; total: number; }
export function fetchIndicators(): Promise<IndicatorListResponse> { return apiFetch<IndicatorListResponse>('/threat-intelligence/indicators'); }
export function resetDemoApi(): Promise<{status:string; alertCount:number; incidentCount:number}> { return apiFetch('/demo/reset', {method:'POST'}); }


// ── incident notifications ───────────────────────────────────────────────────
export interface NotificationSettings {
  enabled: boolean;
  minPriority: string;
  emailEnabled: boolean;
  emailRecipient: string;
  emailRecipientMasked: string;
  smsEnabled: boolean;
  smsRecipient: string;
  smsRecipientMasked: string;
  updatedAt: string;
  demoMode: boolean;
  emailProviderConfigured: boolean;
  smsProviderConfigured: boolean;
}

export interface NotificationRecord {
  id: string;
  incidentId: string;
  priority: string;
  channel: string;
  status: string;
  recipient: string;
  subject: string;
  provider: string;
  details: string;
  createdAt: string;
}

export function fetchNotificationSettings(): Promise<NotificationSettings> {
  return apiFetch<NotificationSettings>('/notifications/settings');
}

export function saveNotificationSettings(payload: Partial<NotificationSettings>): Promise<NotificationSettings> {
  return apiFetch<NotificationSettings>('/notifications/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchNotificationHistory(): Promise<{ notifications: NotificationRecord[]; total: number }> {
  return apiFetch('/notifications/history');
}

export function sendTestNotification(): Promise<{ notifications: NotificationRecord[]; total: number }> {
  return apiFetch('/notifications/test', { method: 'POST' });
}

export function notifyIncident(id: string): Promise<{ notifications: NotificationRecord[]; total: number }> {
  return apiFetch(`/incidents/${id}/notify`, { method: 'POST' });
}

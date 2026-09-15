import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { mockAlerts, mockIncidents, mockIndicators, mockMitreTechniques, mockReports } from '../data/mockData';
import type { Alert, Incident, Indicator, MitreTechnique, Report } from '../types';
import { calculateDashboard, correlateAlerts, demoAttackFeed, normalizeFeed, type RawFeed } from '../services/threatEngine';

type ThreatState = {
  alerts: Alert[];
  incidents: Incident[];
  indicators: Indicator[];
  mitreTechniques: MitreTechnique[];
  reports: Report[];
  lastIngestedAt: string | null;
  ingest: (feeds: RawFeed[]) => void;
  simulateAttack: () => void;
  resetDemo: () => void;
};

const KEY = 'threatlens-live-state-v1';
const ThreatContext = createContext<ThreatState | null>(null);

function initialState() {
  const correlated = correlateAlerts(mockAlerts, mockIncidents);
  return { alerts: correlated.alerts, incidents: correlated.incidents, indicators: mockIndicators, mitreTechniques: mockMitreTechniques, reports: mockReports, lastIngestedAt: null as string | null };
}

export const ThreatProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState(() => {
    try { const saved = localStorage.getItem(KEY); return saved ? JSON.parse(saved) : initialState(); } catch { return initialState(); }
  });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);

  const ingest = (feeds: RawFeed[]) => {
    setState((prev: ReturnType<typeof initialState>) => {
      const normalized = feeds.map((feed, i) => normalizeFeed(feed, `LIVE-${Date.now()}-${i + 1}`));
      const correlated = correlateAlerts([...prev.alerts, ...normalized], prev.incidents);
      const newIndicators = normalized.filter((a) => a.srcIp !== 'unknown').map((a) => ({ value: a.srcIp, type: 'IPv4' as const, reputation: a.source === 'Threat Intel' ? 'MALICIOUS' as const : 'SUSPICIOUS' as const, confidence: a.source === 'Threat Intel' ? 97 : 82, firstSeen: a.timestamp, lastSeen: a.timestamp, associatedIncidents: a.correlationId ? [a.correlationId] : [], relatedMitre: a.mitreTechniques }));
      const newReports = correlated.incidents.filter((incident) => incident.relatedAlertsCount >= 2 && !prev.reports.some((report) => report.incidentId === incident.id)).map((incident) => ({
        id: `RPT-${incident.id.replace('INC-', '')}`,
        incidentId: incident.id,
        incidentTitle: incident.title,
        priority: incident.priority,
        confidence: incident.confidence,
        generatedBy: 'Bob AI',
        created: new Date().toISOString().replace('T', ' ').slice(0, 19),
        bluf: `BLUF: ${incident.title} is assessed as ${incident.priority} priority with ${incident.confidence}% confidence. ${incident.whyCorrelated} Immediate containment and analyst validation are recommended.`,
        threatAssessment: `${incident.classification.replaceAll('_', ' ')} based on ${incident.sourceCount ?? 1} independent source feed(s), ${incident.relatedAlertsCount} correlated alerts and ${incident.mitreTechniques.length} observed MITRE technique(s).`,
        attackTimeline: incident.timeline,
        mitreTechniques: incident.mitreTechniques,
        indicators: normalized.filter((a) => a.correlationId === incident.id && a.srcIp !== 'unknown').map((a) => a.srcIp),
        evidence: incident.timeline.map((step) => `${step.source}: ${step.title}`),
        recommendedActions: ['Contain affected endpoint(s) and preserve volatile evidence.', 'Block confirmed malicious indicators at network controls.', 'Reset or disable suspected compromised credentials.', 'Hunt for the same techniques and indicators across the environment.'],
      }));
      return { ...prev, ...correlated, reports: [...newReports, ...prev.reports], indicators: [...newIndicators, ...prev.indicators], lastIngestedAt: new Date().toISOString() };
    });
  };

  const value = useMemo(() => ({
    ...state,
    ingest,
    simulateAttack: () => ingest(demoAttackFeed),
    resetDemo: () => setState(initialState()),
  }), [state]);

  return <ThreatContext.Provider value={value}>{children}</ThreatContext.Provider>;
};

export function useThreatData() {
  const value = useContext(ThreatContext);
  if (!value) throw new Error('useThreatData must be used inside ThreatProvider');
  return value;
}

export function useDashboardStats() { const { alerts, incidents } = useThreatData(); return calculateDashboard(alerts, incidents); }

import type { Alert, Incident, Severity, TimelineStep, Classification } from '../types';

export type RawFeed = {
  source: Alert['source'];
  payload: Record<string, unknown>;
};

const severityWeight: Record<Severity, number> = {
  CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25, INFORMATIONAL: 10,
};

const techniqueMap: Record<string, string[]> = {
  powershell: ['T1059.001'],
  'encoded command': ['T1059.001'],
  lsass: ['T1003.001'],
  'memory dump': ['T1003.001'],
  'scheduled task': ['T1053.005'],
  'shadow copy': ['T1490'],
  vssadmin: ['T1490'],
  ransomware: ['T1486'],
  'file encryption': ['T1486'],
  'dns tunneling': ['T1071.004'],
  'dns exfiltration': ['T1041', 'T1071.004'],
  'http c2': ['T1071.001'],
  'https beacon': ['T1071.001'],
  'mfa fatigue': ['T1621'],
  'credential': ['T1078'],
  'kerberos': ['T1078'],
};

export function mapMitre(eventText: string): string[] {
  const text = eventText.toLowerCase();
  return [...new Set(Object.entries(techniqueMap).flatMap(([keyword, techniques]) => text.includes(keyword) ? techniques : []))];
}

function str(value: unknown, fallback = 'unknown') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function normalizeFeed(feed: RawFeed, id: string): Alert {
  const p = feed.payload;
  const source = feed.source;
  const srcIp = str(p.srcIp ?? p.src_ip ?? p.sourceAddress ?? p.source_ip ?? p.indicator);
  const destIp = str(p.destIp ?? p.dest_ip ?? p.destinationAddress ?? p.destination_ip);
  const host = str(p.host ?? p.device ?? p.hostname ?? p.targetHost);
  const event = str(p.event ?? p.event_type ?? p.alert ?? p.process ?? p.description, `${source} security event`);
  const rawEvent = JSON.stringify(p);
  const normalizedEvent = [event, host !== 'unknown' ? `Host ${host}.` : '', srcIp !== 'unknown' ? `Source ${srcIp}.` : '', destIp !== 'unknown' ? `Destination ${destIp}.` : ''].filter(Boolean).join(' ');
  const techniques = mapMitre(`${event} ${JSON.stringify(p)}`);
  let severity: Severity = 'MEDIUM';
  const explicit = str(p.severity, '').toUpperCase() as Severity;
  if (['CRITICAL','HIGH','MEDIUM','LOW','INFORMATIONAL'].includes(explicit)) severity = explicit;
  else if (techniques.includes('T1490') || techniques.includes('T1486') || techniques.includes('T1003.001')) severity = 'CRITICAL';
  else if (techniques.length || source === 'Threat Intel') severity = 'HIGH';

  return {
    id,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    source,
    event,
    srcIp,
    destIp,
    host,
    severity,
    status: 'UNPROCESSED',
    rawEvent,
    normalizedEvent,
    mitreTechniques: techniques,
  };
}

function entityOverlap(a: Alert, b: Alert) {
  return [a.srcIp, a.destIp, a.host].some((v) => v !== 'unknown' && [b.srcIp, b.destIp, b.host].includes(v));
}

function techniqueOverlap(a: Alert, b: Alert) {
  return a.mitreTechniques.some((t) => b.mitreTechniques.includes(t));
}

function withinWindow(a: Alert, b: Alert, minutes = 15) {
  const delta = Math.abs(new Date(a.timestamp.replace(' ', 'T') + 'Z').getTime() - new Date(b.timestamp.replace(' ', 'T') + 'Z').getTime());
  return Number.isFinite(delta) && delta <= minutes * 60_000;
}

export function correlateAlerts(alerts: Alert[], existingIncidents: Incident[] = []): { alerts: Alert[]; incidents: Incident[] } {
  const result = alerts.map((a) => ({ ...a }));
  const groups: Alert[][] = [];
  const visited = new Set<string>();

  for (const alert of result) {
    if (visited.has(alert.id)) continue;
    const group = result.filter((candidate) => candidate.id === alert.id || (
      (entityOverlap(alert, candidate) && withinWindow(alert, candidate)) || techniqueOverlap(alert, candidate) && withinWindow(alert, candidate)
    ));
    if (group.length >= 2) {
      group.forEach((a) => visited.add(a.id));
      groups.push(group);
    }
  }

  const incidents = [...existingIncidents];
  for (const group of groups) {
    const existingId = group.find((a) => a.correlationId)?.correlationId;
    const id = existingId || `INC-${String(100 + incidents.length + 1).padStart(3, '0')}`;
    const maxSeverity = group.reduce<Severity>((max, a) => severityWeight[a.severity] > severityWeight[max] ? a.severity : max, 'INFORMATIONAL');
    const sourceCount = new Set(group.map((a) => a.source)).size;
    const techniqueCount = new Set(group.flatMap((a) => a.mitreTechniques)).size;
    const crossSourceBonus = Math.min(20, sourceCount * 5);
    const evidenceScore = Math.min(25, group.length * 5);
    const score = Math.min(99, Math.round(severityWeight[maxSeverity] * 0.55 + crossSourceBonus + evidenceScore + Math.min(10, techniqueCount * 2)));
    const confidence = Math.min(99, 60 + sourceCount * 7 + Math.min(15, group.length * 2));
    const classification: Classification = score >= 65 && sourceCount >= 2 ? 'GENUINE_THREAT' : score < 40 ? 'LIKELY_FALSE_POSITIVE' : 'INVESTIGATING';
    const sorted = [...group].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const techniques = [...new Set(group.flatMap((a) => a.mitreTechniques))];
    const timeline: TimelineStep[] = sorted.map((a) => ({ time: a.timestamp, title: a.event, description: a.normalizedEvent, source: a.source, severity: a.severity, techniqueId: a.mitreTechniques[0] }));
    for (const a of group) { a.correlationId = id; a.status = classification === 'LIKELY_FALSE_POSITIVE' ? 'FALSE_POSITIVE' : 'CORRELATED'; }
    const generated: Incident = {
      id,
      title: `${classification === 'GENUINE_THREAT' ? 'Correlated Threat' : 'Suspicious Activity'} — ${sorted[0].host}`,
      priority: maxSeverity === 'CRITICAL' || score >= 85 ? 'CRITICAL' : maxSeverity === 'HIGH' || score >= 65 ? 'HIGH' : maxSeverity,
      confidence,
      relatedAlertsCount: group.length,
      mitreTechniques: techniques,
      status: classification === 'GENUINE_THREAT' ? 'NEW' : 'INVESTIGATING',
      classification,
      firstSeen: sorted[0].timestamp,
      lastSeen: sorted[sorted.length - 1].timestamp,
      affectedAssets: [...new Set(group.map((a) => a.host).filter((h) => h !== 'unknown'))],
      whyCorrelated: `${sourceCount} independent feeds corroborated ${group.length} alerts through shared entities, a ${15}-minute time window, and ${techniqueCount} overlapping MITRE technique${techniqueCount === 1 ? '' : 's'}. Automated threat score: ${score}/100.`,
      timeline,
      threatScore: score,
      sourceCount,
    };
    const idx = incidents.findIndex((i) => i.id === id);
    if (idx >= 0) incidents[idx] = { ...incidents[idx], ...generated };
    else incidents.unshift(generated);
  }
  return { alerts: result, incidents };
}

export function calculateDashboard(alerts: Alert[], incidents: Incident[]) {
  const falsePositives = alerts.filter((a) => a.status === 'FALSE_POSITIVE').length;
  return {
    totalAlerts: alerts.length,
    totalAlertsTrend: '+ live',
    correlatedIncidents: incidents.length,
    correlatedIncidentsToday: incidents.filter((i) => i.lastSeen.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    criticalThreats: incidents.filter((i) => i.priority === 'CRITICAL').length,
    highPriority: incidents.filter((i) => i.priority === 'HIGH').length,
    falsePositives,
    falsePositivesPercentage: alerts.length ? Number((falsePositives / alerts.length * 100).toFixed(1)) : 0,
  };
}

export const demoAttackFeed: RawFeed[] = [
  { source: 'SIEM', payload: { event: 'Privileged account login anomaly', src_ip: '203.0.113.77', dest_ip: '10.0.2.44', host: 'WS-OPS-17', severity: 'HIGH', user: 'ops_admin' } },
  { source: 'EDR', payload: { event: 'PowerShell encoded command execution', src_ip: '203.0.113.77', dest_ip: '10.0.2.44', host: 'WS-OPS-17', severity: 'HIGH', process: 'powershell.exe -enc AAECAwQ=' } },
  { source: 'Network Sensor', payload: { event: 'HTTPS beacon to suspicious C2', src_ip: '203.0.113.77', dest_ip: '10.0.2.44', host: 'WS-OPS-17', severity: 'CRITICAL', destination: '203.0.113.77:443' } },
  { source: 'Threat Intel', payload: { event: 'Known malicious C2 indicator match', src_ip: '203.0.113.77', dest_ip: '10.0.2.44', host: 'WS-OPS-17', severity: 'HIGH', indicator: '203.0.113.77', confidence: 97 } },
];

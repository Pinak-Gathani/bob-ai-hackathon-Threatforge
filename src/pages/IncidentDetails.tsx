import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useThreatData } from '../store/ThreatStore';
import type { MitreTechnique } from '../types';
import {
  ArrowLeft,
  Bot,
  Clock,
  Layers,
  Server,
  Grid,
  ChevronRight,
  Info,
} from 'lucide-react';

export const IncidentDetails: React.FC = () => {
  const { incidents: mockIncidents, alerts: mockAlerts, mitreTechniques: mockMitreTechniques } = useThreatData();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const incident = mockIncidents.find((i) => i.id === id) || mockIncidents[0];
  const relatedAlerts = mockAlerts.filter((a) => a.correlationId === incident.id);

  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechnique | null>(null);

  return (
    <Layout>
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('/incidents')}
        className="text-xs font-semibold text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Incidents</span>
      </button>

      {/* Incident Hero Header Card */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-900/50 rounded-2xl p-6 shadow-2xl relative soc-glow-red">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono font-bold text-red-400 text-sm tracking-wider uppercase">
                INCIDENT #{incident.id}
              </span>
              <Badge value={incident.priority} size="md" />
              <span className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300 font-mono text-xs font-bold border border-cyan-800/80">
                {incident.confidence}% AI Confidence
              </span>
              <Badge value={incident.classification} size="md" />
            </div>

            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {incident.whyCorrelated}
            </p>
          </div>

          {/* Prominent IBM Bob Investigation CTA */}
          <button
            onClick={() => navigate(`/bob-investigation/${incident.id}`)}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center space-x-2.5 shrink-0 transition-all cursor-pointer transform hover:scale-105"
          >
            <Bot className="w-5 h-5 text-slate-950" />
            <span>Investigate with IBM Bob</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>

        {/* Summary Bar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 mt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-mono block text-[10px]">First Seen</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {incident.firstSeen}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-mono block text-[10px]">Last Seen</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {incident.lastSeen}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-mono block text-[10px]">Correlated Alerts</span>
            <span className="font-mono font-bold text-purple-400 mt-0.5 block flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {incident.relatedAlertsCount} Alerts
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-mono block text-[10px]">Affected Assets</span>
            <span className="font-mono font-semibold text-cyan-400 mt-0.5 block flex items-center gap-1">
              <Server className="w-3 h-3" />
              {incident.affectedAssets.length} Host Systems
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-mono block text-[10px]">MITRE Techniques</span>
            <span className="font-mono font-semibold text-emerald-400 mt-0.5 block flex items-center gap-1">
              <Grid className="w-3 h-3" />
              {incident.mitreTechniques.length} Mapped
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / MAIN (2 Cols): Attack Timeline */}
        <Card title="Correlated Attack Timeline" subtitle="Chronological sequence of security telemetry" className="lg:col-span-2">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {incident.timeline.map((step, idx) => (
              <div key={idx} className="relative group">
                {/* Timeline Bullet */}
                <div className="absolute -left-[23px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-400 group-hover:scale-125 group-hover:bg-cyan-400 transition-all shadow-sm shadow-cyan-400" />

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-cyan-400 text-xs">{step.time}</span>
                      <span className="text-xs font-semibold text-slate-100">{step.title}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-slate-400 border border-slate-800">
                        {step.source}
                      </span>
                      <Badge value={step.severity} size="sm" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mt-2">{step.description}</p>

                  {step.techniqueId && (
                    <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">
                        Mapped Technique: <strong className="text-cyan-300">{step.techniqueId}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* RIGHT (1 Col): Threat Assessment & Metadata */}
        <div className="space-y-6">
          {/* Threat Assessment Card */}
          <Card title="Threat Assessment" subtitle="AI Prioritisation & Classification Analysis">
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-mono text-[11px] block uppercase">Classification</span>
                <div className="mt-1">
                  <Badge value={incident.classification} size="md" />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-mono text-[11px] block uppercase">AI Correlation Confidence</span>
                <div className="mt-1.5 flex items-center space-x-3">
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full"
                      style={{ width: `${incident.confidence}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{incident.confidence}%</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-mono text-[11px] block uppercase mb-1">
                  Correlation Rationale
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {incident.whyCorrelated}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-mono text-[11px] block uppercase mb-1">
                  Affected Target Assets
                </span>
                <div className="space-y-1 mt-1">
                  {incident.affectedAssets.map((asset) => (
                    <div key={asset} className="font-mono font-semibold text-slate-200 flex items-center space-x-1.5">
                      <Server className="w-3 h-3 text-cyan-400" />
                      <span>{asset}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MITRE ATT&CK Section */}
      <Card title="Mapped MITRE ATT&CK Techniques" subtitle="Click any technique card to inspect tactic details and mitigation options">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {incident.mitreTechniques.map((techId) => {
            const techData = mockMitreTechniques.find((t) => t.id === techId) || {
              id: techId,
              name: 'Attacker Technique',
              tactic: 'Execution',
              severity: 'HIGH',
              description: 'Attacker execution technique correlated with this incident payload.',
            };

            return (
              <div
                key={techId}
                onClick={() => setSelectedTechnique(techData as MitreTechnique)}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-cyan-400 text-xs">{techId}</span>
                  <Badge value={techData.severity || 'HIGH'} size="sm" />
                </div>
                <h4 className="font-semibold text-slate-100 text-xs group-hover:text-cyan-300 transition-colors">
                  {techData.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {techData.description}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex justify-between">
                  <span>Tactic: {techData.tactic}</span>
                  <span className="text-cyan-400 group-hover:underline">Inspect Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Related Alerts Sub-Table */}
      <Card title="Correlated Telemetry Alerts" subtitle="Telemetry events bundled into this incident">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-2.5 px-3">Alert ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Event Description</th>
                <th className="py-2.5 px-3">Source IP</th>
                <th className="py-2.5 px-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {relatedAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-semibold text-cyan-400">{alert.id}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{alert.timestamp}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{alert.source}</td>
                  <td className="py-3 px-3 font-medium text-slate-200">{alert.event}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{alert.srcIp}</td>
                  <td className="py-3 px-3">
                    <Badge value={alert.severity} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MITRE Technique Detail Modal */}
      <Modal
        isOpen={!!selectedTechnique}
        onClose={() => setSelectedTechnique(null)}
        title={
          selectedTechnique ? (
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-cyan-400">{selectedTechnique.id}</span>
              <span className="text-slate-300 font-semibold">{selectedTechnique.name}</span>
            </div>
          ) : (
            'MITRE Detail'
          )
        }
      >
        {selectedTechnique && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Tactic Category</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">{selectedTechnique.tactic}</span>
            </div>

            <div>
              <h4 className="font-semibold text-slate-300 mb-1">Description</h4>
              <p className="text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                {selectedTechnique.description}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-900/60">
              <h4 className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                IBM Bob Detection & Mitigation Rationale
              </h4>
              <p className="text-slate-300 leading-relaxed">
                This technique was mapped via EDR process ancestry analysis. Immediate mitigation requires isolating the host endpoint and revoking service account tokens.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

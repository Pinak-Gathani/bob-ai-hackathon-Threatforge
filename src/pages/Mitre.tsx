import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useThreatData } from '../store/ThreatStore';
import type { MitreTechnique } from '../types';
import { Bot } from 'lucide-react';

const tacticsList = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command & Control',
  'Exfiltration',
];

export const Mitre: React.FC = () => {
  const { mitreTechniques: mockMitreTechniques, incidents } = useThreatData();
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechnique | null>(null);

  const totalObservedTechniques = mockMitreTechniques.length;
  const criticalTechniquesCount = mockMitreTechniques.filter((t) => t.severity === 'CRITICAL').length;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">MITRE ATT&CK Coverage Matrix</h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual attack-chain heatmap of observed attacker techniques across correlated incidents
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 rounded-lg bg-cyan-950 text-cyan-300 font-mono text-xs border border-cyan-800/60 font-semibold">
            {totalObservedTechniques} Mapped Techniques
          </span>
        </div>
      </div>

      {/* Top Heatmap & Tactic Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-xs text-slate-400 font-mono uppercase">Framework Tactics Covered</p>
          <p className="text-2xl font-bold text-slate-100 mt-0.5">{new Set(mockMitreTechniques.map((t) => t.tactic)).size} / 14</p>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">78.5% matrix visibility</p>
        </div>

        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 soc-glow-red">
          <p className="text-xs text-red-400 font-mono uppercase">Critical Severity Techniques</p>
          <p className="text-2xl font-bold text-red-400 mt-0.5">{criticalTechniquesCount}</p>
          <p className="text-[11px] text-red-300 mt-1 font-medium">LSASS & PowerShell Execution</p>
        </div>

        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-900/60">
          <p className="text-xs text-purple-400 font-mono uppercase">Total Incidents Mapped</p>
          <p className="text-2xl font-bold text-purple-300 mt-0.5">{incidents.filter((i) => i.mitreTechniques.length > 0).length}</p>
          <p className="text-[11px] text-purple-300 mt-1 font-medium">Cross-correlated feeds</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-xs text-slate-400 font-mono uppercase">Primary Threat Group</p>
          <p className="text-2xl font-bold text-cyan-400 mt-0.5">APT29</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Cozy Bear tactic alignment</p>
        </div>
      </div>

      {/* Visual Attack-Chain Matrix Interface (11 Tactic Columns Horizontal Scroll) */}
      <Card title="Attack-Chain Matrix Grid" subtitle="Click any technique card for mitigation strategies and linked incident telemetry">
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-[1400px]">
            {tacticsList.map((tacticName) => {
              const techniquesInTactic = mockMitreTechniques.filter(
                (t) => t.tactic.toLowerCase() === tacticName.toLowerCase()
              );

              return (
                <div
                  key={tacticName}
                  className="flex-1 min-w-[130px] bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-start"
                >
                  {/* Tactic Column Header */}
                  <div className="pb-2.5 mb-3 border-b border-slate-800/80 text-center">
                    <span className="text-[11px] font-bold text-slate-200 tracking-wide block truncate">
                      {tacticName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                      {techniquesInTactic.length} detected
                    </span>
                  </div>

                  {/* Technique Cards in Column */}
                  <div className="space-y-2">
                    {techniquesInTactic.length === 0 ? (
                      <div className="p-3 text-center text-[10px] font-mono text-slate-600 bg-slate-900/40 rounded-lg border border-slate-900">
                        No activity detected
                      </div>
                    ) : (
                      techniquesInTactic.map((tech) => (
                        <div
                          key={tech.id}
                          onClick={() => setSelectedTechnique(tech)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:scale-105 ${
                            tech.severity === 'CRITICAL'
                              ? 'bg-red-950/70 border-red-800/80 hover:border-red-500 text-red-200 soc-glow-red'
                              : tech.severity === 'HIGH'
                              ? 'bg-amber-950/60 border-amber-800/80 hover:border-orange-500 text-amber-200'
                              : 'bg-slate-900 border-slate-800 hover:border-cyan-500 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[10px] text-cyan-400">
                              {tech.id}
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-950 text-slate-300">
                              {tech.count}x
                            </span>
                          </div>

                          <h5 className="font-semibold text-[11px] mt-1 leading-snug line-clamp-2">
                            {tech.name}
                          </h5>

                          <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-400">
                            <span>{tech.lastObserved}</span>
                            <Badge value={tech.severity} size="sm" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
              <span className="text-slate-200 font-semibold">{selectedTechnique.name}</span>
            </div>
          ) : (
            'Technique Overview'
          )
        }
      >
        {selectedTechnique && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">ATT&CK Tactic</span>
                <span className="font-bold text-slate-200 text-sm">{selectedTechnique.tactic}</span>
              </div>
              <Badge value={selectedTechnique.severity} size="md" />
            </div>

            <div>
              <h4 className="font-semibold text-slate-300 mb-1">Technique Rationale & Description</h4>
              <p className="text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                {selectedTechnique.description}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60">
              <h4 className="font-semibold text-cyan-300 mb-1 flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                IBM Bob AI Mitigation Recommendations
              </h4>
              <ul className="list-disc list-inside text-slate-300 space-y-1 text-xs">
                <li>Deploy Credential Guard and block LSASS process memory handles.</li>
                <li>Restrict PowerShell execution policies via GPO to ConstrainedLanguage mode.</li>
                <li>Filter external C2 IP ranges at border firewalls and proxy gateways.</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

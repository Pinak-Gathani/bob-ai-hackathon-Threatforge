import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { useThreatData } from '../store/ThreatStore';
import type { Indicator } from '../types';
import {
  Search,
  Globe,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';

export const ThreatIntelligence: React.FC = () => {
  const { indicators: mockIndicators } = useThreatData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator>(mockIndicators[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      const match = mockIndicators.find((ind) =>
        ind.value.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (match) {
        setSelectedIndicator(match);
      } else {
        // Create dynamic analyzed indicator mock
        setSelectedIndicator({
          value: searchQuery,
          type: searchQuery.includes('.') ? 'IPv4' : 'SHA256',
          reputation: 'MALICIOUS',
          confidence: 91,
          firstSeen: '14 Sep 2026',
          lastSeen: '15 Sep 2026',
          associatedIncidents: ['INC-042', 'INC-031'],
          relatedMitre: ['T1071.001', 'T1059.001'],
        });
      }
    }, 400);
  };

  return (
    <Layout>
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Threat Intelligence</h1>
        <p className="text-xs text-slate-400 mt-1">
          Investigate indicators of compromise (IOCs) and analyze their correlation with active security incidents
        </p>
      </div>

      {/* Search Indicator Hero Box */}
      <Card glow="cyan">
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Search Indicator of Compromise (IP, Domain, File Hash, or URL)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IP (e.g. 185.20.10.5), domain (evil-c2-domain.com), or SHA256..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-600/30 flex items-center justify-center space-x-2 shrink-0 transition-all cursor-pointer"
            >
              <Globe className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing Indicator...' : 'Analyze Indicator'}</span>
            </button>
          </div>

          {/* Preset Sample Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[11px] text-slate-400 font-mono">Quick Query Presets:</span>
            {mockIndicators.map((ind) => (
              <button
                key={ind.value}
                type="button"
                onClick={() => setSelectedIndicator(ind)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                  selectedIndicator.value === ind.value
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80 font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {ind.value.length > 20 ? `${ind.value.substring(0, 16)}...` : ind.value}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Detailed Indicator Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (1 Col): Indicator Stats & Details */}
        <Card title="Indicator Intelligence Card" subtitle="Aggregated threat feed metadata">
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Target Indicator</span>
              <p className="font-mono font-extrabold text-cyan-400 text-base mt-1 break-all">
                {selectedIndicator.value}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Indicator Type</span>
                <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                  {selectedIndicator.type}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Reputation Score</span>
                <span
                  className={`font-mono font-bold mt-0.5 block ${
                    selectedIndicator.reputation === 'MALICIOUS' ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {selectedIndicator.reputation}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Threat Confidence</span>
                <span className="font-mono font-bold text-cyan-400 mt-0.5 block">
                  {selectedIndicator.confidence}%
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">First / Last Seen</span>
                <span className="font-mono text-slate-300 text-[11px] mt-0.5 block">
                  {selectedIndicator.firstSeen}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
                Associated Correlated Incidents
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedIndicator.associatedIncidents.map((incId) => (
                  <button
                    key={incId}
                    onClick={() => navigate(`/incidents/${incId}`)}
                    className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold hover:bg-purple-900 text-xs transition-colors flex items-center space-x-1"
                  >
                    <span>{incId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
                Related MITRE ATT&CK Techniques
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedIndicator.relatedMitre.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-800 font-mono text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Right (2 Cols): Visual Relationship Pipeline Graph */}
        <Card title="Threat Relationship Correlation Graph" subtitle="Visual cascade mapping Indicator → Telemetry Alerts → Correlated Incidents → MITRE ATT&CK" className="lg:col-span-2">
          <div className="p-6 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col items-center space-y-6">
            {/* Level 1: Indicator Node */}
            <div className="w-full max-w-md p-4 rounded-xl bg-red-950/60 border-2 border-red-800 text-center soc-glow-red">
              <span className="text-[10px] uppercase font-mono text-red-400 font-bold tracking-wider block">
                Source Indicator of Compromise
              </span>
              <p className="font-mono font-extrabold text-slate-100 text-base mt-1 break-all">
                {selectedIndicator.value}
              </p>
              <div className="mt-2 flex justify-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-red-900/80 text-red-200 text-[10px] font-mono">
                  {selectedIndicator.type}
                </span>
                <span className="px-2 py-0.5 rounded bg-red-900/80 text-red-200 text-[10px] font-mono">
                  {selectedIndicator.confidence}% Confidence
                </span>
              </div>
            </div>

            <ArrowDown className="w-6 h-6 text-slate-600 animate-bounce" />

            {/* Level 2: Ingested Alerts Bundle */}
            <div className="w-full max-w-lg p-4 rounded-xl bg-blue-950/50 border border-blue-800 text-center">
              <span className="text-[10px] uppercase font-mono text-blue-400 font-bold tracking-wider block">
                Multi-Source Ingested Alerts (17 Telemetry Records)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <div className="p-2 rounded bg-slate-900 text-[11px] font-mono text-slate-300">
                  SIEM Logon Alert
                </div>
                <div className="p-2 rounded bg-slate-900 text-[11px] font-mono text-slate-300">
                  EDR PowerShell
                </div>
                <div className="p-2 rounded bg-slate-900 text-[11px] font-mono text-slate-300">
                  Network C2 Beacon
                </div>
                <div className="p-2 rounded bg-slate-900 text-[11px] font-mono text-slate-300">
                  Threat Intel Match
                </div>
              </div>
            </div>

            <ArrowDown className="w-6 h-6 text-slate-600 animate-bounce" />

            {/* Level 3: Correlated Incident */}
            <div className="w-full max-w-lg p-4 rounded-xl bg-purple-950/60 border border-purple-800 text-center">
              <span className="text-[10px] uppercase font-mono text-purple-400 font-bold tracking-wider block">
                AI Correlated Incident
              </span>
              <p className="font-mono font-bold text-slate-100 text-sm mt-1">
                INC-042: Coordinated Credential Compromise
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Priority: <strong className="text-red-400">CRITICAL</strong> | AI Confidence: 94%
              </p>
            </div>

            <ArrowDown className="w-6 h-6 text-slate-600 animate-bounce" />

            {/* Level 4: MITRE ATT&CK Mapping */}
            <div className="w-full max-w-lg p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-center">
              <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold tracking-wider block">
                Mapped MITRE ATT&CK Framework Tactics
              </span>
              <div className="flex justify-center flex-wrap gap-2 mt-3">
                {selectedIndicator.relatedMitre.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 rounded bg-slate-900 text-emerald-300 border border-emerald-700/60 font-mono text-xs font-semibold"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

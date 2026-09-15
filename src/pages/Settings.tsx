import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  Server,
  ShieldCheck,
  Radio,
  Globe,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [autoIsolate, setAutoIsolate] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dataSources] = useState([
    { id: 'siem', name: 'SIEM Log Ingestion', type: 'Splunk / QRadar', status: 'Connected', latency: '12ms', icon: Server },
    { id: 'edr', name: 'EDR Endpoint Protection', type: 'CrowdStrike / Defender', status: 'Connected', latency: '8ms', icon: ShieldCheck },
    { id: 'net', name: 'Network Sensor Probe', type: 'Zeek / Suricata', status: 'Connected', latency: '4ms', icon: Radio },
    { id: 'intel', name: 'Threat Intelligence Feed', type: 'IBM X-Force Threat Feed', status: 'Connected', latency: '45ms', icon: Globe },
  ]);

  return (
    <Layout>
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure multi-source threat feed ingestion, IBM Bob AI correlation parameters, and SOC alert preferences
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Data Source Integrations */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Connected Data Intelligence Feeds" subtitle="Multi-source ingestion channels for problem statement D2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dataSources.map((ds) => {
                const Icon = ds.icon;
                return (
                  <div
                    key={ds.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-100 text-xs">{ds.name}</h4>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{ds.type}</span>
                        </div>
                      </div>
                      <Badge value="RESOLVED" size="sm" className="!bg-emerald-950/80 !text-emerald-400" />
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Status: Connected</span>
                      </span>
                      <span>Latency: {ds.latency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* AI Configuration Section */}
          <Card title="IBM Bob AI Correlation Engine Settings" subtitle="Threshold tuning for alert correlation and false positive separation">
            <div className="space-y-6 text-xs">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-semibold text-slate-200">
                    Minimum Incident Correlation Confidence Threshold
                  </label>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{confidenceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Alerts sharing source IPs or hosts with confidence scores above {confidenceThreshold}% are automatically grouped into correlated incidents.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">Automatic EDR Endpoint Isolation</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Automatically execute containment on hosts affected by CRITICAL ransomware or C2 alerts.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoIsolate}
                    onChange={(e) => setAutoIsolate(e.target.checked)}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">Immediate Analyst Email & PagerAlerts</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Send BLUF executive summary notifications when Critical incidents are detected.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right (1 Col): Profile & Environment Info */}
        <div className="space-y-6">
          <Card title="SOC Analyst Profile" subtitle="Active session credentials">
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-700/80 text-cyan-300 font-bold flex items-center justify-center text-sm">
                  AV
                </div>
                <div>
                  <p className="font-bold text-slate-100 text-sm">Alex Vance</p>
                  <p className="text-[11px] text-slate-400 font-mono">Lead SOC Security Analyst</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Role & Permissions</span>
                <span className="font-semibold text-cyan-400 text-xs mt-0.5 block">
                  Tier 3 Senior Incident Commander
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Organization</span>
                <span className="font-semibold text-slate-200 text-xs mt-0.5 block">
                  Enterprise Security Operations Center
                </span>
              </div>
            </div>
          </Card>

          <Card title="Hackathon Build Meta" subtitle="IBM BoB AI Innovation Challenge 2026">
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60">
                <span className="font-bold text-amber-300 block">Problem Statement D2</span>
                <span className="text-[11px] text-amber-200/80 mt-0.5 block">
                  Threat Intelligence Correlation & Alert Prioritisation Assistant
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                <p>Frontend Mode: <strong className="text-emerald-400">UI Prototype</strong></p>
                <p>Vite + React + TypeScript + Tailwind</p>
                <p>Version: 1.0.0-hackathon</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

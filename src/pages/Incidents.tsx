import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useThreatData } from '../store/ThreatStore';
import {
  AlertTriangle,
  Search,
  SlidersHorizontal,
  Bot,
  ArrowRight,
  Clock,
  Zap,
  CheckCircle,
} from 'lucide-react';

export const Incidents: React.FC = () => {
  const { incidents: mockIncidents } = useThreatData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredIncidents = mockIncidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.affectedAssets.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority = selectedPriority === 'ALL' || incident.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'ALL' || incident.status === selectedStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const criticalCount = mockIncidents.filter((i) => i.priority === 'CRITICAL').length;
  const highCount = mockIncidents.filter((i) => i.priority === 'HIGH').length;
  const mediumCount = mockIncidents.filter((i) => i.priority === 'MEDIUM').length;
  const lowCount = mockIncidents.filter((i) => i.priority === 'LOW').length;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Correlated Incidents</h1>
          <p className="text-xs text-slate-400 mt-1">
            AI-correlated security events grouped into prioritized, actionable incidents
          </p>
        </div>

        <button
          onClick={() => navigate('/bob-investigation/INC-042')}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>Launch AI Bob Investigation</span>
        </button>
      </div>

      {/* Priority Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedPriority('CRITICAL')}
          className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 cursor-pointer hover:border-red-600 transition-colors soc-glow-red"
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Critical</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-extrabold text-red-400 mt-1">{criticalCount}</p>
          <p className="text-[11px] text-red-300/80 mt-1">Immediate action required</p>
        </div>

        <div
          onClick={() => setSelectedPriority('HIGH')}
          className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/60 cursor-pointer hover:border-orange-600 transition-colors"
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">High</span>
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-extrabold text-orange-400 mt-1">{highCount}</p>
          <p className="text-[11px] text-amber-300/80 mt-1">High severity threat</p>
        </div>

        <div
          onClick={() => setSelectedPriority('MEDIUM')}
          className="p-4 rounded-xl bg-yellow-950/40 border border-yellow-900/60 cursor-pointer hover:border-yellow-600 transition-colors"
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Medium</span>
            <SlidersHorizontal className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-extrabold text-yellow-400 mt-1">{mediumCount}</p>
          <p className="text-[11px] text-yellow-300/80 mt-1">Standard investigation</p>
        </div>

        <div
          onClick={() => setSelectedPriority('LOW')}
          className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/60 cursor-pointer hover:border-emerald-600 transition-colors"
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Low / Info</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{lowCount}</p>
          <p className="text-[11px] text-emerald-300/80 mt-1">Low priority or benign</p>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, asset, or incident ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="MONITORING">Monitoring</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </Card>

      {/* Incident Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">AI Confidence</th>
                <th className="py-3 px-4">Alerts</th>
                <th className="py-3 px-4">MITRE ATT&CK</th>
                <th className="py-3 px-4">First / Last Seen</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-4 font-mono font-bold text-cyan-400 group-hover:text-cyan-300">
                    {incident.id}
                  </td>
                  <td className="py-4 px-4 max-w-sm">
                    <p className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {incident.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Assets: {incident.affectedAssets.join(', ')}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <Badge value={incident.priority} size="sm" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full rounded-full"
                          style={{ width: `${incident.confidence}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-200">{incident.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-purple-400">
                    {incident.relatedAlertsCount}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {incident.mitreTechniques.map((tech) => (
                        <span
                          key={tech}
                          className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 border border-slate-800"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-400 whitespace-nowrap">
                    <div className="flex items-center space-x-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{incident.firstSeen} — {incident.lastSeen}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge value={incident.status} size="sm" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
};

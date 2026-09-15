import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Drawer } from '../components/common/Drawer';
import { useThreatData } from '../store/ThreatStore';
import type { Alert } from '../types';
import {
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bot,
  Terminal,
  Shield,
  Clock,
  Server,
  Network,
} from 'lucide-react';

export const Alerts: React.FC = () => {
  const { alerts: mockAlerts, incidents: liveIncidents } = useThreatData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const itemsPerPage = 8;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const filteredAlerts = mockAlerts.filter((alert) => {
    const matchesSearch =
      alert.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.srcIp.includes(searchQuery) ||
      alert.host.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = selectedSource === 'ALL' || alert.source === selectedSource;
    const matchesSeverity = selectedSeverity === 'ALL' || alert.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'ALL' || alert.status === selectedStatus;

    return matchesSearch && matchesSource && matchesSeverity && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Security Alerts</h1>
          <p className="text-xs text-slate-400 mt-1">
            Unified view of raw & normalized alerts from multi-source intelligence feeds
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Feeds</span>
          </button>
        </div>
      </div>

      {/* Top Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-mono uppercase">Total Ingested Alerts</p>
            <p className="text-xl font-bold text-slate-100 mt-0.5">{mockAlerts.length.toLocaleString()}</p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-1 rounded border border-cyan-800/50">
            Real-Time
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-mono uppercase">AI Analyzed</p>
            <p className="text-xl font-bold text-purple-400 mt-0.5">{mockAlerts.filter((a) => a.status !== 'UNPROCESSED').length.toLocaleString()}</p>
          </div>
          <span className="text-xs font-mono text-purple-400 bg-purple-950 px-2 py-1 rounded border border-purple-800/50">
            Normalized
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-mono uppercase">Correlated Incidents</p>
            <p className="text-xl font-bold text-red-400 mt-0.5">{liveIncidents.length}</p>
          </div>
          <span className="text-xs font-mono text-red-400 bg-red-950 px-2 py-1 rounded border border-red-800/50">
            Actionable
          </span>
        </div>
      </div>

      {/* Filter Controls Card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event, IP, host or ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          {/* Filter Source */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Intelligence Sources</option>
            <option value="SIEM">SIEM Log Collector</option>
            <option value="EDR">EDR Endpoint Agent</option>
            <option value="Network Sensor">Network Sensor</option>
            <option value="Threat Intel">Threat Intel Feed</option>
          </select>

          {/* Filter Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFORMATIONAL">Informational</option>
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Correlation Statuses</option>
            <option value="CORRELATED">Correlated</option>
            <option value="ANALYZED">Analyzed</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>
        </div>
      </Card>

      {/* Main Alert Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Alert ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Source Feed</th>
                <th className="py-3 px-4">Security Event</th>
                <th className="py-3 px-4">Source IP</th>
                <th className="py-3 px-4">Target Endpoint</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Correlated Incident</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No security alerts found matching your selected filters.
                  </td>
                </tr>
              ) : (
                paginatedAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-cyan-400 group-hover:text-cyan-300">
                      {alert.id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {alert.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[11px] border border-slate-800">
                        {alert.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-100 max-w-xs truncate">
                      {alert.event}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{alert.srcIp}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{alert.host}</td>
                    <td className="py-3.5 px-4">
                      <Badge value={alert.severity} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {alert.correlationId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/incidents/${alert.correlationId}`);
                          }}
                          className="text-purple-400 hover:text-purple-300 font-bold underline flex items-center space-x-1"
                        >
                          <span>{alert.correlationId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge value={alert.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{paginatedAlerts.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{filteredAlerts.length}</span> alerts
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Alert Detail Drawer */}
      <Drawer
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={
          selectedAlert ? (
            <div className="flex items-center space-x-3">
              <span className="font-mono font-bold text-cyan-400 text-lg">{selectedAlert.id}</span>
              <Badge value={selectedAlert.severity} />
            </div>
          ) : (
            'Alert Detail'
          )
        }
        subtitle={selectedAlert?.event}
      >
        {selectedAlert && (
          <div className="space-y-6">
            {/* Quick Actions Header */}
            {selectedAlert.correlationId && (
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                    Correlated into Incident
                  </p>
                  <p className="text-sm font-bold text-slate-100">{selectedAlert.correlationId}</p>
                </div>
                <button
                  onClick={() => {
                    navigate(`/bob-investigation/${selectedAlert.correlationId}`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all"
                >
                  <Bot className="w-4 h-4" />
                  <span>Ask IBM Bob</span>
                </button>
              </div>
            )}

            {/* Normalized Event Card */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                AI Normalized Event Overview
              </h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                {selectedAlert.normalizedEvent}
              </div>
            </div>

            {/* Event Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Source Feed</p>
                <p className="text-xs font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedAlert.source}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Timestamp</p>
                <p className="text-xs font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedAlert.timestamp}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Source IP</p>
                <p className="text-xs font-mono font-semibold text-cyan-400 mt-1 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-slate-400" />
                  {selectedAlert.srcIp}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Target Host</p>
                <p className="text-xs font-mono font-semibold text-slate-200 mt-1">
                  {selectedAlert.host}
                </p>
              </div>
            </div>

            {/* MITRE ATT&CK Mapping */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                MITRE ATT&CK Techniques
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedAlert.mitreTechniques.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded bg-slate-950 text-cyan-300 font-mono text-xs border border-cyan-800/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Raw JSON Payload */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                Raw Telemetry Payload
              </h4>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                {selectedAlert.rawEvent}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </Layout>
  );
};

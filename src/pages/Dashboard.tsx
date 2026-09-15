import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { WorkflowPipeline } from '../components/common/WorkflowPipeline';
import {
  mockAlertVolumeOverTime,
  mockAlertsBySource,
  mockThreatClassification,
  mockSeverityDistribution,
} from '../data/mockData';
import { useThreatData, useDashboardStats } from '../store/ThreatStore';
import type { RawFeed } from '../services/threatEngine';
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Bot,
  ArrowRight,
  Filter,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('24h');
  const [feedMessage, setFeedMessage] = useState('');
  const { incidents, simulateAttack, resetDemo, lastIngestedAt, ingest } = useThreatData();
  const liveStats = useDashboardStats();

  const handleImportFeed = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const feeds: RawFeed[] = Array.isArray(parsed) ? parsed as RawFeed[] : [parsed as RawFeed];
      if (!feeds.every((f) => f && typeof f === 'object' && ['SIEM','EDR','Network Sensor','Threat Intel'].includes((f as RawFeed).source))) throw new Error('Each record needs source: SIEM, EDR, Network Sensor or Threat Intel');
      ingest(feeds);
      setFeedMessage(`Ingested ${feeds.length} feed event${feeds.length === 1 ? '' : 's'} from ${file.name}`);
    } catch (error) {
      setFeedMessage(error instanceof Error ? error.message : 'Invalid feed JSON');
    }
    event.target.value = '';
  };

  const criticalIncidents = incidents.filter((inc) => inc.priority === 'CRITICAL' || inc.priority === 'HIGH');

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
            Threat Intelligence Command Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 font-mono border border-cyan-800/60">
              Live Feed Active
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time alert correlation, threat prioritisation and AI-assisted investigation
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: '24h', label: 'Last 24 hours' },
            { id: '7d', label: 'Last 7 days' },
            { id: '30d', label: 'Last 30 days' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeRange(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeRange === item.id
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-cyan-950/30 border border-cyan-900/50 mb-1">
        <button onClick={simulateAttack} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-extrabold text-xs hover:bg-cyan-400 transition">Simulate Multi-Source Attack</button>
        <label className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition cursor-pointer">Import Feed JSON<input type="file" accept="application/json,.json" onChange={handleImportFeed} className="hidden" /></label>
        <button onClick={resetDemo} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition">Reset Demo</button>
        <span className="text-[11px] text-slate-400">Feeds → normalize → correlate → score → MITRE → Bob → BLUF</span>
        {feedMessage && <span className="text-[10px] text-amber-300">{feedMessage}</span>}
        {lastIngestedAt && <span className="ml-auto text-[10px] font-mono text-emerald-400">Last ingestion {new Date(lastIngestedAt).toLocaleTimeString()}</span>}
      </div>

      {/* D2 Workflow Banner */}
      <WorkflowPipeline />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Alerts */}
        <Card hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Alerts</p>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">
                {liveStats.totalAlerts.toLocaleString()}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/50 text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            <span>{liveStats.totalAlertsTrend} vs previous</span>
          </div>
        </Card>

        {/* Correlated Incidents */}
        <Card hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Correlated Incidents</p>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">
                {liveStats.correlatedIncidents}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/50 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-purple-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span>+{liveStats.correlatedIncidentsToday} newly correlated today</span>
          </div>
        </Card>

        {/* Critical Threats */}
        <Card hoverEffect glow="red">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Critical Threats</p>
              <h2 className="text-2xl font-bold text-red-400 mt-1">
                {liveStats.criticalThreats}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-red-950/70 border border-red-800/80 text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xs text-red-300 font-medium">
            Requires immediate attention
          </div>
        </Card>

        {/* High Priority */}
        <Card hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">High Priority</p>
              <h2 className="text-2xl font-bold text-orange-400 mt-1">
                {liveStats.highPriority}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/50 text-orange-400">
              <Filter className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xs text-amber-300 font-medium">
            Needs analyst investigation
          </div>
        </Card>

        {/* False Positives */}
        <Card hoverEffect>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">False Positives</p>
              <h2 className="text-2xl font-bold text-emerald-400 mt-1">
                {liveStats.falsePositives}
              </h2>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-400 font-medium">
            {liveStats.falsePositivesPercentage}% of analyzed alerts filtered
          </div>
        </Card>
      </div>

      {/* AI Insight Card */}
      <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-purple-950/80 border border-cyan-800/60 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg soc-glow-cyan">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-900/60 border border-cyan-600/60 flex items-center justify-center text-cyan-300 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">IBM Bob AI Insight</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
                94% Confidence
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 mt-0.5">
              AI correlation engine identified 4 critical incidents requiring immediate analyst triage. Primary risk: Coordinated Credential Compromise on Active Directory.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/bob-investigation/INC-042')}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center space-x-2 shrink-0 transition-all cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>Launch IBM Bob Assistant</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A: Alert Volume Over Time (2 Cols) */}
        <Card title="Alert Volume Over Time" subtitle="Multi-source ingestion volume across 24-hour window" className="lg:col-span-2">
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockAlertVolumeOverTime}>
                <defs>
                  <linearGradient id="siemGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="edrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="SIEM" stroke="#3b82f6" fillOpacity={1} fill="url(#siemGrad)" />
                <Area type="monotone" dataKey="EDR" stroke="#8b5cf6" fillOpacity={1} fill="url(#edrGrad)" />
                <Area type="monotone" dataKey="Network" stroke="#06b6d4" fillOpacity={0} />
                <Area type="monotone" dataKey="ThreatIntel" stroke="#f59e0b" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart B: Alerts by Source */}
        <Card title="Alerts by Source" subtitle="Ingestion feed distribution">
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockAlertsBySource}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {mockAlertsBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart C: Threat Classification */}
        <Card title="Threat Classification" subtitle="AI separation of genuine threats vs false positives">
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockThreatClassification}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockThreatClassification.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart D: Severity Distribution */}
        <Card title="Severity Distribution" subtitle="Prioritized threat severity breakdown">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockSeverityDistribution}>
                <XAxis dataKey="severity" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {mockSeverityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Critical Incidents Section */}
      <Card
        title="Critical & High Priority Incidents"
        subtitle="Correlated security events requiring immediate analyst action"
        action={
          <button
            onClick={() => navigate('/incidents')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">AI Confidence</th>
                <th className="py-3 px-4">Alerts</th>
                <th className="py-3 px-4">MITRE ATT&CK</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {criticalIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-cyan-400 group-hover:text-cyan-300">
                    {incident.id}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-100 max-w-xs truncate">
                    {incident.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge value={incident.priority} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full rounded-full"
                          style={{ width: `${incident.confidence}%` }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-slate-200">{incident.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{incident.relatedAlertsCount}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {incident.mitreTechniques.slice(0, 3).map((tech) => (
                        <span
                          key={tech}
                          className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 border border-slate-800"
                        >
                          {tech}
                        </span>
                      ))}
                      {incident.mitreTechniques.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          +{incident.mitreTechniques.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge value={incident.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 flex items-center space-x-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{incident.lastSeen}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bob-investigation/${incident.id}`);
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 text-[11px] font-semibold transition-colors flex items-center space-x-1 ml-auto"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Investigate</span>
                    </button>
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

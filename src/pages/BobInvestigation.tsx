import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useThreatData } from '../store/ThreatStore';
import { mockBobConversations } from '../data/mockData';
import type { BobChatMessage } from '../types';
import {
  Bot,
  Send,
  Paperclip,
  Trash2,
  Sparkles,
  CheckCircle2,
  FileText,
  Server,
} from 'lucide-react';

export const BobInvestigation: React.FC = () => {
  const { incidents: mockIncidents } = useThreatData();
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const currentIncidentId = incidentId || 'INC-042';
  const incident = mockIncidents.find((i) => i.id === currentIncidentId) || mockIncidents[0];

  const initialMessages: BobChatMessage[] =
    mockBobConversations[currentIncidentId] || [
      {
        id: 'msg-init-1',
        sender: 'user',
        timestamp: '10:19 AM',
        text: 'Investigate this incident and explain why these alerts are related.',
      },
      {
        id: 'msg-init-2',
        sender: 'bob',
        timestamp: '10:20 AM',
        text: `I have correlated ${incident.relatedAlertsCount} alerts across ${incident.sourceCount ?? new Set(incident.timeline.map((t) => t.source)).size} source feeds with ${incident.confidence}% confidence.`,
        blufSummary: {
          narrative:
            `A likely coordinated intrusion has been detected. ${incident.relatedAlertsCount} alerts were correlated with ${incident.confidence}% confidence. ${incident.whyCorrelated}`,
          priority: 'CRITICAL',
          classification: 'GENUINE_THREAT',
          confidence: 94,
          mitre: ['T1059.001', 'T1071.001', 'T1003', 'T1053.005'],
          actions: [
            '1. Isolate affected endpoint WS-FINANCE-04 immediately via EDR agent.',
            '2. Investigate compromised credentials (admin_svc) and initiate Kerberos ticket double-reset.',
            '3. Block identified malicious indicators (185.20.10.5 & evil-c2-domain.com) at perimeter gateway.',
            '4. Continue monitoring related Active Directory domain controller logon activity.',
          ],
        },
      },
    ];

  const [messages, setMessages] = useState<BobChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: BobChatMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let bobReplyText = `Bob Analysis Complete — ${incident.id}`;

      if (text.toLowerCase().includes('critical') || text.toLowerCase().includes('why')) {
        bobReplyText =
          `This incident is scored ${incident.priority} with ${incident.confidence}% confidence. ${incident.whyCorrelated} The observed chain spans ${incident.mitreTechniques.join(', ') || 'no mapped techniques'}.` ;
      } else if (text.toLowerCase().includes('chain') || text.toLowerCase().includes('timeline')) {
        bobReplyText =
          `Attack chain progression: ${incident.timeline.map((step) => step.title).join(' → ')}. MITRE coverage: ${incident.mitreTechniques.join(', ') || 'pending mapping'}.`;
      } else if (text.toLowerCase().includes('next') || text.toLowerCase().includes('action')) {
        bobReplyText =
          `Recommended Immediate Playbook: 1. Contain ${incident.affectedAssets.join(', ') || 'affected assets'}. 2. Block confirmed indicators. 3. Reset suspected compromised credentials. 4. Preserve evidence and hunt for ${incident.mitreTechniques.join(', ') || 'related activity'}.`;
      } else {
        bobReplyText = `IBM Bob has reviewed telemetry for ${incident.id}. Alert correlation confirms multi-stage threat propagation.`;
      }

      const bobMsg: BobChatMessage = {
        id: `msg-b-${Date.now()}`,
        sender: 'bob',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: bobReplyText,
      };

      setMessages((prev) => [...prev, bobMsg]);
    }, 800);
  };

  return (
    <Layout>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/30 border border-cyan-500/60 flex items-center justify-center text-cyan-300 soc-glow-cyan">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                IBM Bob Investigation Assistant
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
                  AI Specialist
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                AI-assisted investigation, BLUF narrative generation, and playbook execution for security incidents
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Generate Executive Report</span>
          </button>
        </div>
      </div>

      {/* Selected Incident Top Bar Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="font-mono font-extrabold text-cyan-400 text-sm">{incident.id}</span>
          <span className="text-slate-500">|</span>
          <span className="font-semibold text-slate-100 text-sm">{incident.title}</span>
          <Badge value={incident.priority} size="sm" />
          <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            {incident.confidence}% Confidence
          </span>
        </div>

        {/* Incident Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Switch Incident:</span>
          <select
            value={currentIncidentId}
            onChange={(e) => navigate(`/bob-investigation/${e.target.value}`)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono font-semibold focus:outline-none focus:border-cyan-500/60"
          >
            {mockIncidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id} — {inc.title.substring(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Two-Column Hero Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT (5 Cols): Incident Context Panel */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Incident Investigation Context" subtitle="Live correlated telemetry feeds">
            <div className="space-y-4 text-xs">
              {/* Timeline Context */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2 font-bold">
                  Attack Sequence Timeline
                </span>
                <div className="space-y-2">
                  {incident.timeline.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2 border-l-2 border-cyan-500/60 pl-2 py-0.5">
                      <span className="font-mono text-[10px] text-cyan-400 font-bold shrink-0">{step.time}</span>
                      <div>
                        <p className="font-semibold text-slate-200 text-[11px]">{step.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicators */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">
                  Correlated Indicators (IOCs)
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-mono text-[11px] border border-red-800">
                    185.20.10.5 (IPv4)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-mono text-[11px] border border-red-800">
                    evil-c2-domain.com
                  </span>
                </div>
              </div>

              {/* Mapped Techniques */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">
                  MITRE ATT&CK Tactics
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {incident.mitreTechniques.map((tech) => (
                    <span key={tech} className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono text-[11px] border border-cyan-800/60">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Systems */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">
                  Target Host Endpoints
                </span>
                <div className="space-y-1">
                  {incident.affectedAssets.map((asset) => (
                    <p key={asset} className="font-mono text-slate-200 text-xs flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-cyan-400" />
                      {asset}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT (7 Cols): Bob Conversation & BLUF Interface */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title={
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-100 text-base">IBM Bob AI Assistant</span>
              </div>
            }
            subtitle="Status: Ready to investigate — Interactive BLUF reasoning engine"
            action={
              <button
                onClick={() => setMessages([])}
                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            }
          >
            {/* Conversation Messages Container */}
            <div className="space-y-4 min-h-[420px] max-h-[540px] overflow-y-auto pr-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-600 text-slate-950 font-semibold shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 shadow-xl'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-slate-800/40">
                      <span className="font-mono text-[10px] uppercase font-bold text-cyan-400">
                        {msg.sender === 'user' ? 'SOC Analyst' : 'IBM Bob Assistant'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{msg.timestamp}</span>
                    </div>

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* STRUCTURED BLUF (BOTTOM LINE UP FRONT) SUMMARY CARD */}
                    {msg.blufSummary && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-slate-900 to-cyan-950/60 border border-cyan-800/80 text-slate-200 space-y-4 soc-glow-cyan">
                        {/* BLUF Badge Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60">
                          <span className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-extrabold text-xs tracking-wider uppercase font-mono shadow">
                            Bottom Line Up Front (BLUF)
                          </span>
                          <span className="text-xs font-mono font-bold text-cyan-300">
                            {msg.blufSummary.confidence}% AI Confidence
                          </span>
                        </div>

                        {/* Executive Narrative */}
                        <div>
                          <h5 className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider mb-1">
                            Executive Incident Narrative
                          </h5>
                          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                            {msg.blufSummary.narrative}
                          </p>
                        </div>

                        {/* Threat Assessment Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-mono block">Threat Priority</span>
                            <div className="mt-1">
                              <Badge value={msg.blufSummary.priority} size="sm" />
                            </div>
                          </div>

                          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-mono block">Classification</span>
                            <div className="mt-1">
                              <Badge value={msg.blufSummary.classification} size="sm" />
                            </div>
                          </div>
                        </div>

                        {/* Recommended Actions List */}
                        <div>
                          <h5 className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider mb-1.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Commander Recommended Actions
                          </h5>
                          <div className="space-y-1.5">
                            {msg.blufSummary.actions.map((act, i) => (
                              <div
                                key={i}
                                className="p-2 rounded bg-emerald-950/40 border border-emerald-900/60 text-[11px] font-medium text-emerald-200"
                              >
                                {act}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-cyan-400 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>IBM Bob is reasoning & structuring BLUF summary...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts Bar */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase block font-semibold">
                Quick Investigation Prompts:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Why is this incident critical?',
                  'Show the attack chain',
                  'What should the analyst do next?',
                  'Explain the MITRE techniques',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-xs text-slate-300 hover:text-cyan-300 transition-all font-medium cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Controls */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center space-x-2">
              <button
                title="Attach evidence telemetry file"
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask IBM Bob about this incident (e.g. explain correlation rationale)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
              />

              <button
                onClick={() => handleSendMessage()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

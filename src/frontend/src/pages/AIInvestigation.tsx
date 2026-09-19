import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { fetchIncidents, fetchIncident, fetchInvestigation, refreshInvestigation, notifyIncident, type InvestigationResult } from '../services/api';
import type { Incident } from '../types';
import { Bot, Send, FileText, RefreshCw, ShieldCheck } from 'lucide-react';

export const AIInvestigation: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notifyStatus, setNotifyStatus] = useState('');

  const load = async (id?: string) => {
    setLoading(true); setError('');
    try {
      const list = await fetchIncidents(); setIncidents(list);
      const selectedId = id || list[0]?.id;
      if (!selectedId) { setIncident(null); setInvestigation(null); return; }
      if (selectedId !== id) navigate(`/ai-investigation/${selectedId}`, { replace: true });
      const [i, result] = await Promise.all([fetchIncident(selectedId), fetchInvestigation(selectedId)]);
      setIncident(i); setInvestigation(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load live investigation data.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(incidentId); }, [incidentId]);

  const ask = () => {
    if (!question.trim() || !investigation) return;
    const q=question.toLowerCase(); let text=investigation.threatAssessment;
    if(q.includes('why')||q.includes('related')) text=investigation.whyCorrelated;
    else if(q.includes('action')||q.includes('next')) text=investigation.recommendedActions.join(' ');
    else if(q.includes('mitre')||q.includes('technique')) text=`Observed techniques: ${investigation.mitreTechniques.join(', ') || 'none mapped'}.`;
    else if(q.includes('indicator')||q.includes('ip')) text=`Relevant indicators: ${investigation.indicators.join(', ') || 'none extracted'}.`;
    setAnswer(text); setQuestion('');
  };
  const refresh = async () => { if(!incident) return; try { setInvestigation(await refreshInvestigation(incident.id)); } catch(e){setError(e instanceof Error?e.message:'Refresh failed');} };

  return <Layout>
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-cyan-600/30 border border-cyan-500/60 flex items-center justify-center text-cyan-300"><Bot className="w-5 h-5"/></div><div><h1 className="text-2xl font-extrabold text-slate-100">AI Investigation Assistant</h1><p className="text-xs text-slate-400">Live evidence-backed incident investigation, MITRE reasoning and commander BLUF</p></div></div>
      <div className="flex gap-2"><button onClick={refresh} disabled={!incident} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-center gap-2 disabled:opacity-40"><RefreshCw className="w-4 h-4"/>Refresh Evidence</button><button onClick={async()=>{if(!incident)return; try { const r=await notifyIncident(incident.id); setNotifyStatus(r.notifications.length ? r.notifications.map(n=>`${n.channel}: ${n.status}`).join(' • ') : 'No notification channel is configured.'); setTimeout(()=>setNotifyStatus(''),4000);} catch(e){setNotifyStatus(e instanceof Error?e.message:'Notification failed');}}} disabled={!incident || (incident.priority!=='HIGH' && incident.priority!=='CRITICAL')} className="px-3 py-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 text-xs flex items-center gap-2 disabled:opacity-40"><Send className="w-4 h-4"/>Notify Incident</button><button onClick={()=>navigate('/reports')} className="px-3 py-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2"><FileText className="w-4 h-4"/>Reports</button></div>
    </div>
    {error && <div className="p-3 rounded-xl bg-red-950/40 border border-red-900 text-red-300 text-xs">{error}</div>}
    {notifyStatus && <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900 text-purple-200 text-xs">Incident notification: {notifyStatus}</div>}
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3"><span className="text-xs text-slate-400">Incident</span><select value={incident?.id ?? ''} onChange={e=>navigate(`/ai-investigation/${e.target.value}`)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"><option value="">Select incident</option>{incidents.map(i=><option key={i.id} value={i.id}>{i.id} — {i.title}</option>)}</select>{incident&&<><Badge value={incident.priority} size="sm"/><span className="text-xs font-mono text-cyan-300">{incident.confidence}% confidence</span></>}</div>
    {loading ? <Card><div className="text-sm text-slate-400 animate-pulse">Loading live correlated evidence…</div></Card> : !investigation ? <Card><div className="text-sm text-slate-400">No incident is currently available for investigation.</div></Card> : <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Card title="BLUF — Bottom Line Up Front" subtitle="Generated from the selected incident evidence" glow="cyan" className="lg:col-span-2"><p className="text-sm leading-7 text-slate-100">{investigation.bluf}</p><div className="grid grid-cols-3 gap-3 mt-5"><div className="p-3 rounded-lg bg-slate-950 border border-slate-800"><span className="text-[10px] text-slate-500 block">PRIORITY</span><b className="text-red-400">{investigation.priority}</b></div><div className="p-3 rounded-lg bg-slate-950 border border-slate-800"><span className="text-[10px] text-slate-500 block">CONFIDENCE</span><b className="text-cyan-400">{investigation.confidence}%</b></div><div className="p-3 rounded-lg bg-slate-950 border border-slate-800"><span className="text-[10px] text-slate-500 block">CLASSIFICATION</span><b className="text-emerald-400 text-xs">{investigation.classification}</b></div></div></Card><Card title="Commander Actions" subtitle="Evidence-driven response"><div className="space-y-2">{investigation.recommendedActions.map((a,i)=><div key={i} className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-200"><ShieldCheck className="inline w-4 h-4 mr-2 text-emerald-400"/>{a}</div>)}</div></Card></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card title="Correlated Evidence" subtitle="Live alerts supporting the assessment"><div className="space-y-2">{investigation.evidence.map((e,i)=><div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">{e}</div>)}</div></Card><Card title="MITRE ATT&CK & Indicators" subtitle="Observed techniques and extracted indicators"><div className="flex flex-wrap gap-2 mb-4">{investigation.mitreTechniques.map(t=><span key={t} className="px-2 py-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-mono">{t}</span>)}</div><div className="space-y-2">{investigation.indicators.map(i=><div key={i} className="text-xs font-mono text-amber-300 bg-amber-950/30 border border-amber-900/50 rounded p-2">{i}</div>)}</div></Card></div>
      <Card title="AI Investigation Console" subtitle="Answers are grounded in the selected incident evidence and correlation context"><div className="flex gap-2"><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Ask why alerts correlate, what MITRE techniques were observed, or what to do next…" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200"/><button onClick={ask} className="px-4 rounded-xl bg-cyan-600 text-slate-950 font-bold"><Send className="w-4 h-4"/></button></div>{answer&&<div className="mt-4 p-4 rounded-xl bg-cyan-950/30 border border-cyan-900 text-sm text-slate-200 leading-6"><Bot className="inline w-4 h-4 text-cyan-400 mr-2"/>{answer}</div>}</Card>
    </>}
  </Layout>;
};

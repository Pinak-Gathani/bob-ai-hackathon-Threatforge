import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  fetchNotificationSettings,
  saveNotificationSettings,
  fetchNotificationHistory,
  sendTestNotification,
  type NotificationRecord,
  type NotificationSettings,
} from '../services/api';
import { Bell, Mail, Smartphone, ShieldAlert, Save, Send, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

const priorityOptions = ['HIGH', 'CRITICAL', 'MEDIUM', 'LOW'];

export const Notifications: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [minPriority, setMinPriority] = useState('HIGH');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [s, h] = await Promise.all([fetchNotificationSettings(), fetchNotificationHistory()]);
      setSettings(s);
      setEmail(s.emailRecipient || '');
      setMobile(s.smsRecipient || '');
      setMinPriority(s.minPriority);
      setEmailEnabled(s.emailEnabled);
      setSmsEnabled(s.smsEnabled);
      setEnabled(s.enabled);
      setHistory(h.notifications);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load notification settings.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const s = await saveNotificationSettings({ enabled, minPriority, emailEnabled, emailRecipient: email.trim(), smsEnabled, smsRecipient: mobile.trim() });
      setSettings(s); setMessage('Incident notification policy saved.');
      setTimeout(() => setMessage(''), 2600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save notification settings.');
    } finally { setSaving(false); }
  };

  const test = async () => {
    setError(''); setMessage('');
    try {
      const result = await sendTestNotification();
      if (result.notifications.length === 0) {
        setMessage('No incident is available to test yet. Generate a demo incident first.');
      } else {
        setMessage(`Test notification processed: ${result.notifications.map(n => `${n.channel} ${n.status}`).join(' • ')}`);
      }
      const h = await fetchNotificationHistory(); setHistory(h.notifications);
      setTimeout(() => setMessage(''), 5000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Notification test failed.'); }
  };

  const statusBadge = (status: string) => {
    const cls = status === 'SENT' || status === 'SIMULATED' ? 'text-emerald-400' : status === 'FAILED' ? 'text-red-400' : 'text-amber-400';
    return <span className={`font-mono text-[10px] font-bold ${cls}`}>{status}</span>;
  };

  return <Layout>
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Incident Notifications</h1>
        <p className="text-xs text-slate-400 mt-1">Notify humans about correlated, prioritised incidents — never raw alert floods</p>
      </div>
      <button onClick={load} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Refresh</button>
    </div>

    {error && <div className="p-3 rounded-xl bg-red-950/40 border border-red-900 text-red-300 text-xs">{error}</div>}
    {message && <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-900 text-cyan-200 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400"/>{message}</div>}

    {loading ? <Card><div className="animate-pulse text-sm text-slate-400">Loading notification engine…</div></Card> : <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Notification Policy" subtitle="Automatic delivery is evaluated after incident correlation and priority scoring" className="lg:col-span-2">
          <div className="space-y-5 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span><b className="text-slate-100 block">Incident notifications enabled</b><small className="text-slate-400">Only new or escalated incidents meeting the priority threshold are eligible.</small></span>
              <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} className="w-5 h-5 accent-cyan-500"/>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label><span className="text-slate-400">Minimum priority</span><select value={minPriority} onChange={e=>setMinPriority(e.target.value)} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200">{priorityOptions.map(p=><option key={p}>{p}</option>)}</select></label>
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-900/50"><span className="text-[10px] uppercase text-cyan-400 font-mono">Policy</span><p className="mt-1 text-slate-300">{minPriority}+ incidents are notified as a single incident package.</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-cyan-400"/><b>Email delivery</b></div><input type="checkbox" checked={emailEnabled} onChange={e=>setEmailEnabled(e.target.checked)} className="w-5 h-5 accent-cyan-500"/></div>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="analyst@example.com" type="email" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"/>
                <p className="text-[10px] text-slate-500">Provider: {settings?.emailProviderConfigured ? 'SMTP configured' : settings?.demoMode ? 'Demo delivery (safe)' : 'Not configured'}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-400"/><b>Mobile SMS</b></div><input type="checkbox" checked={smsEnabled} onChange={e=>setSmsEnabled(e.target.checked)} className="w-5 h-5 accent-cyan-500"/></div>
                <input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="+91XXXXXXXXXX" type="tel" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"/>
                <p className="text-[10px] text-slate-500">Provider: {settings?.smsProviderConfigured ? 'Twilio configured' : settings?.demoMode ? 'Demo delivery (safe)' : 'Not configured'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-slate-950 font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4"/>{saving ? 'Saving…' : 'Save Notification Policy'}</button>
              <button onClick={test} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-2"><Send className="w-4 h-4"/>Send Test</button>
            </div>
          </div>
        </Card>

        <Card title="Delivery Logic" subtitle="Incident-level notification design">
          <div className="space-y-3 text-xs">
            {[
              ['1', 'Correlate', 'Multiple alerts become one evidence-backed incident'],
              ['2', 'Prioritise', 'Only eligible HIGH/CRITICAL incidents trigger delivery'],
              ['3', 'Package', 'Notification contains BLUF, evidence, MITRE and next steps'],
              ['4', 'Escalate', 'A priority escalation can create a new notification event'],
            ].map(([n,t,d]) => <div key={n} className="flex gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800"><span className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center font-mono font-bold">{n}</span><div><b className="text-slate-200">{t}</b><p className="text-slate-400 mt-0.5">{d}</p></div></div>)}
          </div>
        </Card>
      </div>

      <Card title="Notification History" subtitle="Delivery records are tied to incidents and priorities">
        {history.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">No incident notifications yet. Generate a demo attack or use Send Test.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-mono"><th className="py-2">Time</th><th>Incident</th><th>Priority</th><th>Channel</th><th>Status</th><th>Recipient</th><th>Details</th></tr></thead><tbody>{history.map(n=><tr key={n.id} className="border-b border-slate-900 text-xs"><td className="py-3 font-mono text-slate-500">{new Date(n.createdAt).toLocaleString()}</td><td className="font-mono text-cyan-300">{n.incidentId}</td><td><Badge value={n.priority} size="sm"/></td><td className="font-mono text-slate-300">{n.channel}</td><td>{statusBadge(n.status)}</td><td className="text-slate-300">{n.recipient || '—'}</td><td className="text-slate-400 max-w-sm">{n.details}</td></tr>)}</tbody></table></div>}
      </Card>
    </>}
  </Layout>;
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Radio,
  Cpu,
  X,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useThreatData } from '../../store/ThreatStore';

export const Header: React.FC = () => {
  const { alerts: mockAlerts } = useThreatData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const filteredAlerts = searchQuery.trim()
    ? mockAlerts.filter(
        (a) =>
          a.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.srcIp.includes(searchQuery) ||
          a.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Search Input */}
      <div className="relative w-96">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search IP, host, incident ID, or event... (Ctrl+K)"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Popup Dropdown */}
        {showSearchResults && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 p-2 max-h-80 overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800 flex justify-between">
              <span>Matching Intelligence Results</span>
              <span>{filteredAlerts.length} found</span>
            </div>
            {filteredAlerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching indicators or alerts found for "{searchQuery}"
              </div>
            ) : (
              filteredAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setShowSearchResults(false);
                    navigate(alert.correlationId ? `/incidents/${alert.correlationId}` : '/alerts');
                  }}
                  className="p-2.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-200">{alert.id}</span>
                    <span className="mx-2 text-slate-500">•</span>
                    <span className="text-slate-300">{alert.event}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Host: {alert.host} | IP: {alert.srcIp}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Actions & Status Pills */}
      <div className="flex items-center space-x-4">
        {/* Status Pills */}
        <div className="hidden lg:flex items-center space-x-2 text-xs">
          <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center space-x-1.5 text-slate-300">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Feeds: 4/4 Active</span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center space-x-1.5 text-slate-300">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>IBM Bob AI: Operational</span>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-950">
              4
            </span>
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200">Critical Threat Notifications</span>
                <span className="text-[10px] text-cyan-400 font-mono">4 Unread</span>
              </div>
              <div className="space-y-2">
                <div
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/incidents/INC-042');
                  }}
                  className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/50 hover:bg-red-900/40 cursor-pointer text-xs transition-colors"
                >
                  <p className="font-semibold text-red-300">INC-042 Correlated</p>
                  <p className="text-[11px] text-slate-300">Coordinated Credential Compromise (94% confidence)</p>
                  <p className="text-[10px] text-slate-400 mt-1">2 mins ago</p>
                </div>

                <div
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/incidents/INC-038');
                  }}
                  className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 hover:bg-red-900/30 cursor-pointer text-xs transition-colors"
                >
                  <p className="font-semibold text-red-300">INC-038 Ransomware Alert</p>
                  <p className="text-[11px] text-slate-300">Mass file encryption detected on SRV-FILE-02</p>
                  <p className="text-[10px] text-slate-400 mt-1">18 mins ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Quick Dropdown */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-bold text-xs flex items-center justify-center">
            AV
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
};

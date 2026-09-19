import React from 'react';
import { X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Bell,
  AlertTriangle,
  Search,
  Grid,
  Bot,
  FileText,
  Settings,
  Activity,
  UserCheck,
  LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/threat-intelligence', label: 'Threat Intel', icon: Search },
  { path: '/mitre', label: 'MITRE ATT&CK', icon: Grid },
  { path: '/ai-investigation', label: 'Chat Bot', icon: Bot, isHero: true },
  { path: '/reports', label: 'Reports', icon: FileText },
  // { path: '/notifications', label: 'Incident Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <>
      {open && <button aria-label="Close navigation" onClick={onClose} className="mobile-sidebar-backdrop fixed inset-0 bg-black/60 z-40" />}
      <aside className={`sidebar w-64 bg-slate-950 border-r border-slate-800/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-50 ${open ? 'sidebar-open' : ''}`}>
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <button onClick={onClose} className="mobile-sidebar-close p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800" aria-label="Close navigation"><X className="w-4 h-4" /></button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-100 tracking-wider">ThreatForge</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono font-semibold border border-cyan-800/60">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block tracking-tight">
                IBM AI Innovation 2026
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                onClick={onClose}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 text-cyan-400 border border-slate-800/90 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.isHero && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                    AI
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: System status & User profile */}
      <div className="p-3 border-t border-slate-800/80 space-y-3 bg-slate-950/80">
        {/* Environment Banner */}
        <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-between">
          <span className="text-[11px] font-mono text-amber-300 tracking-wide font-medium">
            Demo Environment
          </span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </div>

        {/* Operational Status */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            <span className="text-xs font-medium text-slate-300">System Operational</span>
          </div>
          <Activity className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* User profile info */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">SOC Analyst</p>
              <p className="text-[10px] text-slate-400">Lead SOC Analyst</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
};

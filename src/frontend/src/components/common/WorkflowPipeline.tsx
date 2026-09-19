import React from 'react';
import {
  Layers,
  Sparkles,
  Zap,
  ShieldAlert,
  Sliders,
  Grid,
  Bot,
  Bell,
  FileText,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

const steps = [
  { id: '1', label: 'Multi-Source Feeds', icon: Layers, color: 'text-blue-400' },
  { id: '2', label: 'Alert Normalization', icon: Sliders, color: 'text-sky-400' },
  { id: '3', label: 'AI Correlation', icon: Sparkles, color: 'text-purple-400' },
  { id: '4', label: 'Incident Creation', icon: Zap, color: 'text-amber-400' },
  { id: '5', label: 'Threat Classification', icon: ShieldAlert, color: 'text-red-400' },
  { id: '6', label: 'Priority Scoring', icon: Sliders, color: 'text-orange-400' },
  { id: '7', label: 'MITRE Mapping', icon: Grid, color: 'text-emerald-400' },
  { id: '8', label: 'AI Investigation Assistant', icon: Bot, color: 'text-cyan-400' },
  { id: '9', label: 'BLUF Summary', icon: FileText, color: 'text-teal-400' },
  { id: '10', label: 'BLUF & Actions', icon: CheckCircle2, color: 'text-green-400' },
  { id: '11', label: 'Incident Notification', icon: Bell, color: 'text-pink-400' },
];

export const WorkflowPipeline: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg mb-6 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[900px] gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center space-x-2 group cursor-default">
                <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
                  <Icon className={`w-4 h-4 ${step.color}`} />
                </div>
                <div className="leading-tight">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Step 0{step.id}</span>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                    {step.label}
                  </span>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

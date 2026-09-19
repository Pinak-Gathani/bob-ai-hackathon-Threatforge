import React from 'react';
import type { Severity, IncidentStatus, AlertStatus, Classification } from '../../types';

interface BadgeProps {
  type?: 'severity' | 'status' | 'classification' | 'custom';
  value: Severity | IncidentStatus | AlertStatus | Classification | string;
  variant?: 'solid' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  value,
  size = 'md',
  className = '',
}) => {
  const getColors = () => {
    const val = String(value).toUpperCase();

    // Severity mapping
    if (val === 'CRITICAL') {
      return 'bg-red-950/70 text-red-400 border-red-800/60 soc-glow-red';
    }
    if (val === 'HIGH') {
      return 'bg-amber-950/70 text-orange-400 border-orange-800/60';
    }
    if (val === 'MEDIUM') {
      return 'bg-yellow-950/60 text-yellow-400 border-yellow-800/50';
    }
    if (val === 'LOW') {
      return 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50';
    }
    if (val === 'INFORMATIONAL' || val === 'INFO') {
      return 'bg-blue-950/50 text-blue-400 border-blue-800/50';
    }

    // Classification mapping
    if (val === 'GENUINE_THREAT' || val === 'GENUINE THREAT') {
      return 'bg-red-950/80 text-red-300 border-red-700/80';
    }
    if (val === 'LIKELY_FALSE_POSITIVE' || val === 'FALSE POSITIVE' || val === 'FALSE_POSITIVE') {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80';
    }
    if (val === 'INVESTIGATING' || val === 'UNDER_INVESTIGATION') {
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80 soc-glow-cyan';
    }

    // Status mapping
    if (val === 'NEW') {
      return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
    }
    if (val === 'MONITORING') {
      return 'bg-sky-950/70 text-sky-300 border-sky-800/60';
    }
    if (val === 'RESOLVED') {
      return 'bg-slate-800/70 text-slate-400 border-slate-700/60';
    }
    if (val === 'CORRELATED') {
      return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
    }

    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const formattedValue = String(value).replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center tracking-wide uppercase rounded-md border ${getColors()} ${sizeClasses[size]} ${className}`}
    >
      {formattedValue}
    </span>
  );
};

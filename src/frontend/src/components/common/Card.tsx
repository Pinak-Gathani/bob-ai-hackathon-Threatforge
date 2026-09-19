import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glow?: 'none' | 'red' | 'cyan' | 'amber';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  hoverEffect = false,
  glow = 'none',
}) => {
  const glowClasses = {
    none: '',
    red: 'soc-glow-red border-red-900/40',
    cyan: 'soc-glow-cyan border-cyan-900/40',
    amber: 'soc-glow-amber border-amber-900/40',
  };

  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-sm border border-slate-800/80 rounded-xl p-5 shadow-lg transition-all duration-200 ${
        hoverEffect ? 'hover:border-slate-700 hover:shadow-cyan-950/20' : ''
      } ${glowClasses[glow]} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-slate-100 tracking-wide">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

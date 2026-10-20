import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: 'sky' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'sky',
  onClick,
}) => {
  const colorConfigs = {
    sky: {
      icon: 'bg-sky-500/15 text-sky-400 border-sky-500/30 shadow-sky-500/10',
      glow: 'hover:border-sky-500/40 hover:shadow-sky-500/5',
      accent: 'text-sky-400',
    },
    emerald: {
      icon: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10',
      glow: 'hover:border-emerald-500/40 hover:shadow-emerald-500/5',
      accent: 'text-emerald-400',
    },
    amber: {
      icon: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-500/10',
      glow: 'hover:border-amber-500/40 hover:shadow-amber-500/5',
      accent: 'text-amber-400',
    },
    rose: {
      icon: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-rose-500/10',
      glow: 'hover:border-rose-500/40 hover:shadow-rose-500/5',
      accent: 'text-rose-400',
    },
    purple: {
      icon: 'bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-purple-500/10',
      glow: 'hover:border-purple-500/40 hover:shadow-purple-500/5',
      accent: 'text-purple-400',
    },
    slate: {
      icon: 'bg-slate-800 text-slate-300 border-slate-700 shadow-slate-900/10',
      glow: 'hover:border-slate-600',
      accent: 'text-slate-300',
    },
  };

  const currentTheme = colorConfigs[color];

  return (
    <div
      onClick={onClick}
      className={`relative group bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 shadow-xl transition-all duration-300 overflow-hidden ${
        currentTheme.glow
      } ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      {/* Top subtle highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-3xl font-extrabold tracking-tight text-white mt-1 font-sans">{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-105 ${currentTheme.icon}`}
        >
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400 pt-2.5 border-t border-slate-800/80">
          <span className="truncate max-w-[200px]">{subtitle}</span>
          {trend && (
            <span
              className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                trend.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

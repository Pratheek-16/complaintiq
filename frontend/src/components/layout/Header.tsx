import React from 'react';
import { Activity, ShieldCheck, Database, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeModelName?: string;
  totalComplaints?: number;
}

export const Header: React.FC<HeaderProps> = ({ activeModelName = 'Logistic Regression (Active)', totalComplaints = 0 }) => {
  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Active Model Pill */}
        <div className="flex items-center gap-2 text-xs bg-slate-900/90 hover:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 shadow-inner transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span className="text-slate-400 font-medium">Serving Model:</span>
          <span className="font-semibold text-sky-400 tracking-tight">{activeModelName}</span>
        </div>

        {/* Database Record Count */}
        {totalComplaints > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800/60">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Repository:</span>
            <span className="font-bold text-slate-200 font-mono">{totalComplaints.toLocaleString()}</span>
            <span className="text-slate-400">records</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pipeline Calibrated</span>
        </div>
      </div>
    </header>
  );
};

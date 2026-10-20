import React from 'react';
import { Bell, ShieldCheck, Activity } from 'lucide-react';

interface HeaderProps {
  activeModelName?: string;
  totalComplaints?: number;
}

export const Header: React.FC<HeaderProps> = ({ activeModelName = 'Logistic Regression (Active)', totalComplaints = 0 }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <Activity className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
          <span>Active ML Model:</span>
          <span className="font-semibold text-slate-800">{activeModelName}</span>
        </div>
        {totalComplaints > 0 && (
          <span className="text-xs text-slate-500 font-medium">
            <strong className="text-slate-700">{totalComplaints.toLocaleString()}</strong> records in repository
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pipeline Calibrated</span>
        </div>
      </div>
    </header>
  );
};

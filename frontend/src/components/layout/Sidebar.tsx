import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  BrainCircuit,
  Search,
  Sparkles,
  TrendingUp,
  FolderGit2,
  Cpu,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Management', href: '/datasets', icon: Database },
  { name: 'AI Analyzer', href: '/analyzer', icon: BrainCircuit },
  { name: 'Complaint Explorer', href: '/complaints', icon: Search },
  { name: 'Theme Discovery', href: '/topics', icon: Sparkles },
  { name: 'Issue Intelligence', href: '/issue-intelligence', icon: TrendingUp },
  { name: 'Investigation Center', href: '/investigations', icon: FolderGit2 },
  { name: 'Model Laboratory', href: '/model-lab', icon: Cpu },
  { name: 'Reports & Export', href: '/reports', icon: FileSpreadsheet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-sm">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            Complaint<span className="text-sky-400">IQ</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block -mt-1">
            Mining & Root-Cause ML
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Workspaces
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-300">ComplaintIQ v1.0</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            System Ready
          </span>
        </div>
      </div>
    </aside>
  );
};

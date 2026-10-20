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
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Management', href: '/datasets', icon: Database },
  { name: 'AI Analyzer', href: '/analyzer', icon: BrainCircuit, badge: 'Live' },
  { name: 'Complaint Explorer', href: '/complaints', icon: Search },
  { name: 'Theme Discovery', href: '/topics', icon: Sparkles, badge: 'NMF' },
  { name: 'Issue Intelligence', href: '/issue-intelligence', icon: TrendingUp },
  { name: 'Investigation Center', href: '/investigations', icon: FolderGit2 },
  { name: 'Model Laboratory', href: '/model-lab', icon: Cpu, badge: 'ML' },
  { name: 'Reports & Export', href: '/reports', icon: FileSpreadsheet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950 animate-pulse" />
        </div>
        <div>
          <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1">
            Complaint<span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">IQ</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block -mt-1">
            Mining & Root-Cause ML
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Analytics Workspaces
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-600/30 to-blue-600/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                        isActive
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-sky-400 to-blue-500 rounded-r-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 text-xs">
        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              ComplaintIQ v1.0
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Online
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400">
            B.Tech CSE Data Science Project
          </p>
        </div>
      </div>
    </aside>
  );
};

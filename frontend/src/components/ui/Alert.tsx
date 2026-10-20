import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className = '',
}) => {
  const configs = {
    info: {
      bg: 'bg-sky-950/40 border-sky-800/60 text-sky-200 shadow-[0_0_15px_rgba(14,165,233,0.08)]',
      icon: <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.08)]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-800/60 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.08)]',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-rose-950/40 border-rose-800/60 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.08)]',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />,
    },
  };

  const { bg, icon } = configs[type];

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md flex items-start gap-3 text-sm ${bg} ${className}`}>
      {icon}
      <div className="flex-1">
        {title && <h5 className="font-semibold text-sm mb-0.5 text-slate-100">{title}</h5>}
        <div className="text-xs leading-relaxed text-slate-300">{children}</div>
      </div>
    </div>
  );
};

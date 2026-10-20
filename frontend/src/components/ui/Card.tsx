import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-xl overflow-hidden transition-all ${className}`}
    >
      {(title || actions) && (
        <div className="px-6 py-4.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6 text-slate-200">{children}</div>
    </div>
  );
};

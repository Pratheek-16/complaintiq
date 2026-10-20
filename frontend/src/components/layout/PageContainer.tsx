import React from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  actions,
  children,
}) => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
};

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
}) => {
  const variants = {
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/80',
    sky: 'bg-sky-950/70 text-sky-300 border-sky-700/60 shadow-[0_0_8px_rgba(14,165,233,0.15)]',
    emerald: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
    amber: 'bg-amber-950/70 text-amber-300 border-amber-700/60 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
    rose: 'bg-rose-950/70 text-rose-300 border-rose-700/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-700/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border backdrop-blur-xs transition-all ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};

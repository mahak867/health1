import React from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: 'orange' | 'blue' | 'violet' | 'green' | 'rose' | 'teal' | 'none';
  solid?: boolean;
}

const ACCENT_BORDER: Record<string, string> = {
  orange: 'border-t-[#fc4c02]/80',
  blue:   'border-t-blue-500/70',
  violet: 'border-t-violet-500/70',
  green:  'border-t-emerald-500/70',
  rose:   'border-t-rose-500/70',
  teal:   'border-t-teal-500/70',
  none:   'border-t-transparent',
};

export default function Card({ title, children, className = '', accent = 'none', solid = false }: Props) {
  const base = solid ? 'card-solid' : 'glass';
  return (
    <article className={`rounded-2xl ${base} p-5 border-t-2 ${ACCENT_BORDER[accent]} ${className}`}>
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-sm ${accent !== 'none' ? `bg-${accent === 'orange' ? '[#fc4c02]' : accent + '-500'}` : 'bg-slate-600'} opacity-80`} />
        {title}
      </h2>
      {children}
    </article>
  );
}

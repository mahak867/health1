import React from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: 'orange' | 'blue' | 'violet' | 'green' | 'rose' | 'teal' | 'none';
}

const ACCENT_BORDER: Record<string, string> = {
  orange: 'border-t-orange-500/60',
  blue:   'border-t-blue-500/60',
  violet: 'border-t-violet-500/60',
  green:  'border-t-emerald-500/60',
  rose:   'border-t-rose-500/60',
  teal:   'border-t-teal-500/60',
  none:   'border-t-transparent',
};

export default function Card({ title, children, className = '', accent = 'none' }: Props) {
  return (
    <article className={`rounded-2xl glass p-5 border-t-2 ${ACCENT_BORDER[accent]} ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">{title}</h2>
      {children}
    </article>
  );
}

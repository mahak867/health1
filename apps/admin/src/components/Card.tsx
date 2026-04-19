import React from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '' }: Props) {
  return (
    <article className={`rounded-xl border border-slate-800 bg-slate-900 p-4 ${className}`}>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </article>
  );
}

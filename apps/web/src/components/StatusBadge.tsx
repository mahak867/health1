import React from 'react';

const STYLES: Record<string, string> = {
  scheduled:  'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  completed:  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  cancelled:  'bg-red-500/20 text-red-300 border border-red-500/30',
  queued:     'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  processing: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  failed:     'bg-red-500/20 text-red-300 border border-red-500/30',
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
  return (
    <span className={`${style} text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide`}>{status}</span>
  );
}

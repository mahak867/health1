import React from 'react';

const COLORS: Record<string, string> = {
  scheduled: 'bg-blue-700',
  completed: 'bg-emerald-700',
  cancelled: 'bg-red-700',
  queued: 'bg-yellow-700',
  processing: 'bg-blue-700',
  failed: 'bg-red-700'
};

export default function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? 'bg-slate-700';
  return (
    <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full`}>{status}</span>
  );
}

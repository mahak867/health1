import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';
import type { AuthUser } from '../lib/auth';

interface Props { user: AuthUser; onNavigate: (p: string) => void; }

interface Stats {
  users: { total: number; new_last_30d: number };
  appointments: { today: number };
  reports_queued: number;
  audit_events_last_24h: number;
}

export default function OverviewPage({ user, onNavigate }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<{ stats: Stats }>('/admin/stats')
      .then((r) => setStats(r.stats))
      .catch(() => {});
  }, []);

  const metrics = [
    { label: 'Total Users',           value: stats ? String(stats.users.total)               : '—', color: 'bg-blue-900/40 border-blue-700' },
    { label: 'Appointments Today',    value: stats ? String(stats.appointments.today)         : '—', color: 'bg-teal-900/40 border-teal-700' },
    { label: 'Reports Queued',        value: stats ? String(stats.reports_queued)             : '—', color: 'bg-yellow-900/40 border-yellow-700' },
    { label: 'Audit Events (24 h)',   value: stats ? String(stats.audit_events_last_24h)      : '—', color: 'bg-rose-900/40 border-rose-700' }
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <p className="text-sm text-slate-400">Welcome, <strong>{user.full_name}</strong></p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-xl border p-4 ${m.color}`}>
            <p className="text-sm text-slate-400">{m.label}</p>
            <p className="text-3xl font-bold mt-1">{m.value}</p>
          </div>
        ))}
      </div>
      {stats && (
        <p className="text-xs text-slate-500">
          {stats.users.new_last_30d} new users in the last 30 days
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[['Users', 'Users'], ['Providers', 'Providers'], ['Audit Log', 'Audit Log']].map(([label, page]) => (
          <button key={label} onClick={() => onNavigate(page)}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:bg-slate-800">
            <p className="font-semibold">{label}</p>
            <p className="text-sm text-slate-400 mt-1">Manage →</p>
          </button>
        ))}
      </div>
    </div>
  );
}

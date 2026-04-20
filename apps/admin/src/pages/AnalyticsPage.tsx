import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface VitalWeek { week_start: string; avg_heart_rate: number; avg_systolic_bp: number; avg_diastolic_bp: number; avg_spo2: number; readings: number; }
interface MuscleVolume { muscle_group: string; total_sets: number; workouts: number; active_users: number; }
interface NutritionDay { day: string; users_logged: number; avg_calories: number; avg_protein_g: number; avg_carbs_g: number; avg_fat_g: number; }
interface ApptUtil { provider_role: string; total: number; completed: number; cancelled: number; no_show: number; completion_rate_pct: number; }

interface Analytics {
  vitalsTrends: VitalWeek[];
  workoutVolume: MuscleVolume[];
  nutritionCompliance: NutritionDay[];
  appointmentUtilization: ApptUtil[];
}

function TableSection<T extends object>({ title, desc, rows, cols }: {
  title: string; desc: string; rows: T[]; cols: (keyof T)[];
}) {
  return (
    <Card title={title}>
      <p className="text-sm text-slate-400 mb-3">{desc}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                {cols.map((c) => <th key={String(c)} className="pb-1 pr-3">{String(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b border-slate-800/40">
                  {cols.map((c) => (
                    <td key={String(c)} className="py-1 pr-3 text-slate-300">
                      {String(row[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && <p className="text-xs text-slate-500 mt-1">Showing 10 of {rows.length}</p>}
        </div>
      )}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ analytics: Analytics }>('/admin/analytics')
      .then((r) => setData(r.analytics))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="text-sm text-slate-400">Platform-wide insights and health metrics.</p>
      {error && <p className="text-yellow-400 text-sm">{error}</p>}
      {!data ? (
        <p className="text-sm text-slate-500">Loading analytics…</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <TableSection
            title="Vitals Trends"
            desc="Weekly platform averages (last 8 weeks)"
            rows={data.vitalsTrends}
            cols={['week_start', 'avg_heart_rate', 'avg_systolic_bp', 'avg_spo2', 'readings']}
          />
          <TableSection
            title="Workout Volume"
            desc="Top muscle groups by total sets (last 4 weeks)"
            rows={data.workoutVolume}
            cols={['muscle_group', 'total_sets', 'workouts', 'active_users']}
          />
          <TableSection
            title="Nutrition Compliance"
            desc="Daily average macros (last 30 days)"
            rows={data.nutritionCompliance}
            cols={['day', 'users_logged', 'avg_calories', 'avg_protein_g', 'avg_carbs_g']}
          />
          <TableSection
            title="Appointment Utilization"
            desc="By provider role — all time"
            rows={data.appointmentUtilization}
            cols={['provider_role', 'total', 'completed', 'cancelled', 'completion_rate_pct']}
          />
        </div>
      )}
    </div>
  );
}

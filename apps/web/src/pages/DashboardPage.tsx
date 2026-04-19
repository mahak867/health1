import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';
import type { AuthUser } from '../lib/auth';

interface Props { user: AuthUser; onNavigate: (p: string) => void; }

export default function DashboardPage({ user, onNavigate }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [mode, setMode] = useState<any>(null);
  const [latestVital, setLatestVital] = useState<any>(null);

  useEffect(() => {
    api.get<{ profile: any }>('/health/profile').then((r) => setProfile(r.profile)).catch(() => {});
    api.get<{ mode: any }>('/modes/my').then((r) => setMode(r.mode)).catch(() => {});
    api.get<{ vitals: any[] }>('/health/vitals?limit=1').then((r) => setLatestVital(r.vitals[0] ?? null)).catch(() => {});
  }, []);

  const roleCards: Record<string, { label: string; page: string; color: string }[]> = {
    user: [
      { label: 'Log Vitals', page: 'Vitals', color: 'bg-blue-800' },
      { label: 'Track Workout', page: 'Workouts', color: 'bg-purple-800' },
      { label: 'Log Meal', page: 'Meals', color: 'bg-orange-800' },
      { label: 'Book Appointment', page: 'Telemedicine', color: 'bg-teal-800' }
    ],
    doctor: [
      { label: 'Appointments', page: 'Telemedicine', color: 'bg-teal-800' },
      { label: 'Patient Vitals', page: 'Vitals', color: 'bg-blue-800' }
    ],
    trainer: [
      { label: 'Workouts', page: 'Workouts', color: 'bg-purple-800' },
      { label: 'Appointments', page: 'Telemedicine', color: 'bg-teal-800' }
    ],
    nutritionist: [
      { label: 'Meal Logs', page: 'Meals', color: 'bg-orange-800' },
      { label: 'Appointments', page: 'Telemedicine', color: 'bg-teal-800' }
    ]
  };

  const quickActions = roleCards[user.role] ?? roleCards['user'];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user.full_name} 👋</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <button key={action.label} onClick={() => onNavigate(action.page)}
            className={`${action.color} rounded-xl p-4 text-left hover:opacity-90`}>
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="text-xs text-slate-300 mt-1">Tap to open →</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Health Profile">
          {profile ? (
            <ul className="text-sm text-slate-300 space-y-1">
              <li>Age: {profile.age ?? '—'}</li>
              <li>Height: {profile.height_cm ? `${profile.height_cm} cm` : '—'}</li>
              <li>Weight: {profile.weight_kg ? `${profile.weight_kg} kg` : '—'}</li>
              <li>Blood: {profile.blood_group ?? '—'}</li>
            </ul>
          ) : <p className="text-sm text-slate-500">No profile yet.</p>}
        </Card>
        <Card title="Latest Vital">
          {latestVital ? (
            <ul className="text-sm text-slate-300 space-y-1">
              <li>HR: {latestVital.heart_rate ?? '—'} bpm</li>
              <li>BP: {latestVital.systolic_bp}/{latestVital.diastolic_bp}</li>
              <li>SpO2: {latestVital.spo2 ?? '—'}%</li>
              <li>Sleep: {latestVital.sleep_hours ?? '—'} h</li>
            </ul>
          ) : <p className="text-sm text-slate-500">No vitals logged.</p>}
        </Card>
        <Card title="Active Mode">
          {mode ? (
            <ul className="text-sm text-slate-300 space-y-1">
              <li>Mode: <span className="font-medium capitalize">{mode.mode}</span></li>
              <li>Calories: {mode.targets?.targetCalories ?? '—'} kcal</li>
              <li>Protein: {mode.targets?.proteinGrams ?? '—'} g</li>
            </ul>
          ) : <p className="text-sm text-slate-500">No mode set.</p>}
        </Card>
      </div>
    </div>
  );
}

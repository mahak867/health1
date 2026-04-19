import React, { useEffect, useState } from 'react';
import Ring from '../components/Ring';
import { api } from '../lib/api';
import type { AuthUser } from '../lib/auth';

interface Props { user: AuthUser; onNavigate: (p: string) => void; }

const QUICK_ACTIONS: Record<string, { label: string; page: string; icon: string; grad: string; glow: string }[]> = {
  user: [
    { label: 'Log Vitals',        page: 'Vitals',       icon: '💓', grad: 'gradient-rose',   glow: 'glow-rose'   },
    { label: 'Track Workout',     page: 'Workouts',     icon: '🏋️', grad: 'gradient-violet', glow: 'glow-violet' },
    { label: 'Log Meal',          page: 'Meals',        icon: '🥗', grad: 'gradient-orange', glow: 'glow-orange' },
    { label: 'Book Appointment',  page: 'Telemedicine', icon: '🩺', grad: 'gradient-teal',   glow: 'glow-green'  },
  ],
  doctor: [
    { label: 'Appointments', page: 'Telemedicine', icon: '🩺', grad: 'gradient-teal',   glow: 'glow-green'  },
    { label: 'Patient Vitals', page: 'Vitals',    icon: '💓', grad: 'gradient-rose',   glow: 'glow-rose'   },
  ],
  trainer: [
    { label: 'Workouts',     page: 'Workouts',     icon: '🏋️', grad: 'gradient-violet', glow: 'glow-violet' },
    { label: 'Appointments', page: 'Telemedicine', icon: '🩺', grad: 'gradient-teal',   glow: 'glow-green'  },
  ],
  nutritionist: [
    { label: 'Meal Logs',    page: 'Meals',        icon: '🥗', grad: 'gradient-orange', glow: 'glow-orange' },
    { label: 'Appointments', page: 'Telemedicine', icon: '🩺', grad: 'gradient-teal',   glow: 'glow-green'  },
  ],
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage({ user, onNavigate }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [mode, setMode] = useState<any>(null);
  const [latestVital, setLatestVital] = useState<any>(null);

  useEffect(() => {
    api.get<{ profile: any }>('/health/profile').then((r) => setProfile(r.profile)).catch(() => {});
    api.get<{ mode: any }>('/modes/my').then((r) => setMode(r.mode)).catch(() => {});
    api.get<{ vitals: any[] }>('/health/vitals?limit=1').then((r) => setLatestVital(r.vitals[0] ?? null)).catch(() => {});
  }, []);

  const quickActions = QUICK_ACTIONS[user.role] ?? QUICK_ACTIONS['user'];

  // Compute ring percentages from vitals/mode data
  const hrPct = latestVital?.heart_rate ? Math.min((latestVital.heart_rate / 200) * 100, 100) : 0;
  const spo2Pct = latestVital?.spo2 ?? 0;
  const sleepPct = latestVital?.sleep_hours ? Math.min((latestVital.sleep_hours / 9) * 100, 100) : 0;
  const calTarget = mode?.targets?.targetCalories ?? 2000;
  const calBurned = latestVital?.calories_burned ?? 0;
  const calPct = Math.min((calBurned / calTarget) * 100, 100);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">

      {/* Hero greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-2">
        <div>
          <p className="text-slate-400 text-sm font-medium">{greeting()},</p>
          <h1 className="text-4xl font-black text-white leading-tight">{user.full_name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="sm:ml-auto">
          <span className="inline-block px-4 py-1.5 rounded-full glass text-xs font-semibold text-slate-300 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      {/* Google Fit-style activity rings */}
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">Today's Activity Rings</p>
        <div className="flex flex-wrap justify-around gap-6">
          <Ring value={calPct} color="#ff6200" trackColor="#2a1500" size={96} strokeWidth={9}
            label={`${calBurned} kcal`} sublabel="Calories burned">
            <span className="text-2xl">🔥</span>
          </Ring>
          <Ring value={hrPct} color="#e11d48" trackColor="#2a0012" size={96} strokeWidth={9}
            label={latestVital?.heart_rate ? `${latestVital.heart_rate} bpm` : '—'} sublabel="Heart rate">
            <span className="text-2xl">💓</span>
          </Ring>
          <Ring value={spo2Pct} color="#2563eb" trackColor="#00103a" size={96} strokeWidth={9}
            label={latestVital?.spo2 ? `${latestVital.spo2}%` : '—'} sublabel="SpO2">
            <span className="text-2xl">🫁</span>
          </Ring>
          <Ring value={sleepPct} color="#7c3aed" trackColor="#0e0022" size={96} strokeWidth={9}
            label={latestVital?.sleep_hours ? `${latestVital.sleep_hours}h` : '—'} sublabel="Sleep">
            <span className="text-2xl">🌙</span>
          </Ring>
        </div>
      </div>

      {/* Quick action tiles — Strava inspired */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Quick Actions</p>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <button key={a.label} onClick={() => onNavigate(a.page)}
              className={`${a.grad} ${a.glow} rounded-2xl p-5 text-left transition-all hover:scale-[1.03] active:scale-[0.97]`}>
              <span className="text-3xl block mb-3">{a.icon}</span>
              <p className="text-white font-bold text-sm leading-tight">{a.label}</p>
              <p className="text-white/60 text-xs mt-1">Tap to open →</p>
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Health Profile */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🧬</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Health Profile</p>
          </div>
          {profile ? (
            <div className="space-y-2">
              {[
                ['Age',    profile.age,         ''],
                ['Height', profile.height_cm,   ' cm'],
                ['Weight', profile.weight_kg,   ' kg'],
                ['Blood',  profile.blood_group, ''],
              ].map(([label, val, unit]) => (
                <div key={label as string} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-bold text-white">{val ? `${val}${unit}` : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No profile yet — <button className="text-emerald-400 hover:underline" onClick={() => onNavigate('Profile')}>set up →</button></p>
          )}
        </div>

        {/* Latest Vital */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📊</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Latest Vital</p>
          </div>
          {latestVital ? (
            <div className="space-y-2">
              {[
                ['Heart Rate', latestVital.heart_rate, ' bpm', '#e11d48'],
                ['BP',         latestVital.systolic_bp ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp}` : null, ' mmHg', '#2563eb'],
                ['SpO2',       latestVital.spo2,   '%',  '#7c3aed'],
                ['Sleep',      latestVital.sleep_hours, 'h', '#0d9488'],
              ].map(([label, val, unit, color]) => (
                <div key={label as string} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-bold" style={{ color: color as string }}>{val != null ? `${val}${unit}` : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No vitals yet — <button className="text-rose-400 hover:underline" onClick={() => onNavigate('Vitals')}>log now →</button></p>
          )}
        </div>

        {/* Training Mode */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎯</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Training Mode</p>
          </div>
          {mode ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Mode</span>
                <span className="text-sm font-black text-gradient-violet capitalize">{mode.mode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Calories</span>
                <span className="text-sm font-bold text-orange-400">{mode.targets?.targetCalories ?? '—'} kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Protein</span>
                <span className="text-sm font-bold text-blue-400">{mode.targets?.proteinGrams ?? '—'} g</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No mode set — <button className="text-violet-400 hover:underline" onClick={() => onNavigate('Profile')}>configure →</button></p>
          )}
        </div>
      </div>
    </div>
  );
}

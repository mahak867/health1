import React, { useEffect, useState } from 'react';
import Ring from '../components/Ring';
import WorkoutHeatmap from '../components/WorkoutHeatmap';
import { api } from '../lib/api';
import { subscribe } from '../lib/ws';
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
  const [xp, setXp] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [waterToday, setWaterToday] = useState(0);
  const [nutritionToday, setNutritionToday] = useState<any>(null);

  function loadNutrition() {
    api.get<any>('/nutrition/daily-summary').then(setNutritionToday).catch(() => {});
  }
  function loadWater() {
    api.get<{ totalMl: number }>('/health/water').then((r) => setWaterToday(r.totalMl)).catch(() => {});
  }
  function loadVitals() {
    api.get<{ vitals: any[] }>('/health/vitals?limit=1').then((r) => setLatestVital(r.vitals[0] ?? null)).catch(() => {});
  }
  function loadHeatmap() {
    api.get<{ heatmap: { day: string; count: string }[] }>('/fitness/workouts/heatmap').then((r) => {
      const map: Record<string, number> = {};
      r.heatmap.forEach((row) => { map[row.day] = Number(row.count); });
      setHeatmap(map);
    }).catch(() => {});
  }

  // Initial data load
  useEffect(() => {
    api.get<{ profile: any }>('/health/profile').then((r) => setProfile(r.profile)).catch(() => {});
    api.get<{ mode: any }>('/modes/my').then((r) => setMode(r.mode)).catch(() => {});
    loadVitals();
    api.get<any>('/gamification/xp').then(setXp).catch(() => {});
    api.get<{ challenges: any[] }>('/gamification/challenges').then((r) => setChallenges(r.challenges)).catch(() => {});
    loadHeatmap();
    api.get<any>('/gamification/weekly-summary').then(setWeeklySummary).catch(() => {});
    loadWater();
    loadNutrition();
  }, []);

  // Live updates via WebSocket — keeps all dashboard cards fresh in real time
  useEffect(() => {
    const unsubs = [
      subscribe('nutrition', () => { loadNutrition(); loadWater(); }),
      subscribe('fitness',   () => { loadHeatmap(); api.get<any>('/gamification/weekly-summary').then(setWeeklySummary).catch(() => {}); }),
      subscribe('vitals',    () => { loadVitals(); }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  const quickActions = QUICK_ACTIONS[user.role] ?? QUICK_ACTIONS['user'];

  // Compute ring percentages from vitals/mode data
  const hrPct    = latestVital?.heart_rate ? Math.min((latestVital.heart_rate / 200) * 100, 100) : 0;
  const spo2Pct  = latestVital?.spo2 ?? 0;
  const sleepPct = latestVital?.sleep_hours ? Math.min((latestVital.sleep_hours / 9) * 100, 100) : 0;
  const calTarget  = mode?.targets?.targetCalories ?? 2000;
  const calBurned  = latestVital?.calories_burned ?? 0;
  const calPct     = Math.min((calBurned / calTarget) * 100, 100);
  // Nutrition ring: calories consumed today vs target
  const calEaten   = Number(nutritionToday?.nutrition?.total_calories ?? 0);
  const calEatenPct = Math.min((calEaten / calTarget) * 100, 100);

  // ─── Oura-style composite Readiness Score (0-100) ─────────────────────────
  const readinessScore = (() => {
    if (!latestVital) return null;
    let score = 50; // baseline
    // Sleep (0-30pts)
    const sleep = latestVital.sleep_hours;
    if (sleep != null) {
      if (sleep >= 7 && sleep <= 9) score += 30;
      else if (sleep >= 6) score += 20;
      else if (sleep >= 5) score += 10;
    }
    // SpO2 (0-15pts)
    const spo2 = latestVital.spo2;
    if (spo2 != null) {
      if (spo2 >= 97) score += 15;
      else if (spo2 >= 95) score += 10;
      else if (spo2 >= 93) score += 5;
    }
    // Resting HR (0-15pts) — lower is better
    const hr = latestVital.heart_rate;
    if (hr != null) {
      if (hr < 55) score += 15;
      else if (hr < 65) score += 10;
      else if (hr < 80) score += 5;
    }
    // Stress (0-10pts penalty if high stress)
    const stress = latestVital.stress_level;
    if (stress != null) {
      if (stress <= 3) score += 10;
      else if (stress <= 6) score += 3;
      else score -= 5;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  })();
  const readinessColor = readinessScore == null ? '#6b7280'
    : readinessScore >= 75 ? '#22c55e'
    : readinessScore >= 50 ? '#f59e0b'
    : '#ef4444';
  const readinessLabel = readinessScore == null ? '—'
    : readinessScore >= 80 ? 'Peak'
    : readinessScore >= 70 ? 'Good'
    : readinessScore >= 55 ? 'Fair'
    : 'Low';

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
        <div className="sm:ml-auto flex items-center gap-3">
          {/* Oura-style Readiness Score */}
          {readinessScore !== null && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass border" style={{ borderColor: `${readinessColor}30` }}>
              <svg width={44} height={44} viewBox="0 0 44 44" className="shrink-0">
                <circle cx={22} cy={22} r={18} fill="none" stroke="#ffffff08" strokeWidth={6} />
                <circle cx={22} cy={22} r={18} fill="none" stroke={readinessColor} strokeWidth={6}
                  strokeDasharray={`${(readinessScore / 100) * 113.1} 113.1`}
                  transform="rotate(-90 22 22)" strokeLinecap="round" />
                <text x={22} y={26} textAnchor="middle" fill={readinessColor} fontSize="11" fontWeight="bold">{readinessScore}</text>
              </svg>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Readiness</p>
                <p className="text-sm font-black" style={{ color: readinessColor }}>{readinessLabel}</p>
              </div>
            </div>
          )}
          <span className="inline-block px-4 py-1.5 rounded-full glass text-xs font-semibold text-slate-300 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      {/* Google Fit-style activity rings */}
      <div className="card-solid rounded-2xl p-5 border border-white/10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2">
          <span className="inline-block w-3 h-[2px] bg-emerald-500 rounded-full" />
          Today's Activity Rings
        </p>
        <div className="flex flex-wrap justify-around gap-6">
          <Ring value={calPct} color="#ff6200" trackColor="#2a1500" size={96} strokeWidth={9}
            label={`${calBurned} kcal`} sublabel="Cal burned">
            <span className="text-2xl">🔥</span>
          </Ring>
          <Ring value={calEatenPct} color="#22c55e" trackColor="#0a2010" size={96} strokeWidth={9}
            label={`${calEaten} kcal`} sublabel="Cal eaten"
            onClick={() => onNavigate('Meals')}>
            <span className="text-2xl">🥗</span>
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

      {/* Quick action tiles — Strava-style solid boxy tiles */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <span className="inline-block w-3 h-[2px] bg-[#fc4c02] rounded-full" />
          Quick Actions
        </p>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <button key={a.label} onClick={() => onNavigate(a.page)}
              className={`${a.grad} ${a.glow} rounded-xl p-5 text-left transition-all hover:scale-[1.03] active:scale-[0.97] border border-white/10`}>
              <span className="text-3xl block mb-3">{a.icon}</span>
              <p className="text-white font-black text-sm leading-tight">{a.label}</p>
              <p className="text-white/60 text-xs mt-1.5 font-medium">Tap to open →</p>
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards — MFP-style structured data rows */}
      {/* XP Level bar + Daily challenges */}
      {xp && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* XP / Level */}
          <div className="card-solid rounded-2xl p-5 border border-white/10 cursor-pointer hover:border-green-500/30 transition-colors"
            onClick={() => onNavigate('Gamification')}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">🎮 Level & XP</p>
              <span className="text-xs text-slate-500">view all →</span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-black text-green-400">{xp.level}</span>
              <div className="flex-1 mb-1">
                <p className="text-xs text-slate-400 mb-1">{xp.currentLevelXP} / {xp.nextLevelXP} XP</p>
                <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${xp.progress}%`, background: 'linear-gradient(90deg,#22c55e,#4ade80)' }} />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">{xp.totalXP.toLocaleString()} total XP · {xp.progress}% to Level {xp.level + 1}</p>
          </div>

          {/* Daily challenges */}
          <div className="card-solid rounded-2xl p-5 border border-white/10 cursor-pointer hover:border-yellow-500/30 transition-colors"
            onClick={() => onNavigate('Gamification')}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">🎯 Daily Challenges</p>
              <span className="text-xs text-slate-500">view all →</span>
            </div>
            <div className="space-y-2">
              {challenges.filter((c) => c.cadence === 'daily').slice(0, 3).map((c: any) => {
                const pct = Math.min((c.userProgress / c.goal) * 100, 100);
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-base">{c.completed ? '✅' : c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-semibold truncate ${c.completed ? 'text-green-400' : 'text-white'}`}>{c.title}</span>
                        <span className="text-yellow-400 font-bold shrink-0 ml-2">+{c.xp_reward}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.completed ? '#22c55e' : '#f59e0b' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Summary Widget */}
      {weeklySummary && (
        <div className="card-solid rounded-2xl p-5 border border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <span className="inline-block w-3 h-[2px] bg-blue-500 rounded-full" />
            This Week's Summary
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🏋️', label: 'Workouts', value: weeklySummary.workouts.count, color: '#a855f7' },
              { icon: '🔥', label: 'Cal Burned', value: `${weeklySummary.workouts.caloriesBurned?.toLocaleString() ?? 0}`, color: '#f97316' },
              { icon: '🏃', label: 'Km Run', value: `${Number(weeklySummary.activities.totalKm).toFixed(1)}`, color: '#22c55e' },
              { icon: '⚡', label: 'XP Gained', value: `+${weeklySummary.xpGained}`, color: '#facc15' },
              { icon: '🔥', label: 'Day Streak', value: weeklySummary.currentStreak ?? 0, color: '#fb923c' },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 glass rounded-xl">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ─── Strain Score Card (WHOOP-style) ─── */}
          {(() => {
            const workouts = weeklySummary.workouts?.count ?? 0;
            const calBurned = weeklySummary.workouts?.caloriesBurned ?? 0;
            const km = Number(weeklySummary.activities?.totalKm ?? 0);
            // Estimate daily strain 1-21 (simplified WHOOP model)
            const dailyStrain = Math.min(21, Math.max(0,
              (workouts * 2.5) + (calBurned / 500) + (km / 5)
            ));
            const strainColor = dailyStrain >= 14 ? '#ef4444' : dailyStrain >= 10 ? '#f97316' : dailyStrain >= 6 ? '#f59e0b' : '#22c55e';
            const strainLabel = dailyStrain >= 14 ? 'All Out' : dailyStrain >= 10 ? 'Strenuous' : dailyStrain >= 6 ? 'Moderate' : 'Light';
            const pct = (dailyStrain / 21) * 100;
            return (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">⚡ Weekly Strain</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full glass font-bold" style={{ color: strainColor }}>{strainLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-black" style={{ color: strainColor }}>{dailyStrain.toFixed(1)}</p>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: strainColor }} />
                    </div>
                    <p className="text-[9px] text-slate-600 mt-1">/ 21 max (WHOOP model)</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Workout Heatmap Calendar */}
      <div className="card-solid rounded-2xl p-5 border border-white/10">
        <WorkoutHeatmap data={heatmap} weeks={16} />
      </div>

      {/* Water Intake Progress */}
      <div className="card-solid rounded-2xl p-5 border border-white/10 cursor-pointer hover:border-cyan-500/30 transition-colors"
        onClick={() => onNavigate('Meals')}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">💧 Hydration Today</p>
          <span className="text-xs text-cyan-400 font-bold">{(waterToday / 1000).toFixed(2)} L</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min((waterToday / 2500) * 100, 100)}%`, background: 'linear-gradient(90deg,#06b6d4,#3b82f6)' }} />
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">{waterToday} ml / 2500 ml daily goal · tap Meals to log</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Health Profile */}
        <div className="card-solid rounded-2xl p-5 border border-white/10 border-t-2 border-t-emerald-500/70">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🧬</span>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Health Profile</p>
          </div>
          {profile ? (
            <div className="divide-y divide-white/5">
              {[
                ['Age',    profile.age,         ''],
                ['Height', profile.height_cm,   ' cm'],
                ['Weight', profile.weight_kg,   ' kg'],
                ['Blood',  profile.blood_group, ''],
              ].map(([label, val, unit]) => (
                <div key={label as string} className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-black text-white">{val ? `${val}${unit}` : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No profile yet — <button className="text-emerald-400 hover:underline" onClick={() => onNavigate('Profile')}>set up →</button></p>
          )}
        </div>

        {/* Latest Vital */}
        <div className="card-solid rounded-2xl p-5 border border-white/10 border-t-2 border-t-rose-500/70">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📊</span>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Latest Vital</p>
          </div>
          {latestVital ? (
            <div className="divide-y divide-white/5">
              {[
                ['Heart Rate', latestVital.heart_rate, ' bpm', '#e11d48'],
                ['BP',         latestVital.systolic_bp ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp}` : null, ' mmHg', '#2563eb'],
                ['SpO2',       latestVital.spo2,   '%',  '#7c3aed'],
                ['Sleep',      latestVital.sleep_hours, 'h', '#0d9488'],
              ].map(([label, val, unit, color]) => (
                <div key={label as string} className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-black" style={{ color: color as string }}>{val != null ? `${val}${unit}` : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No vitals yet — <button className="text-rose-400 hover:underline" onClick={() => onNavigate('Vitals')}>log now →</button></p>
          )}
        </div>

        {/* Training Mode */}
        <div className="card-solid rounded-2xl p-5 border border-white/10 border-t-2 border-t-violet-500/70">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎯</span>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Training Mode</p>
          </div>
          {mode ? (
            <div className="divide-y divide-white/5">
              <div className="flex justify-between items-center py-2 first:pt-0">
                <span className="text-xs text-slate-500">Mode</span>
                <span className="text-sm font-black text-gradient-violet capitalize">{mode.mode}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-slate-500">Calories</span>
                <span className="text-sm font-black text-orange-400">{mode.targets?.targetCalories ?? '—'} kcal</span>
              </div>
              <div className="flex justify-between items-center py-2 last:pb-0">
                <span className="text-xs text-slate-500">Protein</span>
                <span className="text-sm font-black text-blue-400">{mode.targets?.proteinGrams ?? '—'} g</span>
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

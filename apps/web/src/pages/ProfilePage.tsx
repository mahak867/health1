import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';
import type { AuthUser } from '../lib/auth';

interface Props { user: AuthUser; }

const emptyProfile = { age: '', heightCm: '', weightKg: '', bloodGroup: '', medicalConditions: '', allergies: '' };

const MODE_META: Record<string, { icon: string; desc: string; color: string }> = {
  cut:           { icon: '🔥', desc: 'Caloric deficit for fat loss',   color: 'gradient-orange' },
  bulk:          { icon: '💪', desc: 'Caloric surplus for muscle gain', color: 'gradient-violet' },
  maintenance:   { icon: '⚖️', desc: 'Maintain current weight',        color: 'gradient-green'  },
  recomposition: { icon: '🔄', desc: 'Lose fat while gaining muscle',  color: 'gradient-blue'   },
};

const ACTIVITY_LEVELS = [
  { key: 'sedentary',   label: 'Sedentary',      desc: 'Little/no exercise', multiplier: 1.2 },
  { key: 'light',       label: 'Lightly Active',  desc: '1-3 days/week',     multiplier: 1.375 },
  { key: 'moderate',    label: 'Moderately Active', desc: '3-5 days/week',   multiplier: 1.55 },
  { key: 'very',        label: 'Very Active',     desc: '6-7 days/week',     multiplier: 1.725 },
  { key: 'extra',       label: 'Athlete',         desc: 'Twice/day training', multiplier: 1.9 },
];

/** Mifflin-St Jeor BMR then multiply by activity factor */
function calcTDEE(age: number, heightCm: number, weightKg: number, sex: 'male'|'female', activityKey: string): number {
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const mult = ACTIVITY_LEVELS.find((l) => l.key === activityKey)?.multiplier ?? 1.55;
  return Math.round(bmr * mult);
}

export default function ProfilePage({ user }: Props) {
  const [form, setForm] = useState(emptyProfile);
  const [modeForm, setModeForm] = useState({ mode: 'maintenance', tdee: '2200', weightKg: '70' });
  const [currentMode, setCurrentMode] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [modeSaved, setModeSaved] = useState(false);
  const [error, setError] = useState('');
  const [badges, setBadges] = useState<any[]>([]);
  const [xp, setXp] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  // TDEE calculator state
  const [tdeeCalc, setTdeeCalc] = useState({ sex: 'male' as 'male'|'female', activityLevel: 'moderate' });
  const [tdeeResult, setTdeeResult] = useState<number | null>(null);
  // Emergency contacts state
  const [emergencyContacts, setEmergencyContacts] = useState<Array<{ name: string; phone: string; relation: string }>>([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });


  useEffect(() => {
    api.get<{ profile: any }>('/health/profile').then((r) => {
      if (r.profile) {
        setForm({
          age: r.profile.age ?? '', heightCm: r.profile.height_cm ?? '',
          weightKg: r.profile.weight_kg ?? '', bloodGroup: r.profile.blood_group ?? '',
          medicalConditions: (r.profile.medical_conditions ?? []).join(', '),
          allergies: (r.profile.allergies ?? []).join(', ')
        });
        if (r.profile.weight_kg) setModeForm((f) => ({ ...f, weightKg: r.profile.weight_kg }));
        if (r.profile.emergency_contacts) setEmergencyContacts(r.profile.emergency_contacts);
      }
    });
    api.get<{ mode: any }>('/modes/my').then((r) => setCurrentMode(r.mode));
    api.get<{ badges: any[] }>('/gamification/badges').then((r) => setBadges(r.badges.filter((b: any) => b.earned))).catch(() => {});
    api.get<any>('/gamification/xp').then(setXp).catch(() => {});
    api.get<any>('/health/stats').then(setStats).catch(() => {});
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const body: any = {};
      if (form.age)         body.age         = Number(form.age);
      if (form.heightCm)    body.heightCm    = Number(form.heightCm);
      if (form.weightKg)    body.weightKg    = Number(form.weightKg);
      if (form.bloodGroup)  body.bloodGroup  = form.bloodGroup;
      body.medicalConditions = form.medicalConditions.split(',').map((s) => s.trim()).filter(Boolean);
      body.allergies         = form.allergies.split(',').map((s) => s.trim()).filter(Boolean);
      body.emergencyContacts = emergencyContacts;
      await api.put('/health/profile', body);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
  }

  async function saveMode(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.put<{ mode: any }>('/modes/my', { mode: modeForm.mode, tdee: Number(modeForm.tdee), weightKg: Number(modeForm.weightKg) });
    setCurrentMode(res.mode); setModeSaved(true); setTimeout(() => setModeSaved(false), 2000);
  }

  function runTDEECalc() {
    const age = Number(form.age);
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    if (!age || !heightCm || !weightKg) return;
    const tdee = calcTDEE(age, heightCm, weightKg, tdeeCalc.sex, tdeeCalc.activityLevel);
    setTdeeResult(tdee);
    setModeForm((f) => ({ ...f, tdee: String(tdee), weightKg: String(weightKg) }));
  }

  const meta = MODE_META[modeForm.mode] ?? MODE_META['maintenance'];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <div className="glass rounded-2xl p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl gradient-green flex items-center justify-center shrink-0">
          <span className="text-3xl">👤</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">{user.full_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full glass text-slate-300 font-semibold capitalize">{user.role}</span>
            <span className="text-xs text-slate-500">{user.email}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Health profile form */}
        <Card title="Health Profile" accent="green">
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[['Age', 'age', 'number'], ['Height cm', 'heightCm', 'number'], ['Weight kg', 'weightKg', 'number']].map(([label, key, type]) => (
                <div key={key as string}>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block uppercase tracking-wide">{label}</label>
                  <input type={type as string}
                    className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 text-center font-bold"
                    value={(form as any)[key as string]}
                    onChange={(e) => setForm({...form, [key as string]: e.target.value})} />
                </div>
              ))}
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 mb-1 block uppercase tracking-wide">Blood Group</label>
              <input
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                placeholder="e.g. A+" value={form.bloodGroup}
                onChange={(e) => setForm({...form, bloodGroup: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 mb-1 block uppercase tracking-wide">Medical Conditions</label>
              <textarea
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                rows={2} placeholder="comma-separated (e.g. Diabetes, Hypertension)"
                value={form.medicalConditions} onChange={(e) => setForm({...form, medicalConditions: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 mb-1 block uppercase tracking-wide">Allergies</label>
              <textarea
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                rows={2} placeholder="comma-separated (e.g. Peanuts, Gluten)"
                value={form.allergies} onChange={(e) => setForm({...form, allergies: e.target.value})} />
            </div>
            <button type="submit"
              className="w-full py-2.5 rounded-xl gradient-green glow-green text-white text-sm font-bold hover:scale-[1.02] transition-transform">
              {saved ? '✓ Profile Saved' : 'Save Profile'}
            </button>
          </form>
        </Card>

        {/* Training mode */}
        <div className="space-y-4">
          {/* Current mode display */}
          {currentMode && (
            <div className={`rounded-2xl p-5 ${MODE_META[currentMode.mode]?.color ?? 'gradient-green'}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{MODE_META[currentMode.mode]?.icon ?? '🎯'}</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Active Mode</p>
                  <p className="text-xl font-black text-white capitalize">{currentMode.mode}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-white/60">Target Calories</p>
                  <p className="text-lg font-black text-white">{currentMode.targets?.targetCalories ?? '—'} <span className="text-xs font-normal opacity-70">kcal</span></p>
                </div>
                <div>
                  <p className="text-xs text-white/60">Protein Goal</p>
                  <p className="text-lg font-black text-white">{currentMode.targets?.proteinGrams ?? '—'} <span className="text-xs font-normal opacity-70">g</span></p>
                </div>
              </div>
            </div>
          )}

          <Card title="Set Training Mode" accent="violet">
            <form onSubmit={saveMode} className="space-y-3">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(MODE_META).map(([m, info]) => (
                  <button type="button" key={m}
                    onClick={() => setModeForm({...modeForm, mode: m})}
                    className={`p-3 rounded-xl text-left transition-all ${
                      modeForm.mode === m
                        ? `${info.color} shadow-lg`
                        : 'glass hover:bg-white/5'
                    }`}>
                    <span className="text-lg block">{info.icon}</span>
                    <p className="text-xs font-bold text-white capitalize mt-1">{m}</p>
                    <p className="text-[10px] text-white/60 mt-0.5 leading-tight">{info.desc}</p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">TDEE kcal/day</label>
                  <input type="number"
                    className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/40 text-center font-bold"
                    value={modeForm.tdee} onChange={(e) => setModeForm({...modeForm, tdee: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">Weight (kg)</label>
                  <input type="number"
                    className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/40 text-center font-bold"
                    value={modeForm.weightKg} onChange={(e) => setModeForm({...modeForm, weightKg: e.target.value})} />
                </div>
              </div>
              <button type="submit"
                className={`w-full py-2.5 rounded-xl ${meta.color} text-white text-sm font-bold hover:scale-[1.02] transition-transform`}>
                {modeSaved ? `✓ Mode Set to ${modeForm.mode}` : `${meta.icon} Set ${modeForm.mode} Mode`}
              </button>
            </form>
          </Card>
        </div>
      </div>

      {/* ─── TDEE Auto-Calculator ─── */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">🔢 TDEE Auto-Calculator</p>
            <p className="text-xs text-slate-600 mt-0.5">Mifflin-St Jeor BMR × activity multiplier → auto-fills training mode</p>
          </div>
          {tdeeResult && <span className="text-2xl font-black text-orange-400">{tdeeResult} kcal/day</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500 mb-2">Sex</p>
            <div className="flex gap-2">
              {(['male','female'] as const).map((s) => (
                <button key={s} type="button"
                  onClick={() => setTdeeCalc((c) => ({ ...c, sex: s }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors capitalize ${tdeeCalc.sex === s ? 'bg-violet-500/30 text-violet-200 border border-violet-500/40' : 'glass text-slate-400 hover:text-white'}`}>
                  {s === 'male' ? '♂️ Male' : '♀️ Female'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Activity Level</p>
            <select value={tdeeCalc.activityLevel} onChange={(e) => setTdeeCalc((c) => ({ ...c, activityLevel: e.target.value }))}
              className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/40">
              {ACTIVITY_LEVELS.map((l) => (
                <option key={l.key} value={l.key} className="bg-slate-900">{l.label} — {l.desc}</option>
              ))}
            </select>
          </div>
        </div>
        {(!form.age || !form.heightCm || !form.weightKg) && (
          <p className="text-xs text-amber-500/80">⚠️ Fill in Age, Height, and Weight above first</p>
        )}
        <button onClick={runTDEECalc} disabled={!form.age || !form.heightCm || !form.weightKg}
          className="px-6 py-2.5 rounded-xl gradient-orange text-white text-sm font-bold disabled:opacity-40 hover:scale-[1.02] transition-transform">
          🔢 Calculate TDEE & Auto-Fill Mode
        </button>
        {tdeeResult && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { mode: 'cut',         kcal: Math.round(tdeeResult * 0.8),  label: '🔥 Cut (-20%)'    },
              { mode: 'maintenance', kcal: tdeeResult,                    label: '⚖️ Maintain'      },
              { mode: 'bulk',        kcal: Math.round(tdeeResult * 1.1),  label: '💪 Bulk (+10%)'   },
            ].map((opt) => (
              <button key={opt.mode} onClick={() => setModeForm((f) => ({ ...f, mode: opt.mode, tdee: String(opt.kcal) }))}
                className="glass rounded-xl p-3 text-center hover:bg-white/5 transition-colors border border-white/10 hover:border-white/20">
                <p className="text-xs text-slate-400">{opt.label}</p>
                <p className="text-lg font-black text-white mt-1">{opt.kcal}</p>
                <p className="text-[10px] text-slate-500">kcal/day</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Emergency Contacts ─── */}
      <Card title="🚨 Emergency Contacts" accent="rose">
        <div className="space-y-3">
          {emergencyContacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 glass rounded-xl p-3">
              <div>
                <p className="text-sm font-bold text-white">{c.name} <span className="text-xs text-slate-500 font-normal">({c.relation})</span></p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{c.phone}</p>
              </div>
              <button onClick={() => setEmergencyContacts((prev) => prev.filter((_, j) => j !== i))}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0">
                Remove
              </button>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <input className="rounded-xl glass px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
              placeholder="Name" value={newContact.name} onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))} />
            <input className="rounded-xl glass px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
              placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact((c) => ({ ...c, phone: e.target.value }))} />
            <input className="rounded-xl glass px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
              placeholder="Relation" value={newContact.relation} onChange={(e) => setNewContact((c) => ({ ...c, relation: e.target.value }))} />
          </div>
          <button
            onClick={() => {
              if (!newContact.name.trim()) return;
              setEmergencyContacts((prev) => [...prev, { ...newContact }]);
              setNewContact({ name: '', phone: '', relation: '' });
            }}
            className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm font-bold transition-colors">
            + Add Emergency Contact
          </button>
          {emergencyContacts.length > 0 && (
            <button onClick={saveProfile} className="w-full py-2 rounded-xl glass text-slate-400 hover:text-white text-xs font-semibold transition-colors">
              💾 Save Contacts with Profile
            </button>
          )}
        </div>
      </Card>

      {/* ─── Lifetime Personal Stats ─── */}
      {stats && (
        <div className="glass rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">📊 My Lifetime Stats</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🏋️', label: 'Total Workouts', value: stats.workouts?.total ?? 0, color: 'text-violet-400' },
              { icon: '🏃', label: 'Total Activities', value: stats.activities?.total ?? 0, color: 'text-orange-400' },
              { icon: '🥗', label: 'Meals Logged', value: stats.meals?.total ?? 0, color: 'text-emerald-400' },
              { icon: '⭐', label: 'Total XP', value: (stats.totalXP ?? 0).toLocaleString(), color: 'text-yellow-400' },
              { icon: '📍', label: 'Total Distance', value: stats.activities?.total_distance_m >= 1000 ? `${(stats.activities.total_distance_m / 1000).toFixed(0)} km` : `${(stats.activities?.total_distance_m ?? 0)} m`, color: 'text-cyan-400' },
              { icon: '🔥', label: 'Calories Burned', value: `${((stats.workouts?.total_calories ?? 0) + (stats.activities?.total_calories ?? 0)).toLocaleString()} kcal`, color: 'text-rose-400' },
              { icon: '⏱️', label: 'Workout Hours', value: `${Number(stats.workouts?.total_hours ?? 0).toFixed(1)} h`, color: 'text-blue-400' },
              { icon: '⚖️', label: 'Latest Weight', value: stats.latestWeight ? `${Number(stats.latestWeight).toFixed(1)} kg` : '—', color: 'text-green-400' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="text-center glass rounded-xl p-3">
                <p className="text-xl mb-1">{icon}</p>
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges earned */}
      {badges.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            🏅 Badges Earned ({badges.length})
            {xp && <span className="ml-3 text-green-400 normal-case">Level {xp.level} · {xp.totalXP.toLocaleString()} XP</span>}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
            {badges.map((b: any) => (
              <div key={b.key} className="glass rounded-xl p-3 text-center border border-yellow-500/20" title={b.desc}>
                <p className="text-2xl mb-1">{b.icon}</p>
                <p className="text-[10px] font-bold text-white leading-tight">{b.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

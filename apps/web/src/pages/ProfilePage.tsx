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

export default function ProfilePage({ user }: Props) {
  const [form, setForm] = useState(emptyProfile);
  const [modeForm, setModeForm] = useState({ mode: 'maintenance', tdee: '2200', weightKg: '70' });
  const [currentMode, setCurrentMode] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [modeSaved, setModeSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ profile: any }>('/health/profile').then((r) => {
      if (r.profile) {
        setForm({
          age: r.profile.age ?? '', heightCm: r.profile.height_cm ?? '',
          weightKg: r.profile.weight_kg ?? '', bloodGroup: r.profile.blood_group ?? '',
          medicalConditions: (r.profile.medical_conditions ?? []).join(', '),
          allergies: (r.profile.allergies ?? []).join(', ')
        });
      }
    });
    api.get<{ mode: any }>('/modes/my').then((r) => setCurrentMode(r.mode));
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
      await api.put('/health/profile', body);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
  }

  async function saveMode(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.put<{ mode: any }>('/modes/my', { mode: modeForm.mode, tdee: Number(modeForm.tdee), weightKg: Number(modeForm.weightKg) });
    setCurrentMode(res.mode); setModeSaved(true); setTimeout(() => setModeSaved(false), 2000);
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
    </div>
  );
}

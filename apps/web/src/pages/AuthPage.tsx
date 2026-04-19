import React, { useState } from 'react';
import { api } from '../lib/api';
import { saveAuth } from '../lib/auth';

interface Props { onAuth: () => void; }

const FEATURES = [
  { icon: '💓', title: 'Vital Tracking', desc: 'HR, BP, SpO2 & sleep monitoring' },
  { icon: '🏋️', title: 'Gym Planner', desc: 'Sets, reps, weight — like Strong' },
  { icon: '🥗', title: 'Nutrition Log', desc: 'Calorie & macro tracking like MFP' },
  { icon: '📈', title: 'Activity Rings', desc: 'Google Fit-style progress circles' },
];

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
          '/auth/login', { email: form.email, password: form.password }
        );
        saveAuth(res.user, res.accessToken, res.refreshToken);
      } else {
        const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
          '/auth/signup', { email: form.email, password: form.password, name: form.name, role: form.role }
        );
        saveAuth(res.user, res.accessToken, res.refreshToken);
      }
      onAuth();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left hero panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0d1117 0%, #0b1a2e 40%, #0b0b12 100%)' }}>
        {/* Decorative rings */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ff6200 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🌿</span>
            <span className="text-2xl font-black tracking-tight text-gradient-green">HealthSphere</span>
          </div>
          <p className="text-slate-400 text-sm">Your all-in-one health &amp; fitness companion</p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <p className="font-bold text-white text-sm">{f.title}</p>
                <p className="text-slate-400 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <p className="text-xs text-slate-600">Inspired by MyFitnessPal · Strava · Google Fit · Strong</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0b0b12' }}>
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-black tracking-tight text-gradient-green">HealthSphere</span>
          </div>

          <h1 className="text-3xl font-black text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
          </p>

          {/* Mode toggle */}
          <div className="flex p-1 rounded-xl glass mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-white/10 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input
                  className="w-full rounded-xl glass px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="Full Name"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                />
                <select
                  className="w-full rounded-xl glass px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-transparent"
                  value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {[['user', '🧑 User'], ['doctor', '👨‍⚕️ Doctor'], ['trainer', '🏃 Trainer'], ['nutritionist', '🥦 Nutritionist']].map(([v, l]) => (
                    <option key={v} value={v} className="bg-zinc-900">{l}</option>
                  ))}
                </select>
              </>
            )}
            <input type="email"
              className="w-full rounded-xl glass px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              placeholder="Email address"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
            />
            <input type="password"
              className="w-full rounded-xl glass px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              placeholder="Password (min 8 chars)"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8}
            />
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl gradient-green glow-green text-white font-bold text-sm disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {loading ? 'Loading...' : mode === 'login' ? '→ Sign In' : '→ Create Account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

import React, { useState } from 'react';
import { api } from '../lib/api';
import { saveAuth } from '../lib/auth';

interface Props { onAuth: () => void; }

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
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold text-emerald-400 mb-6">HealthSphere</h1>
        <div className="flex gap-2 mb-6">
          {(['login', 'signup'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded text-sm font-medium ${mode === m ? 'bg-emerald-600 text-white' : 'border border-slate-700 text-slate-300 hover:text-white'}`}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <input className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <select className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {['user', 'doctor', 'trainer', 'nutritionist'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </>
          )}
          <input type="email" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <button type="submit" disabled={loading}
            className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm disabled:opacity-50">
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </main>
  );
}

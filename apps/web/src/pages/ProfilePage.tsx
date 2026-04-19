import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';
import type { AuthUser } from '../lib/auth';

interface Props { user: AuthUser; }

const emptyProfile = { age: '', heightCm: '', weightKg: '', bloodGroup: '', medicalConditions: '', allergies: '' };

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
      if (form.age) body.age = Number(form.age);
      if (form.heightCm) body.heightCm = Number(form.heightCm);
      if (form.weightKg) body.weightKg = Number(form.weightKg);
      if (form.bloodGroup) body.bloodGroup = form.bloodGroup;
      body.medicalConditions = form.medicalConditions.split(',').map((s) => s.trim()).filter(Boolean);
      body.allergies = form.allergies.split(',').map((s) => s.trim()).filter(Boolean);
      await api.put('/health/profile', body);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { setError(err.message); }
  }

  async function saveMode(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.put<{ mode: any }>('/modes/my', { mode: modeForm.mode, tdee: Number(modeForm.tdee), weightKg: Number(modeForm.weightKg) });
    setCurrentMode(res.mode); setModeSaved(true); setTimeout(() => setModeSaved(false), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-sm text-slate-400">Signed in as <strong>{user.email}</strong> · Role: <strong>{user.role}</strong></p>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Health Profile">
          <form onSubmit={saveProfile} className="space-y-2">
            {[['Age', 'age', 'number'], ['Height (cm)', 'heightCm', 'number'], ['Weight (kg)', 'weightKg', 'number'], ['Blood Group', 'bloodGroup', 'text']].map(([label, key, type]) => (
              <input key={key} type={type as string} className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder={label as string} value={(form as any)[key as string]} onChange={(e) => setForm({...form, [key as string]: e.target.value})} />
            ))}
            <textarea className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" rows={2} placeholder="Medical conditions (comma-separated)" value={form.medicalConditions} onChange={(e) => setForm({...form, medicalConditions: e.target.value})} />
            <textarea className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" rows={2} placeholder="Allergies (comma-separated)" value={form.allergies} onChange={(e) => setForm({...form, allergies: e.target.value})} />
            <button type="submit" className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">{saved ? '✓ Saved' : 'Save Profile'}</button>
          </form>
        </Card>
        <Card title="Training Mode">
          {currentMode && (
            <div className="mb-4 p-3 bg-slate-800 rounded text-sm space-y-1">
              <p>Current: <span className="font-semibold capitalize">{currentMode.mode}</span></p>
              <p>Calories: {currentMode.targets?.targetCalories} kcal</p>
              <p>Protein: {currentMode.targets?.proteinGrams}g</p>
            </div>
          )}
          <form onSubmit={saveMode} className="space-y-2">
            <select className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" value={modeForm.mode} onChange={(e) => setModeForm({...modeForm, mode: e.target.value})}>
              {['cut', 'bulk', 'maintenance', 'recomposition'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="TDEE (kcal/day)" value={modeForm.tdee} onChange={(e) => setModeForm({...modeForm, tdee: e.target.value})} />
            <input type="number" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Weight (kg)" value={modeForm.weightKg} onChange={(e) => setModeForm({...modeForm, weightKg: e.target.value})} />
            <button type="submit" className="w-full py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium">{modeSaved ? '✓ Saved' : 'Set Mode'}</button>
          </form>
        </Card>
      </div>
    </div>
  );
}

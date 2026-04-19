import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Vital {
  id: string; recorded_at: string; heart_rate: number | null; systolic_bp: number | null;
  diastolic_bp: number | null; spo2: number | null; sleep_hours: number | null;
  stress_level: number | null; calories_burned: number | null;
}

const emptyForm = {
  recordedAt: new Date().toISOString().slice(0, 16),
  heartRate: '', systolicBp: '', diastolicBp: '', spo2: '',
  temperatureC: '', sleepHours: '', stressLevel: '', caloriesBurned: ''
};

export default function VitalsPage() {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get<{ vitals: Vital[] }>('/health/vitals').then((r) => setVitals(r.vitals));
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      const body: any = { recordedAt: new Date(form.recordedAt).toISOString() };
      if (form.heartRate) body.heartRate = Number(form.heartRate);
      if (form.systolicBp) body.systolicBp = Number(form.systolicBp);
      if (form.diastolicBp) body.diastolicBp = Number(form.diastolicBp);
      if (form.spo2) body.spo2 = Number(form.spo2);
      if (form.temperatureC) body.temperatureC = Number(form.temperatureC);
      if (form.sleepHours) body.sleepHours = Number(form.sleepHours);
      if (form.stressLevel) body.stressLevel = Number(form.stressLevel);
      if (form.caloriesBurned) body.caloriesBurned = Number(form.caloriesBurned);
      await api.post('/health/vitals', body);
      setForm(emptyForm); load();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Vital Signs</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Log New Vital">
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="datetime-local" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              value={form.recordedAt} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} required />
            {[
              ['Heart Rate (bpm)', 'heartRate'], ['Systolic BP', 'systolicBp'], ['Diastolic BP', 'diastolicBp'],
              ['SpO2 (%)', 'spo2'], ['Temp (°C)', 'temperatureC'], ['Sleep (hrs)', 'sleepHours'],
              ['Stress (0-10)', 'stressLevel'], ['Calories Burned', 'caloriesBurned']
            ].map(([label, key]) => (
              <input key={key} type="number" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                placeholder={label} value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            ))}
            <button type="submit" disabled={submitting}
              className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">
              {submitting ? 'Saving...' : 'Log Vital'}
            </button>
          </form>
        </Card>
        <Card title="Recent Vitals">
          {vitals.length === 0 ? <p className="text-slate-500 text-sm">No vitals logged yet.</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {vitals.map((v) => (
                <div key={v.id} className="text-xs bg-slate-800 rounded p-2 space-y-1">
                  <p className="text-slate-400">{new Date(v.recorded_at).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-slate-300">
                    {v.heart_rate != null && <span>HR: {v.heart_rate}</span>}
                    {v.systolic_bp != null && <span>BP: {v.systolic_bp}/{v.diastolic_bp}</span>}
                    {v.spo2 != null && <span>SpO2: {v.spo2}%</span>}
                    {v.sleep_hours != null && <span>Sleep: {v.sleep_hours}h</span>}
                    {v.stress_level != null && <span>Stress: {v.stress_level}/10</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Ring from '../components/Ring';
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

const METRIC_FIELDS = [
  ['Heart Rate (bpm)', 'heartRate'],
  ['Systolic BP',      'systolicBp'],
  ['Diastolic BP',     'diastolicBp'],
  ['SpO2 (%)',         'spo2'],
  ['Temp (°C)',        'temperatureC'],
  ['Sleep (hrs)',      'sleepHours'],
  ['Stress (0-10)',    'stressLevel'],
  ['Calories Burned',  'caloriesBurned'],
] as const;

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
      if (form.heartRate)      body.heartRate      = Number(form.heartRate);
      if (form.systolicBp)     body.systolicBp     = Number(form.systolicBp);
      if (form.diastolicBp)    body.diastolicBp    = Number(form.diastolicBp);
      if (form.spo2)           body.spo2           = Number(form.spo2);
      if (form.temperatureC)   body.temperatureC   = Number(form.temperatureC);
      if (form.sleepHours)     body.sleepHours     = Number(form.sleepHours);
      if (form.stressLevel)    body.stressLevel    = Number(form.stressLevel);
      if (form.caloriesBurned) body.caloriesBurned = Number(form.caloriesBurned);
      await api.post('/health/vitals', body);
      setForm(emptyForm); load();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  const latest = vitals[0];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Vital Signs</h1>
        <p className="text-slate-500 text-sm mt-1">Track your body's key health metrics</p>
      </div>

      {/* Live metric rings (latest reading) */}
      {latest && (
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">Latest Reading — {new Date(latest.recorded_at).toLocaleString()}</p>
          <div className="flex flex-wrap justify-around gap-6">
            <Ring value={latest.heart_rate ? Math.min((latest.heart_rate / 200) * 100, 100) : 0}
              color="#e11d48" trackColor="#2a0012" size={88} strokeWidth={8}
              label={latest.heart_rate ? `${latest.heart_rate}` : '—'} sublabel="bpm / HR">
              <span className="text-xl">💓</span>
            </Ring>
            <Ring value={latest.spo2 ?? 0} color="#2563eb" trackColor="#00103a" size={88} strokeWidth={8}
              label={latest.spo2 ? `${latest.spo2}%` : '—'} sublabel="SpO2">
              <span className="text-xl">🫁</span>
            </Ring>
            <Ring value={latest.sleep_hours ? Math.min((latest.sleep_hours / 9) * 100, 100) : 0}
              color="#7c3aed" trackColor="#0e0022" size={88} strokeWidth={8}
              label={latest.sleep_hours ? `${latest.sleep_hours}h` : '—'} sublabel="Sleep">
              <span className="text-xl">🌙</span>
            </Ring>
            <Ring value={latest.stress_level ? Math.min((latest.stress_level / 10) * 100, 100) : 0}
              color="#f59e0b" trackColor="#1c1200" size={88} strokeWidth={8}
              label={latest.stress_level != null ? `${latest.stress_level}/10` : '—'} sublabel="Stress">
              <span className="text-xl">🧠</span>
            </Ring>
            <Ring value={latest.calories_burned ? Math.min((latest.calories_burned / 800) * 100, 100) : 0}
              color="#ff6200" trackColor="#2a1500" size={88} strokeWidth={8}
              label={latest.calories_burned ? `${latest.calories_burned}` : '—'} sublabel="kcal burned">
              <span className="text-xl">🔥</span>
            </Ring>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Log form */}
        <Card title="Log New Vital" accent="rose">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="datetime-local"
              className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50"
              value={form.recordedAt} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} required />
            <div className="grid grid-cols-2 gap-2">
              {METRIC_FIELDS.map(([label, key]) => (
                <input key={key} type="number"
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
                  placeholder={label} value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              ))}
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 rounded-xl gradient-rose glow-rose text-white text-sm font-bold disabled:opacity-50 hover:scale-[1.02] transition-transform">
              {submitting ? 'Saving…' : '+ Log Vital'}
            </button>
          </form>
        </Card>

        {/* History */}
        <Card title="History" accent="blue">
          {vitals.length === 0 ? (
            <p className="text-sm text-slate-600">No vitals logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {vitals.map((v) => (
                <div key={v.id} className="rounded-xl bg-white/3 border border-white/5 p-3 space-y-2">
                  <p className="text-[10px] text-slate-500 font-medium">{new Date(v.recorded_at).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-2">
                    {v.heart_rate != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-semibold">💓 {v.heart_rate} bpm</span>
                    )}
                    {v.systolic_bp != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-semibold">🩸 {v.systolic_bp}/{v.diastolic_bp}</span>
                    )}
                    {v.spo2 != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 font-semibold">🫁 {v.spo2}%</span>
                    )}
                    {v.sleep_hours != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold">🌙 {v.sleep_hours}h</span>
                    )}
                    {v.stress_level != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold">🧠 {v.stress_level}/10</span>
                    )}
                    {v.calories_burned != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-semibold">🔥 {v.calories_burned} kcal</span>
                    )}
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

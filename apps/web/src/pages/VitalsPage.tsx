import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Ring from '../components/Ring';
import Sparkline from '../components/Sparkline';
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
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [weightForm, setWeightForm] = useState({ weightKg: '', bodyFatPct: '' });
  const [savingWeight, setSavingWeight] = useState(false);

  function load() {
    api.get<{ vitals: Vital[] }>('/health/vitals').then((r) => setVitals(r.vitals));
  }
  function loadWeight() {
    api.get<{ logs: any[] }>('/health/weight').then((r) => setWeightLogs(r.logs)).catch(() => {});
  }
  useEffect(() => { load(); loadWeight(); }, []);

  async function handleWeightLog(e: React.FormEvent) {
    e.preventDefault();
    if (!weightForm.weightKg) return;
    setSavingWeight(true);
    try {
      await api.post('/health/weight', {
        weightKg: Number(weightForm.weightKg),
        ...(weightForm.bodyFatPct ? { bodyFatPct: Number(weightForm.bodyFatPct) } : {}),
        loggedAt: new Date().toISOString(),
      });
      setWeightForm({ weightKg: '', bodyFatPct: '' });
      loadWeight();
    } catch (_) {}
    setSavingWeight(false);
  }

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

  // Build sparkline data (oldest → newest)
  const hrData    = [...vitals].reverse().map((v) => v.heart_rate).filter((n): n is number => n != null);
  const sleepData = [...vitals].reverse().map((v) => v.sleep_hours).filter((n): n is number => n != null);
  const spo2Data  = [...vitals].reverse().map((v) => v.spo2).filter((n): n is number => n != null);
  const weightData = [...weightLogs].reverse().map((l) => Number(l.weight_kg));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Vital Signs 💓</h1>
        <p className="text-slate-500 text-sm mt-1">Track your body's key health metrics and trends</p>
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

      {/* ─── Trend Charts ─── */}
      {(hrData.length >= 2 || sleepData.length >= 2 || spo2Data.length >= 2) && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">📈 Trend Charts</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {hrData.length >= 2 && (
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-rose-300">💓 Heart Rate</span>
                  <span className="text-xs text-slate-500">{hrData[hrData.length - 1]} bpm</span>
                </div>
                <Sparkline data={hrData} color="#e11d48" height={48} />
              </div>
            )}
            {sleepData.length >= 2 && (
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-300">🌙 Sleep</span>
                  <span className="text-xs text-slate-500">{sleepData[sleepData.length - 1]}h</span>
                </div>
                <Sparkline data={sleepData} color="#6366f1" height={48} />
              </div>
            )}
            {spo2Data.length >= 2 && (
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-300">🫁 SpO2</span>
                  <span className="text-xs text-slate-500">{spo2Data[spo2Data.length - 1]}%</span>
                </div>
                <Sparkline data={spo2Data} color="#2563eb" height={48} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Body Weight Tracker ─── */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">⚖️ Body Weight Tracker</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <form onSubmit={handleWeightLog} className="space-y-3">
            <div className="flex gap-2">
              <input type="number" step="0.1" min="20" max="700"
                className="flex-1 rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                placeholder="Weight (kg)" value={weightForm.weightKg}
                onChange={(e) => setWeightForm((f) => ({ ...f, weightKg: e.target.value }))} required />
              <input type="number" step="0.1" min="0" max="100"
                className="w-24 rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                placeholder="BF%" value={weightForm.bodyFatPct}
                onChange={(e) => setWeightForm((f) => ({ ...f, bodyFatPct: e.target.value }))} />
            </div>
            <button type="submit" disabled={savingWeight || !weightForm.weightKg}
              className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold disabled:opacity-40 transition-colors">
              {savingWeight ? 'Saving…' : '+ Log Weight'}
            </button>
          </form>

          {weightData.length >= 2 ? (
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-300">Weight Trend</span>
                <span className="text-xs text-slate-500">{weightData[weightData.length - 1].toFixed(1)} kg</span>
              </div>
              <Sparkline data={weightData} color="#22c55e" height={48} />
              <p className="text-[10px] text-slate-600 mt-1">{weightLogs.length} readings</p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 self-center">Log at least 2 weights to see trend.</p>
          )}
        </div>

        {weightLogs.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {weightLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-0">
                <span className="text-slate-500">{new Date(log.logged_at).toLocaleDateString()}</span>
                <span className="text-emerald-300 font-bold">
                  {Number(log.weight_kg).toFixed(1)} kg
                  {log.body_fat_pct != null && <span className="text-slate-500 font-normal"> · {Number(log.body_fat_pct).toFixed(1)}% BF</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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

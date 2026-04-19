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
  const [activeTab, setActiveTab] = useState<'vitals' | 'medications'>('vitals');
  // Sleep stages
  const [sleepForm, setSleepForm] = useState({ totalHours: '', remHours: '', deepHours: '', lightHours: '', date: new Date().toISOString().slice(0,16) });
  const [savingSleep, setSavingSleep] = useState(false);
  // Medications
  const [medications, setMedications] = useState<any[]>([]);
  const [medForm, setMedForm] = useState({ medicationName: '', dosage: '', frequency: '', instructions: '' });
  const [savingMed, setSavingMed] = useState(false);

  function load() {
    api.get<{ vitals: Vital[] }>('/health/vitals').then((r) => setVitals(r.vitals));
  }
  function loadWeight() {
    api.get<{ logs: any[] }>('/health/weight').then((r) => setWeightLogs(r.logs)).catch(() => {});
  }
  function loadMedications() {
    api.get<{ medications: any[] }>('/health/medications').then((r) => setMedications(r.medications)).catch(() => {});
  }
  useEffect(() => { load(); loadWeight(); loadMedications(); }, []);

  async function handleSleepStages(e: React.FormEvent) {
    e.preventDefault();
    if (!sleepForm.totalHours) return;
    setSavingSleep(true);
    try {
      await api.post('/health/sleep-stages', {
        recordedAt:  new Date(sleepForm.date).toISOString(),
        sleepHours:  Number(sleepForm.totalHours),
        remHours:    sleepForm.remHours   ? Number(sleepForm.remHours)   : undefined,
        deepHours:   sleepForm.deepHours  ? Number(sleepForm.deepHours)  : undefined,
        lightHours:  sleepForm.lightHours ? Number(sleepForm.lightHours) : undefined,
      });
      setSleepForm({ totalHours: '', remHours: '', deepHours: '', lightHours: '', date: new Date().toISOString().slice(0,16) });
      load();
    } catch (_) {}
    setSavingSleep(false);
  }

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

  async function saveMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!medForm.medicationName.trim()) return;
    setSavingMed(true);
    try {
      await api.post('/health/medications', {
        medicationName: medForm.medicationName,
        ...(medForm.dosage ? { dosage: medForm.dosage } : {}),
        ...(medForm.frequency ? { frequency: medForm.frequency } : {}),
        ...(medForm.instructions ? { instructions: medForm.instructions } : {}),
        startedAt: new Date().toISOString(),
      });
      setMedForm({ medicationName: '', dosage: '', frequency: '', instructions: '' });
      loadMedications();
    } catch (_) {}
    setSavingMed(false);
  }

  async function deleteMedication(id: string) {
    try {
      await api.delete(`/health/medications/${id}`);
      loadMedications();
    } catch (_) {}
  }

  const latest = vitals[0];

  // Sleep quality score: 0-100 based on hours + stress (inverted)
  const sleepScore = latest
    ? Math.min(100, Math.max(0, Math.round(
        ((latest.sleep_hours ?? 6) / 9) * 60 +        // up to 60pts for 9h sleep
        ((10 - (latest.stress_level ?? 5)) / 10) * 40  // up to 40pts for low stress
      )))
    : null;
  const sleepScoreColor = !sleepScore ? '#6b7280'
    : sleepScore >= 80 ? '#22c55e'
    : sleepScore >= 60 ? '#f59e0b'
    : '#ef4444';

  // Build sparkline data (oldest → newest)
  const hrData    = [...vitals].reverse().map((v) => v.heart_rate).filter((n): n is number => n != null);
  const sleepData = [...vitals].reverse().map((v) => v.sleep_hours).filter((n): n is number => n != null);
  const spo2Data  = [...vitals].reverse().map((v) => v.spo2).filter((n): n is number => n != null);
  const weightData = [...weightLogs].reverse().map((l) => Number(l.weight_kg));

  // HRV proxy — RMSSD-style from successive HR differences
  const hrvValues: { t: string; v: number }[] = [];
  const hrSeries = [...vitals].reverse().filter((v) => v.heart_rate != null);
  for (let i = 1; i < hrSeries.length; i++) {
    const diff = Math.abs((hrSeries[i].heart_rate ?? 0) - (hrSeries[i - 1].heart_rate ?? 0));
    hrvValues.push({ t: hrSeries[i].recorded_at, v: parseFloat(diff.toFixed(1)) });
  }
  const latestHrv = hrvValues.length > 0 ? hrvValues[hrvValues.length - 1].v : null;
  const avgHrv    = hrvValues.length > 0
    ? parseFloat((hrvValues.reduce((s, h) => s + h.v, 0) / hrvValues.length).toFixed(1))
    : null;
  const hrvColor  = latestHrv == null ? '#6b7280'
    : latestHrv < 5  ? '#22c55e'
    : latestHrv < 15 ? '#f59e0b'
    : '#ef4444';
  const hrvLabel  = latestHrv == null ? '—'
    : latestHrv < 5  ? 'Stable'
    : latestHrv < 15 ? 'Moderate variability'
    : 'High variability';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Vital Signs 💓</h1>
        <p className="text-slate-500 text-sm mt-1">Track your body's key health metrics and trends</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([['vitals', '📊 Vitals & Trends'], ['medications', '💊 Medications']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Live metric rings (latest reading) */}
      {activeTab === 'vitals' && (<>
      {latest && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Latest Reading — {new Date(latest.recorded_at).toLocaleString()}</p>
            {/* Sleep quality score chip */}
            {sleepScore !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border" style={{ borderColor: `${sleepScoreColor}40` }}>
                <span className="text-sm">😴</span>
                <span className="text-xs font-bold" style={{ color: sleepScoreColor }}>
                  Sleep Score: {sleepScore}
                </span>
                <span className="text-[10px] text-slate-500">
                  {sleepScore >= 80 ? 'Excellent' : sleepScore >= 60 ? 'Fair' : 'Poor'}
                </span>
              </div>
            )}
          </div>
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

      {/* ─── HRV Proxy Trend ─── */}
      {hrvValues.length >= 2 && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">🫀 HRV Proxy (HR Variability)</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${hrvColor}22`, color: hrvColor }}>
              {hrvLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black" style={{ color: hrvColor }}>{latestHrv ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Latest (ms proxy)</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-200">{avgHrv ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">7-reading avg</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                Calculated from successive HR differences.
                Lower variability = more recovered.
              </p>
            </div>
          </div>
          <Sparkline data={hrvValues.map((h) => h.v)} color={hrvColor} height={48} />
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

      {/* ─── Blood Pressure Dual-Line Trend ─── */}
      {(() => {
        const bpSeries = [...vitals].reverse().filter((v) => v.systolic_bp != null && v.diastolic_bp != null);
        if (bpSeries.length < 2) return null;
        const W = 300; const H = 80; const PAD = 6;
        const sysList = bpSeries.map((v) => v.systolic_bp as number);
        const diasList = bpSeries.map((v) => v.diastolic_bp as number);
        const allVals = [...sysList, ...diasList];
        const minV = Math.min(...allVals) - 5;
        const maxV = Math.max(...allVals) + 5;
        const range = maxV - minV || 1;
        const toX = (i: number) => PAD + (i / (bpSeries.length - 1)) * (W - PAD * 2);
        const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);
        const polyline = (vals: number[], col: string) => (
          <polyline points={vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')}
            fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        );
        const latSys = sysList[sysList.length - 1];
        const latDias = diasList[diasList.length - 1];
        const bpStatus = latSys < 120 && latDias < 80 ? '✅ Normal'
          : latSys < 130 && latDias < 80 ? '⚠️ Elevated'
          : '🔴 High';
        return (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">🩺 Blood Pressure Trend</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-300 font-bold">{latSys}</span>
                <span className="text-slate-500">/</span>
                <span className="text-blue-300 font-bold">{latDias}</span>
                <span className="text-slate-500">mmHg</span>
                <span className="text-xs px-2 py-0.5 rounded-full glass">{bpStatus}</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
              {/* 120/80 reference lines */}
              <line x1={PAD} x2={W - PAD} y1={toY(120)} y2={toY(120)} stroke="#ef444420" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={PAD} x2={W - PAD} y1={toY(80)}  y2={toY(80)}  stroke="#3b82f620" strokeWidth="1" strokeDasharray="3,3" />
              {polyline(sysList,  '#ef4444')}
              {polyline(diasList, '#3b82f6')}
            </svg>
            <div className="flex gap-4 mt-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" /> Systolic</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Diastolic</span>
              <span className="text-slate-600 ml-auto">dashed = 120/80 reference</span>
            </div>
          </div>
        );
      })()}

      {/* ─── Sleep Quality Bar Chart (14 nights) ─── */}
      {sleepData.length >= 2 && (() => {
        const W = 400; const H = 80; const PAD = 6;
        const last14 = [...vitals].reverse().filter((v) => v.sleep_hours != null).slice(-14);
        if (last14.length < 2) return null;
        const barW = (W - PAD * 2) / last14.length - 2;
        const maxH = 10; // max sleep hours on chart
        const toBarH = (h: number) => Math.max(2, ((h / maxH) * (H - PAD * 2 - 12)));
        // optimal band 7-9h
        const optY1 = H - PAD - toBarH(9);
        const optH  = toBarH(9) - toBarH(7);
        return (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">🌙 Sleep Quality (14 nights)</p>
              <span className="text-xs text-indigo-300 font-bold">{last14[last14.length - 1].sleep_hours}h last night</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
              {/* 7-9h optimal band */}
              <rect x={PAD} y={optY1} width={W - PAD * 2} height={optH} fill="#6366f115" />
              {last14.map((v, i) => {
                const h = v.sleep_hours as number;
                const bh = toBarH(h);
                const col = h >= 7 && h <= 9 ? '#6366f1' : h >= 6 ? '#f59e0b' : '#ef4444';
                return (
                  <rect key={i}
                    x={PAD + i * (barW + 2)} y={H - PAD - bh}
                    width={barW} height={bh} rx="2" fill={col} fillOpacity="0.85"
                  />
                );
              })}
            </svg>
            <div className="flex gap-4 mt-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-indigo-500 inline-block rounded opacity-85" /> 7-9h optimal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-amber-500 inline-block rounded opacity-85" /> 6-7h fair</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-500 inline-block rounded opacity-85" /> &lt;6h poor</span>
            </div>
          </div>
        );
      })()}

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

      {/* ─── Sleep Stages Tracker (Oura/WHOOP-style) ─── */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">🛏️ Sleep Stage Breakdown</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <form onSubmit={handleSleepStages} className="space-y-3">
            <p className="text-xs text-slate-500">Log detailed sleep stages after checking your wearable or sleep tracker app</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Total Sleep (h)', 'totalHours', '7.5', '#6366f1'],
                ['REM (h)',         'remHours',   '1.8', '#8b5cf6'],
                ['Deep (h)',        'deepHours',  '1.2', '#3b82f6'],
                ['Light (h)',       'lightHours', '4.5', '#94a3b8'],
              ].map(([label, key, ph, _]) => (
                <div key={key}>
                  <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                  <input type="number" step="0.1" min="0" max="24"
                    placeholder={ph}
                    value={(sleepForm as any)[key]}
                    onChange={(e) => setSleepForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl glass px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              ))}
            </div>
            <input type="datetime-local" value={sleepForm.date}
              onChange={(e) => setSleepForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
            <button type="submit" disabled={savingSleep || !sleepForm.totalHours}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold disabled:opacity-40 transition-colors">
              {savingSleep ? 'Saving…' : '🛏️ Log Sleep Stages'}
            </button>
          </form>

          {/* Show last logged sleep stages from vitals */}
          {(() => {
            const lastSleep = vitals.find((v) => v.sleep_hours != null && ((v as any).sleep_rem_h != null || (v as any).sleep_deep_h != null));
            if (!lastSleep) {
              return (
                <div className="flex items-center justify-center text-xs text-slate-600 text-center">
                  <p>Log sleep stages to see your<br />REM/Deep/Light breakdown</p>
                </div>
              );
            }
            const total = lastSleep.sleep_hours ?? 0;
            const rem   = Number((lastSleep as any).sleep_rem_h   ?? 0);
            const deep  = Number((lastSleep as any).sleep_deep_h  ?? 0);
            const light = Number((lastSleep as any).sleep_light_h ?? (total - rem - deep));
            const stages = [
              { label: 'REM',   h: rem,   color: '#8b5cf6', desc: 'Memory + learning' },
              { label: 'Deep',  h: deep,  color: '#3b82f6', desc: 'Physical recovery' },
              { label: 'Light', h: light, color: '#94a3b8', desc: 'Rest' },
            ];
            // SVG pie donut
            const R = 44; const cx = 56; const cy = 56; const sw = 20;
            const circ = 2 * Math.PI * R;
            let offset = 0;
            const slices = stages.map((s) => {
              const frac = total > 0 ? s.h / total : 0;
              const el = (
                <circle key={s.label} cx={cx} cy={cy} r={R}
                  fill="none" stroke={s.color} strokeWidth={sw}
                  strokeDasharray={`${frac * circ} ${circ}`}
                  strokeDashoffset={-offset * circ}
                  transform={`rotate(-90 ${cx} ${cy})`} />
              );
              offset += frac;
              return el;
            });
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <svg width={112} height={112} viewBox="0 0 112 112" className="shrink-0">
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="#ffffff08" strokeWidth={sw} />
                    {slices}
                    <text x={cx} y={cy - 4}  textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}h</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="#6b7280" fontSize="8">total</text>
                  </svg>
                  <div className="space-y-2">
                    {stages.map((s) => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold" style={{ color: s.color }}>{s.label}</span>
                          <span className="text-white">{s.h.toFixed(1)}h ({total > 0 ? Math.round((s.h / total) * 100) : 0}%)</span>
                        </div>
                        <p className="text-[9px] text-slate-600">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-600">
                  🎯 Optimal: REM 20-25% · Deep 15-20% · Light 55-60% of total sleep
                </p>
              </div>
            );
          })()}
        </div>
      </div>
      </>)}

      {/* ─── Medications Tab ─── */}
      {activeTab === 'medications' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Log new medication */}
          <Card title="💊 Add Medication" accent="rose">
            <form onSubmit={saveMedication} className="space-y-3">
              <input required value={medForm.medicationName}
                onChange={(e) => setMedForm((f) => ({ ...f, medicationName: e.target.value }))}
                placeholder="Medication name *"
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
              <div className="grid grid-cols-2 gap-2">
                <input value={medForm.dosage}
                  onChange={(e) => setMedForm((f) => ({ ...f, dosage: e.target.value }))}
                  placeholder="Dosage (e.g. 10mg)"
                  className="rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500/30" />
                <input value={medForm.frequency}
                  onChange={(e) => setMedForm((f) => ({ ...f, frequency: e.target.value }))}
                  placeholder="Frequency (e.g. twice daily)"
                  className="rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500/30" />
              </div>
              <textarea value={medForm.instructions} rows={2}
                onChange={(e) => setMedForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder="Instructions or notes (optional)"
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500/30 resize-none" />
              <button type="submit" disabled={savingMed}
                className="w-full py-2.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50 transition-colors">
                {savingMed ? 'Saving…' : '+ Add Medication'}
              </button>
            </form>
          </Card>

          {/* Medications list */}
          <Card title="Active Medications" accent="blue">
            {medications.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-3xl mb-2">💊</p>
                <p className="text-sm">No medications logged yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {medications.map((med) => (
                  <div key={med.id} className="glass rounded-xl p-3 flex items-start gap-3">
                    <span className="text-2xl mt-0.5">💊</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{med.medication_name}</p>
                      {med.dosage && <p className="text-xs text-slate-400 mt-0.5">Dose: {med.dosage}</p>}
                      {med.frequency && <p className="text-xs text-slate-400">Frequency: {med.frequency}</p>}
                      {med.instructions && <p className="text-xs text-slate-500 mt-1 italic">{med.instructions}</p>}
                      {med.started_at && (
                        <p className="text-[10px] text-slate-600 mt-1">Started {new Date(med.started_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    <button onClick={() => deleteMedication(med.id)}
                      className="text-xs text-slate-600 hover:text-red-400 transition-colors px-2 py-1 rounded shrink-0">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

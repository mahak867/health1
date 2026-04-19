import React, { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Workout { id: string; title: string; duration_seconds: number|null; calories_burned: number|null; started_at: string|null; completed_at: string|null; }
interface Exercise { id: string; muscle_group: string; exercise_name: string; sets: number; reps: number; weight_kg: number; rest_seconds: number; newPR?: boolean; }
interface PR { exercise_name: string; weight_kg: number; reps: number; estimated_1rm: number; achieved_at: string; }
interface Template { id: string; title: string; exercises: { muscleGroup: string; exerciseName: string; sets: number; reps: number; weightKg: number; restSeconds: number }[]; }

const emptyW = { title: '', durationSeconds: '', caloriesBurned: '' };
const emptyE = { muscleGroup: '', exerciseName: '', sets: '3', reps: '10', weightKg: '0', restSeconds: '60' };

const MUSCLE_COLORS: Record<string, string> = {
  chest:     'bg-rose-500/20 text-rose-300',
  back:      'bg-blue-500/20 text-blue-300',
  legs:      'bg-orange-500/20 text-orange-300',
  shoulders: 'bg-yellow-500/20 text-yellow-300',
  arms:      'bg-violet-500/20 text-violet-300',
  core:      'bg-emerald-500/20 text-emerald-300',
  cardio:    'bg-cyan-500/20 text-cyan-300',
};

function muscleColor(group: string) {
  return MUSCLE_COLORS[group?.toLowerCase()] ?? 'bg-slate-500/20 text-slate-300';
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selected, setSelected] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [prs, setPRs] = useState<PR[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [wForm, setWForm] = useState(emptyW);
  const [eForm, setEForm] = useState(emptyE);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'workouts' | 'templates' | 'prs' | 'analytics'>('workouts');
  const [newPRFlash, setNewPRFlash] = useState<string | null>(null);
  // Analytics — volume per muscle group
  const [volumeData, setVolumeData] = useState<any[]>([]);
  // Session timer — tracks total elapsed time since first exercise logged
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Rest timer
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Exercise history hint for progressive overload
  const [exHistory, setExHistory] = useState<any[]>([]);

  function loadWorkouts() {
    api.get<{ workouts: Workout[] }>('/fitness/workouts').then((r) => setWorkouts(r.workouts));
  }
  function loadExercises(id: string) {
    api.get<{ exercises: Exercise[] }>(`/fitness/workouts/${id}/exercises`).then((r) => setExercises(r.exercises));
  }
  function loadPRs() {
    api.get<{ personalRecords: PR[] }>('/fitness/personal-records').then((r) => setPRs(r.personalRecords)).catch(() => {});
  }
  function loadTemplates() {
    api.get<{ templates: Template[] }>('/fitness/templates').then((r) => setTemplates(r.templates)).catch(() => {});
  }
  function loadVolume() {
    api.get<{ volume: any[] }>('/fitness/workouts/volume?weeks=8').then((r) => setVolumeData(r.volume)).catch(() => {});
  }
  useEffect(() => { loadWorkouts(); loadPRs(); loadTemplates(); loadVolume(); }, []);

  // Session timer
  useEffect(() => {
    if (sessionStart) {
      sessionTimerRef.current = setInterval(() => {
        setSessionElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
      }, 1000);
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [sessionStart]);

  // Fetch exercise history when exercise name changes (for progressive overload hint)
  const fetchExHistory = useCallback((name: string) => {
    if (!name.trim()) { setExHistory([]); return; }
    api.get<{ history: any[] }>(`/fitness/exercises/${encodeURIComponent(name)}/history`)
      .then((r) => setExHistory(r.history))
      .catch(() => setExHistory([]));
  }, []);

  // Start rest timer
  function startRestTimer(seconds: number) {
    if (seconds <= 0) return;
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestTimer(seconds);
    restIntervalRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(restIntervalRef.current!);
          restIntervalRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Cleanup on unmount
  useEffect(() => () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); }, []);

  const prMap = new Map(prs.map((p) => [p.exercise_name.toLowerCase(), p]));

  async function createWorkout(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const body: any = { title: wForm.title };
      if (wForm.durationSeconds) body.durationSeconds = Number(wForm.durationSeconds);
      if (wForm.caloriesBurned)  body.caloriesBurned  = Number(wForm.caloriesBurned);
      const res = await api.post<{ workout: Workout }>('/fitness/workouts', body);
      setWForm(emptyW); setSelected(res.workout); setExercises([]); loadWorkouts();
    } catch (err: any) { setError(err.message); }
  }

  async function startFromTemplate(tmpl: Template) {
    setError('');
    try {
      const res = await api.post<{ workout: Workout }>('/fitness/workouts', { title: tmpl.title });
      setSelected(res.workout);
      // Pre-fill exercises from template
      for (const ex of tmpl.exercises) {
        await api.post(`/fitness/workouts/${res.workout.id}/exercises`, ex);
      }
      loadWorkouts(); loadExercises(res.workout.id); setActiveTab('workouts');
    } catch (err: any) { setError(err.message); }
  }

  async function saveAsTemplate() {
    if (!selected || exercises.length === 0) return;
    try {
      const exList = exercises.map((ex) => ({
        muscleGroup: ex.muscle_group, exerciseName: ex.exercise_name,
        sets: ex.sets, reps: ex.reps, weightKg: ex.weight_kg, restSeconds: ex.rest_seconds
      }));
      await api.post('/fitness/templates', { title: selected.title, exercises: exList });
      loadTemplates();
    } catch (err: any) { setError(err.message); }
  }

  async function deleteTemplate(id: string) {
    try {
      await api.delete(`/fitness/templates/${id}`);
      loadTemplates();
    } catch (_) {}
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return; setError('');
    try {
      const res = await api.post<{ exercise: Exercise; newPR: PR | null }>(
        `/fitness/workouts/${selected.id}/exercises`, {
          muscleGroup: eForm.muscleGroup, exerciseName: eForm.exerciseName,
          sets: Number(eForm.sets), reps: Number(eForm.reps),
          weightKg: Number(eForm.weightKg), restSeconds: Number(eForm.restSeconds)
        });
      if (res.newPR) {
        setNewPRFlash(`🏆 New PR: ${res.newPR.exercise_name} — ${res.newPR.estimated_1rm.toFixed(1)} kg est. 1RM`);
        setTimeout(() => setNewPRFlash(null), 4000);
        loadPRs();
      }
      // Start rest timer
      const restSecs = Number(eForm.restSeconds);
      if (restSecs > 0) startRestTimer(restSecs);
      // Start session timer on first exercise
      if (!sessionStart) setSessionStart(new Date());
      setEForm(emptyE); loadExercises(selected.id); loadVolume();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Workouts 🏋️</h1>
          <p className="text-slate-500 text-sm mt-1">Plan, log and track your training</p>
        </div>
        {/* Session timer */}
        {sessionStart && (
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Session</p>
              <p className="text-lg font-black text-white tabular-nums">
                {Math.floor(sessionElapsed / 3600) > 0 && `${Math.floor(sessionElapsed / 3600)}:`}
                {String(Math.floor((sessionElapsed % 3600) / 60)).padStart(2, '0')}:{String(sessionElapsed % 60).padStart(2, '0')}
              </p>
            </div>
            <button onClick={() => { setSessionStart(null); setSessionElapsed(0); }} className="text-xs text-slate-600 hover:text-white ml-2">✕</button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}
      {newPRFlash && (
        <div className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm font-bold animate-pulse">
          {newPRFlash}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['workouts', '🏋️ Workouts'],
          ['templates', `📋 Templates (${templates.length})`],
          ['prs', `🏆 PRs (${prs.length})`],
          ['analytics', '📊 Analytics'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t as any)}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>{label}</button>
        ))}
      </div>

      {/* ─── Workouts Tab ─── */}
      {activeTab === 'workouts' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="New Workout" accent="violet">
            <form onSubmit={createWorkout} className="space-y-3">
              <input
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                placeholder="Workout name (e.g. Push Day)" value={wForm.title}
                onChange={(e) => setWForm({...wForm, title: e.target.value})} required />
              <div className="grid grid-cols-2 gap-2">
                <input type="number"
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  placeholder="Duration (s)" value={wForm.durationSeconds}
                  onChange={(e) => setWForm({...wForm, durationSeconds: e.target.value})} />
                <input type="number"
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  placeholder="Kcal burned" value={wForm.caloriesBurned}
                  onChange={(e) => setWForm({...wForm, caloriesBurned: e.target.value})} />
              </div>
              <button type="submit"
                className="w-full py-2.5 rounded-xl gradient-violet glow-violet text-white text-sm font-bold hover:scale-[1.02] transition-transform">
                + Create Workout
              </button>
            </form>
          </Card>

          {/* Workout list */}
          <Card title="My Workouts" accent="violet">
            {workouts.length === 0 ? (
              <p className="text-sm text-slate-600">No workouts yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {workouts.map((w) => (
                  <button key={w.id} onClick={() => { setSelected(w); loadExercises(w.id); }}
                    className={`w-full text-left rounded-xl p-3 transition-all ${
                      selected?.id === w.id
                        ? 'bg-violet-500/20 border border-violet-500/30'
                        : 'glass hover:bg-white/5 border border-transparent'
                    }`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">{w.title}</p>
                      {selected?.id === w.id && <span className="text-violet-400 text-xs">●</span>}
                    </div>
                    <div className="flex gap-3 mt-1">
                      {w.duration_seconds && (
                        <span className="text-xs text-slate-500">⏱ {Math.round(w.duration_seconds / 60)} min</span>
                      )}
                      {w.calories_burned && (
                        <span className="text-xs text-slate-500">🔥 {w.calories_burned} kcal</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Exercise panel */}
          {selected ? (
            <Card title={selected.title} accent="violet">
              {/* Rest Timer — shown while counting down */}
              {restTimer !== null && (
                <div className="mb-3 px-4 py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏱️</span>
                    <span className="text-sm font-bold text-violet-200">Rest Timer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-white tabular-nums">
                      {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}
                    </span>
                    <button onClick={() => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); setRestTimer(null); }}
                      className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10">
                      Skip
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={addExercise} className="space-y-2 mb-4">
                <input
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  placeholder="Muscle group (e.g. Chest)" value={eForm.muscleGroup}
                  onChange={(e) => setEForm({...eForm, muscleGroup: e.target.value})} required />
                <input
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  placeholder="Exercise name (e.g. Bench Press)" value={eForm.exerciseName}
                  onChange={(e) => { setEForm({...eForm, exerciseName: e.target.value}); fetchExHistory(e.target.value); }} required />
                {/* Progressive overload hint */}
                {exHistory.length > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                    <span className="font-bold">Last logged:</span>{' '}
                    {exHistory[0].sets}×{exHistory[0].reps} @ {exHistory[0].weight_kg}kg
                    {exHistory[0].weight_kg > 0 && (
                      <span className="text-slate-400"> · Try <span className="text-emerald-400 font-bold">{(Number(exHistory[0].weight_kg) + 2.5).toFixed(1)}kg</span> today (+2.5kg)</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {([['Sets', 'sets'], ['Reps', 'reps'], ['Weight kg', 'weightKg'], ['Rest s', 'restSeconds']] as const).map(([label, key]) => (
                    <input key={key} type="number"
                      className="w-full rounded-xl glass px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none text-center"
                      placeholder={label} value={(eForm as any)[key]}
                      onChange={(e) => setEForm({...eForm, [key]: e.target.value})} />
                  ))}
                </div>
                <button type="submit"
                  className="w-full py-2 rounded-xl bg-violet-600/80 hover:bg-violet-500/80 text-white text-xs font-bold transition-colors">
                  + Add Exercise {Number(eForm.restSeconds) > 0 ? `(then rest ${eForm.restSeconds}s)` : ''}
                </button>
              </form>

              {/* Exercise list */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {exercises.map((ex) => {
                  const prData = prMap.get(ex.exercise_name.toLowerCase());
                  const isPR = prData && ex.weight_kg > 0 &&
                    Number(ex.weight_kg) * (1 + ex.reps / 30) >= prData.estimated_1rm;
                  return (
                    <div key={ex.id} className={`glass rounded-xl p-3 ${isPR ? 'border border-yellow-500/30' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {isPR && <span className="text-yellow-400 text-sm">🏆</span>}
                          <p className="text-sm font-bold text-white">{ex.exercise_name}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${muscleColor(ex.muscle_group)}`}>
                          {ex.muscle_group}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {ex.sets}<span className="text-slate-600">×</span>{ex.reps}
                        {ex.weight_kg > 0 && <span className="text-slate-500"> @ {ex.weight_kg}kg</span>}
                        <span className="text-slate-600"> · </span>
                        <span className="text-slate-500">rest {ex.rest_seconds}s</span>
                      </p>
                    </div>
                  );
                })}
              </div>

              {exercises.length > 0 && (
                <button onClick={saveAsTemplate}
                  className="mt-3 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors">
                  📋 Save as Template
                </button>
              )}
            </Card>
          ) : (
            <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-40">
              <span className="text-4xl mb-3">👈</span>
              <p className="text-sm text-slate-500">Select a workout to manage exercises</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Templates Tab ─── */}
      {activeTab === 'templates' && (
        <div className="space-y-3">
          {templates.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold">No templates yet</p>
              <p className="text-sm mt-1">Save a workout as a template to reuse it</p>
            </div>
          )}
          {templates.map((t) => (
            <div key={t.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm">{t.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.exercises.slice(0, 4).map((ex, i) => (
                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${muscleColor(ex.muscleGroup)}`}>
                      {ex.exerciseName}
                    </span>
                  ))}
                  {t.exercises.length > 4 && <span className="text-[10px] text-slate-500">+{t.exercises.length - 4} more</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startFromTemplate(t)}
                  className="px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold transition-colors">
                  ▶ Start
                </button>
                <button onClick={() => deleteTemplate(t.id)}
                  className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── PRs Tab ─── */}
      {activeTab === 'prs' && (
        <div className="space-y-6">
          {prs.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-4xl mb-3">🏆</p>
              <p className="font-semibold">No PRs yet</p>
              <p className="text-sm mt-1">Log exercises with weight to start tracking personal records</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prs.map((pr) => (
              <div key={pr.exercise_name} className="glass rounded-2xl p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400 text-xl">🏆</span>
                  <h3 className="font-bold text-white text-sm">{pr.exercise_name}</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Top set</span>
                    <span className="text-white font-bold">{pr.weight_kg} kg × {pr.reps}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Est. 1RM</span>
                    <span className="text-yellow-400 font-bold">{pr.estimated_1rm.toFixed(1)} kg</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">
                    Achieved {new Date(pr.achieved_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Strength Standards Reference Table */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-1">📊 Strength Standards (for ~75kg athlete)</h2>
            <p className="text-xs text-slate-500 mb-4">Estimated 1RM benchmarks — Novice / Intermediate / Advanced / Elite</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/10">
                    <th className="text-left py-2 font-semibold">Exercise</th>
                    <th className="py-2 font-semibold text-slate-600">Novice</th>
                    <th className="py-2 font-semibold text-amber-700">Intermediate</th>
                    <th className="py-2 font-semibold text-blue-400">Advanced</th>
                    <th className="py-2 font-semibold text-violet-400">Elite</th>
                    <th className="py-2 font-semibold text-yellow-400">Your PR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: 'Bench Press',  standards: [60, 100, 140, 180] },
                    { name: 'Squat',        standards: [80, 120, 165, 220] },
                    { name: 'Deadlift',     standards: [100, 145, 195, 250] },
                    { name: 'Overhead Press', standards: [40, 65, 90, 120] },
                    { name: 'Barbell Row',  standards: [60, 95, 130, 170] },
                  ].map((std) => {
                    const myPR = prs.find((p) => p.exercise_name.toLowerCase().includes(std.name.toLowerCase().split(' ')[0]));
                    const my1rm = myPR?.estimated_1rm ?? 0;
                    const lvl = my1rm === 0 ? -1
                      : my1rm >= std.standards[3] ? 3
                      : my1rm >= std.standards[2] ? 2
                      : my1rm >= std.standards[1] ? 1
                      : my1rm >= std.standards[0] ? 0 : -1;
                    const lvlColors = ['text-slate-400', 'text-amber-400', 'text-blue-400', 'text-violet-400'];
                    const lvlLabels = ['Novice', 'Intermediate', 'Advanced', 'Elite'];
                    return (
                      <tr key={std.name} className="text-center">
                        <td className="text-left py-2 text-slate-300 font-medium">{std.name}</td>
                        {std.standards.map((s, i) => (
                          <td key={i} className={`py-2 ${lvl === i ? 'font-black text-white' : 'text-slate-600'}`}>{s} kg</td>
                        ))}
                        <td className={`py-2 font-bold ${lvl >= 0 ? lvlColors[lvl] : 'text-slate-600'}`}>
                          {my1rm > 0 ? `${my1rm.toFixed(0)} kg` : '—'}
                          {lvl >= 0 && <span className="block text-[10px] font-normal opacity-70">{lvlLabels[lvl]}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Analytics Tab ─── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">Volume per muscle group across last 8 weeks (total sets logged)</p>

          {/* ─── Training Load ACWR Chart ─── */}
          {volumeData.length >= 2 && (() => {
            // Compute weekly total sets per week
            const weekMap: Record<string, number> = {};
            volumeData.forEach((r) => {
              const w = r.week_start;
              weekMap[w] = (weekMap[w] ?? 0) + (r.total_sets ?? 0);
            });
            const weeks = Object.keys(weekMap).sort().slice(-8);
            if (weeks.length < 2) return null;
            const vals  = weeks.map((w) => weekMap[w]);
            // Acute = last 1 week, Chronic = trailing 4-week avg
            const acute   = vals[vals.length - 1] ?? 0;
            const chronic = vals.slice(-4).reduce((s, v) => s + v, 0) / Math.min(4, vals.length);
            const acwr    = chronic > 0 ? +(acute / chronic).toFixed(2) : 0;
            const acwrColor = acwr >= 0.8 && acwr <= 1.3 ? '#22c55e' : acwr > 1.3 && acwr <= 1.5 ? '#f59e0b' : '#ef4444';
            const acwrLabel = acwr >= 0.8 && acwr <= 1.3 ? '✅ Optimal' : acwr > 1.5 ? '🔴 Overreaching' : acwr > 1.3 ? '⚠️ Caution' : '🔵 Detraining';
            // SVG bar chart
            const W = 360; const H = 80; const P = 8;
            const maxV = Math.max(...vals, 1);
            const barW = (W - P * 2) / weeks.length - 3;
            return (
              <div className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">📈 Training Load (ACWR)</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black" style={{ color: acwrColor }}>{acwr}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full glass" style={{ color: acwrColor }}>{acwrLabel}</span>
                  </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
                  {/* Safe zone band 0.8-1.3 of chronic */}
                  {chronic > 0 && (() => {
                    const safeY1 = H - P - (Math.min(chronic * 1.3, maxV) / maxV) * (H - P * 2);
                    const safeY2 = H - P - (Math.max(chronic * 0.8, 0) / maxV) * (H - P * 2);
                    return <rect x={P} y={safeY1} width={W - P * 2} height={safeY2 - safeY1} fill="#22c55e10" />;
                  })()}
                  {weeks.map((_, i) => {
                    const v = vals[i];
                    const bh = Math.max(2, (v / maxV) * (H - P * 2));
                    const col = i === weeks.length - 1 ? acwrColor : '#6366f1';
                    return (
                      <rect key={i}
                        x={P + i * (barW + 3)} y={H - P - bh}
                        width={barW} height={bh} rx="2" fill={col} fillOpacity={i === weeks.length - 1 ? 1 : 0.5}
                      />
                    );
                  })}
                </svg>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Acute: <span className="text-white font-bold">{acute} sets</span></span>
                  <span>Chronic avg: <span className="text-white font-bold">{chronic.toFixed(0)} sets</span></span>
                  <span className="text-slate-600">green band = safe ACWR 0.8-1.3</span>
                </div>
              </div>
            );
          })()}

          {volumeData.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-4xl mb-3">📊</p>
              <p className="font-semibold">No volume data yet</p>
              <p className="text-sm mt-1">Log workouts with muscle groups to see analytics</p>
            </div>
          ) : (() => {
            // Aggregate total sets per muscle group
            const totals: Record<string, { sets: number; volume: number }> = {};
            volumeData.forEach((row) => {
              const mg = row.muscle_group || 'other';
              if (!totals[mg]) totals[mg] = { sets: 0, volume: 0 };
              totals[mg].sets   += row.total_sets ?? 0;
              totals[mg].volume += Number(row.total_volume_kg ?? 0);
            });
            const sorted = Object.entries(totals).sort((a, b) => b[1].sets - a[1].sets);
            const maxSets = sorted[0]?.[1].sets ?? 1;
            const MUSCLE_COLORS: Record<string, string> = {
              chest: '#e11d48', back: '#2563eb', legs: '#16a34a', shoulders: '#d97706',
              biceps: '#7c3aed', triceps: '#0891b2', core: '#be185d', cardio: '#f97316',
              glutes: '#65a30d', hamstrings: '#15803d', quadriceps: '#1d4ed8', calves: '#4f46e5',
            };
            return (
              <div className="glass rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-white mb-4">Muscle Group Volume (last 8 weeks)</h2>
                {sorted.map(([mg, data]) => {
                  const color = MUSCLE_COLORS[mg.toLowerCase()] ?? '#6b7280';
                  const pct = (data.sets / maxSets) * 100;
                  return (
                    <div key={mg}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium capitalize">{mg}</span>
                        <span className="text-slate-500">{data.sets} sets · {data.volume.toFixed(0)} kg total</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}

                {/* Weekly breakdown table */}
                <div className="mt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Weekly Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/10">
                          <th className="text-left py-2">Muscle</th>
                          {[...new Set(volumeData.map((r) => r.week_start))].sort().slice(-6).map((w) => (
                            <th key={w} className="py-2 text-center font-normal">
                              {new Date(w).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sorted.slice(0, 8).map(([mg]) => {
                          const weeks = [...new Set(volumeData.map((r) => r.week_start))].sort().slice(-6);
                          return (
                            <tr key={mg}>
                              <td className="py-2 text-slate-300 capitalize font-medium">{mg}</td>
                              {weeks.map((w) => {
                                const row = volumeData.find((r) => r.muscle_group === mg && r.week_start === w);
                                const sets = row?.total_sets ?? 0;
                                return (
                                  <td key={w} className="py-2 text-center">
                                    <span className={`font-bold ${sets >= 15 ? 'text-emerald-400' : sets >= 8 ? 'text-blue-400' : sets > 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                                      {sets > 0 ? sets : '—'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">🟢 ≥15 sets · 🔵 ≥8 sets · Gray &lt;8 sets per week</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'workouts' | 'templates' | 'prs'>('workouts');
  const [newPRFlash, setNewPRFlash] = useState<string | null>(null);

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
  useEffect(() => { loadWorkouts(); loadPRs(); loadTemplates(); }, []);

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
      setEForm(emptyE); loadExercises(selected.id);
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Workouts 🏋️</h1>
        <p className="text-slate-500 text-sm mt-1">Plan, log and track your training</p>
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
      <div className="flex gap-2">
        {([
          ['workouts', '🏋️ Workouts'],
          ['templates', `📋 Templates (${templates.length})`],
          ['prs', `🏆 PRs (${prs.length})`],
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
              <form onSubmit={addExercise} className="space-y-2 mb-4">
                <input
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  placeholder="Muscle group (e.g. Chest)" value={eForm.muscleGroup}
                  onChange={(e) => setEForm({...eForm, muscleGroup: e.target.value})} required />
                <input
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  placeholder="Exercise name (e.g. Bench Press)" value={eForm.exerciseName}
                  onChange={(e) => setEForm({...eForm, exerciseName: e.target.value})} required />
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
                  + Add Exercise
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
        <div className="space-y-3">
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
        </div>
      )}
    </div>
  );
}

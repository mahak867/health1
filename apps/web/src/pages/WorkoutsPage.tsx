import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Workout { id: string; title: string; duration_seconds: number|null; calories_burned: number|null; started_at: string|null; completed_at: string|null; }
interface Exercise { id: string; muscle_group: string; exercise_name: string; sets: number; reps: number; weight_kg: number; rest_seconds: number; }

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
  const [wForm, setWForm] = useState(emptyW);
  const [eForm, setEForm] = useState(emptyE);
  const [error, setError] = useState('');

  function loadWorkouts() {
    api.get<{ workouts: Workout[] }>('/fitness/workouts').then((r) => setWorkouts(r.workouts));
  }
  function loadExercises(id: string) {
    api.get<{ exercises: Exercise[] }>(`/fitness/workouts/${id}/exercises`).then((r) => setExercises(r.exercises));
  }
  useEffect(() => { loadWorkouts(); }, []);

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

  async function addExercise(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return;
    try {
      await api.post(`/fitness/workouts/${selected.id}/exercises`, {
        muscleGroup: eForm.muscleGroup, exerciseName: eForm.exerciseName,
        sets: Number(eForm.sets), reps: Number(eForm.reps),
        weightKg: Number(eForm.weightKg), restSeconds: Number(eForm.restSeconds)
      });
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create workout */}
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
              {exercises.map((ex) => (
                <div key={ex.id} className="glass rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-white">{ex.exercise_name}</p>
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
              ))}
            </div>
          </Card>
        ) : (
          <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-40">
            <span className="text-4xl mb-3">👈</span>
            <p className="text-sm text-slate-500">Select a workout to manage exercises</p>
          </div>
        )}
      </div>
    </div>
  );
}

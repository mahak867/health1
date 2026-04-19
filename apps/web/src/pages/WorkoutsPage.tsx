import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Workout { id: string; title: string; duration_seconds: number|null; calories_burned: number|null; started_at: string|null; completed_at: string|null; }
interface Exercise { id: string; muscle_group: string; exercise_name: string; sets: number; reps: number; weight_kg: number; rest_seconds: number; }

const emptyW = { title: '', durationSeconds: '', caloriesBurned: '' };
const emptyE = { muscleGroup: '', exerciseName: '', sets: '3', reps: '10', weightKg: '0', restSeconds: '60' };

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
      if (wForm.caloriesBurned) body.caloriesBurned = Number(wForm.caloriesBurned);
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Workouts</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Create Workout">
          <form onSubmit={createWorkout} className="space-y-2">
            <input className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Title" value={wForm.title} onChange={(e) => setWForm({...wForm, title: e.target.value})} required />
            <input type="number" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Duration (seconds)" value={wForm.durationSeconds} onChange={(e) => setWForm({...wForm, durationSeconds: e.target.value})} />
            <input type="number" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Calories Burned" value={wForm.caloriesBurned} onChange={(e) => setWForm({...wForm, caloriesBurned: e.target.value})} />
            <button type="submit" className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">Create</button>
          </form>
        </Card>
        <Card title="My Workouts">
          {workouts.length === 0 ? <p className="text-sm text-slate-500">No workouts yet.</p> : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {workouts.map((w) => (
                <button key={w.id} onClick={() => { setSelected(w); loadExercises(w.id); }}
                  className={`w-full text-left rounded p-2 text-sm ${selected?.id === w.id ? 'bg-emerald-800' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  <p className="font-medium">{w.title}</p>
                  <p className="text-xs text-slate-400">{w.duration_seconds ? `${Math.round(w.duration_seconds/60)} min` : '—'}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
        {selected && (
          <Card title={`Exercises — ${selected.title}`}>
            <form onSubmit={addExercise} className="space-y-2 mb-3">
              {[['Muscle Group', 'muscleGroup'], ['Exercise Name', 'exerciseName']].map(([label, key]) => (
                <input key={key} className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder={label} value={(eForm as any)[key]} onChange={(e) => setEForm({...eForm, [key]: e.target.value})} required />
              ))}
              <div className="grid grid-cols-2 gap-2">
                {[['Sets', 'sets'], ['Reps', 'reps'], ['Weight (kg)', 'weightKg'], ['Rest (s)', 'restSeconds']].map(([label, key]) => (
                  <input key={key} type="number" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder={label} value={(eForm as any)[key]} onChange={(e) => setEForm({...eForm, [key]: e.target.value})} />
                ))}
              </div>
              <button type="submit" className="w-full py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm">Add Exercise</button>
            </form>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {exercises.map((ex) => (
                <div key={ex.id} className="text-xs bg-slate-800 rounded p-2">
                  <p className="font-medium">{ex.exercise_name} <span className="text-slate-400">({ex.muscle_group})</span></p>
                  <p className="text-slate-400">{ex.sets}×{ex.reps} @ {ex.weight_kg}kg · rest {ex.rest_seconds}s</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Meal { id: string; meal_type: string; meal_name: string; consumed_at: string; calories: number|null; protein_g: number|null; carbs_g: number|null; fat_g: number|null; }

const emptyM = { mealType: 'breakfast', mealName: '', consumedAt: new Date().toISOString().slice(0, 16), calories: '', proteinG: '', carbsG: '', fatG: '' };

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [form, setForm] = useState(emptyM);
  const [error, setError] = useState('');

  function load() {
    api.get<{ meals: Meal[] }>('/nutrition/meals').then((r) => setMeals(r.meals));
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const body: any = { mealType: form.mealType, mealName: form.mealName, consumedAt: new Date(form.consumedAt).toISOString() };
      if (form.calories) body.calories = Number(form.calories);
      if (form.proteinG) body.proteinG = Number(form.proteinG);
      if (form.carbsG) body.carbsG = Number(form.carbsG);
      if (form.fatG) body.fatG = Number(form.fatG);
      await api.post('/nutrition/meals', body);
      setForm(emptyM); load();
    } catch (err: any) { setError(err.message); }
  }

  const todayMeals = meals.filter((m) => new Date(m.consumed_at).toDateString() === new Date().toDateString());
  const totalCal = todayMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalPro = todayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Meals & Nutrition</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-emerald-900/30 p-4">
          <p className="text-sm text-slate-400">Today's Calories</p>
          <p className="text-3xl font-bold text-emerald-400">{totalCal} kcal</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-blue-900/30 p-4">
          <p className="text-sm text-slate-400">Today's Protein</p>
          <p className="text-3xl font-bold text-blue-400">{totalPro.toFixed(0)} g</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Log Meal">
          <form onSubmit={handleSubmit} className="space-y-2">
            <select className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" value={form.mealType} onChange={(e) => setForm({...form, mealType: e.target.value})}>
              {['breakfast', 'lunch', 'dinner', 'snack'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Meal Name" value={form.mealName} onChange={(e) => setForm({...form, mealName: e.target.value})} required />
            <input type="datetime-local" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" value={form.consumedAt} onChange={(e) => setForm({...form, consumedAt: e.target.value})} required />
            <div className="grid grid-cols-2 gap-2">
              {[['Calories (kcal)', 'calories'], ['Protein (g)', 'proteinG'], ['Carbs (g)', 'carbsG'], ['Fat (g)', 'fatG']].map(([label, key]) => (
                <input key={key} type="number" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder={label} value={(form as any)[key]} onChange={(e) => setForm({...form, [key]: e.target.value})} />
              ))}
            </div>
            <button type="submit" className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">Log Meal</button>
          </form>
        </Card>
        <Card title="Recent Meals">
          {meals.length === 0 ? <p className="text-sm text-slate-500">No meals logged.</p> : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {meals.map((m) => (
                <div key={m.id} className="text-xs bg-slate-800 rounded p-2">
                  <p className="font-medium">{m.meal_name} <span className="text-slate-400">({m.meal_type})</span></p>
                  <p className="text-slate-400">{new Date(m.consumed_at).toLocaleString()}</p>
                  <p className="text-slate-300">{m.calories ?? '—'} kcal · P {m.protein_g ?? '—'}g · C {m.carbs_g ?? '—'}g · F {m.fat_g ?? '—'}g</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

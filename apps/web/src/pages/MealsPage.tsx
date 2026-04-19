import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Ring from '../components/Ring';
import { api } from '../lib/api';

interface Meal { id: string; meal_type: string; meal_name: string; consumed_at: string; calories: number|null; protein_g: number|null; carbs_g: number|null; fat_g: number|null; }

const emptyM = { mealType: 'breakfast', mealName: '', consumedAt: new Date().toISOString().slice(0, 16), calories: '', proteinG: '', carbsG: '', fatG: '' };

const MEAL_TYPE_STYLE: Record<string, string> = {
  breakfast: 'bg-amber-500/20 text-amber-300',
  lunch:     'bg-emerald-500/20 text-emerald-300',
  dinner:    'bg-blue-500/20 text-blue-300',
  snack:     'bg-violet-500/20 text-violet-300',
};
const MEAL_TYPE_ICON: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
};

function MacroBar({ label, value, max, color, unit = 'g' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-white font-bold">{value.toFixed(0)}<span className="text-slate-500 font-normal"> / {max}{unit}</span></span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

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
      if (form.carbsG)   body.carbsG   = Number(form.carbsG);
      if (form.fatG)     body.fatG     = Number(form.fatG);
      await api.post('/nutrition/meals', body);
      setForm(emptyM); load();
    } catch (err: any) { setError(err.message); }
  }

  const today = meals.filter((m) => new Date(m.consumed_at).toDateString() === new Date().toDateString());
  const totalCal  = today.reduce((s, m) => s + (m.calories  ?? 0), 0);
  const totalPro  = today.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const totalCarb = today.reduce((s, m) => s + (m.carbs_g   ?? 0), 0);
  const totalFat  = today.reduce((s, m) => s + (m.fat_g     ?? 0), 0);

  // Reasonable default targets
  const calTarget  = 2000;
  const proTarget  = 150;
  const carbTarget = 250;
  const fatTarget  = 65;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Nutrition 🥗</h1>
        <p className="text-slate-500 text-sm mt-1">Track your daily food intake and macros</p>
      </div>

      {/* MFP-style calorie + macro panel */}
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">Today's Summary</p>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Calorie ring (center piece) */}
          <div className="shrink-0">
            <Ring value={(totalCal / calTarget) * 100} color="#ff6200" trackColor="#2a1500" size={120} strokeWidth={11}>
              <div className="text-center">
                <p className="text-xl font-black text-white leading-none">{totalCal}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wide">kcal</p>
              </div>
            </Ring>
            <p className="text-center text-[10px] text-slate-500 mt-2">of {calTarget} goal</p>
          </div>

          {/* Macro bars */}
          <div className="flex-1 w-full space-y-4">
            <MacroBar label="Protein"      value={totalPro}  max={proTarget}  color="#2563eb" />
            <MacroBar label="Carbohydrates" value={totalCarb} max={carbTarget} color="#f59e0b" />
            <MacroBar label="Fat"           value={totalFat}  max={fatTarget}  color="#e11d48" />
          </div>

          {/* Mini macro rings */}
          <div className="flex gap-4 shrink-0">
            <Ring value={(totalPro / proTarget) * 100}   color="#2563eb" trackColor="#00103a" size={60} strokeWidth={6}
              label={`${totalPro.toFixed(0)}g`} sublabel="Protein" />
            <Ring value={(totalCarb / carbTarget) * 100} color="#f59e0b" trackColor="#1c1200" size={60} strokeWidth={6}
              label={`${totalCarb.toFixed(0)}g`} sublabel="Carbs" />
            <Ring value={(totalFat / fatTarget) * 100}   color="#e11d48" trackColor="#2a0012" size={60} strokeWidth={6}
              label={`${totalFat.toFixed(0)}g`} sublabel="Fat" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Log form */}
        <Card title="Log Meal" accent="orange">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((t) => (
                <button type="button" key={t}
                  onClick={() => setForm({...form, mealType: t})}
                  className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    form.mealType === t
                      ? 'gradient-orange text-white'
                      : 'glass text-slate-400 hover:text-white'
                  }`}>
                  {MEAL_TYPE_ICON[t]}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-slate-500 capitalize">{MEAL_TYPE_ICON[form.mealType]} {form.mealType}</p>
            <input
              className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              placeholder="Meal name (e.g. Chicken & Rice)" value={form.mealName}
              onChange={(e) => setForm({...form, mealName: e.target.value})} required />
            <input type="datetime-local"
              className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              value={form.consumedAt} onChange={(e) => setForm({...form, consumedAt: e.target.value})} required />
            <div className="grid grid-cols-2 gap-2">
              {[['Calories (kcal)', 'calories'], ['Protein (g)', 'proteinG'], ['Carbs (g)', 'carbsG'], ['Fat (g)', 'fatG']].map(([label, key]) => (
                <input key={key} type="number"
                  className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                  placeholder={label} value={(form as any)[key]}
                  onChange={(e) => setForm({...form, [key]: e.target.value})} />
              ))}
            </div>
            <button type="submit"
              className="w-full py-2.5 rounded-xl gradient-orange glow-orange text-white text-sm font-bold hover:scale-[1.02] transition-transform">
              + Log Meal
            </button>
          </form>
        </Card>

        {/* Food diary */}
        <Card title="Food Diary" accent="orange">
          {meals.length === 0 ? (
            <p className="text-sm text-slate-600">No meals logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {meals.map((m) => (
                <div key={m.id} className="glass rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white">{m.meal_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{new Date(m.consumed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${MEAL_TYPE_STYLE[m.meal_type] ?? 'bg-slate-500/20 text-slate-300'}`}>
                      {MEAL_TYPE_ICON[m.meal_type]} {m.meal_type}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {m.calories   != null && <span className="text-xs text-orange-300 font-semibold">🔥 {m.calories} kcal</span>}
                    {m.protein_g  != null && <span className="text-xs text-blue-300 font-semibold">P {m.protein_g}g</span>}
                    {m.carbs_g    != null && <span className="text-xs text-amber-300 font-semibold">C {m.carbs_g}g</span>}
                    {m.fat_g      != null && <span className="text-xs text-rose-300 font-semibold">F {m.fat_g}g</span>}
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

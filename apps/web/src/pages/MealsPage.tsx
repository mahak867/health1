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
  const [tab, setTab] = useState<'log' | 'search' | 'recipes' | 'water'>('log');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipeForm, setRecipeForm] = useState({ name: '', ingredients: [] as any[] });
  const [ingForm, setIngForm] = useState({ name: '', quantityG: '', calories: '', proteinG: '', carbsG: '', fatG: '' });
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  // Dynamic macro targets from training mode
  const [modeTargets, setModeTargets] = useState<{ targetCalories: number; proteinGrams: number } | null>(null);

  const WATER_GOAL = 2500;

  function load() {
    api.get<{ meals: Meal[] }>('/nutrition/meals').then((r) => setMeals(r.meals));
  }
  function loadRecipes() {
    api.get<{ recipes: any[] }>('/nutrition/recipes').then((r) => setRecipes(r.recipes)).catch(() => {});
  }
  function loadWater() {
    api.get<{ logs: any[]; totalMl: number }>('/health/water').then((r) => {
      setWaterTotal(r.totalMl);
      setWaterLogs(r.logs);
    }).catch(() => {});
  }
  useEffect(() => {
    load(); loadRecipes(); loadWater();
    api.get<{ mode: any }>('/modes/my').then((r) => {
      if (r.mode?.targets) setModeTargets(r.mode.targets);
    }).catch(() => {});
  }, []);

  async function logWater(ml: number) {
    try {
      await api.post('/health/water', { milliliters: ml, loggedAt: new Date().toISOString() });
      loadWater();
    } catch (_) {}
  }

  async function searchFood() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await api.get<{ products: any[] }>(`/nutrition/food/search?q=${encodeURIComponent(searchQuery)}&pageSize=8`);
      setSearchResults(r.products);
    } catch (_) { setSearchResults([]); } finally { setSearching(false); }
  }

  async function searchBarcode() {
    if (!barcode.trim()) return;
    setSearching(true);
    try {
      const r = await api.get<{ product: any }>(`/nutrition/food/barcode/${barcode.trim()}`);
      setSearchResults([r.product]);
    } catch (_) { setSearchResults([]); } finally { setSearching(false); }
  }

  function fillFromProduct(p: any) {
    setForm((f) => ({
      ...f,
      mealName: p.name,
      calories: String(p.per100g.calories),
      proteinG: String(p.per100g.proteinG),
      carbsG:   String(p.per100g.carbsG),
      fatG:     String(p.per100g.fatG),
    }));
    setTab('log');
  }

  function addIngredient() {
    if (!ingForm.name) return;
    setRecipeForm((f) => ({
      ...f,
      ingredients: [...f.ingredients, {
        name: ingForm.name,
        quantityG: Number(ingForm.quantityG) || 100,
        calories: Number(ingForm.calories) || 0,
        proteinG: Number(ingForm.proteinG) || 0,
        carbsG:   Number(ingForm.carbsG)   || 0,
        fatG:     Number(ingForm.fatG)     || 0,
      }]
    }));
    setIngForm({ name: '', quantityG: '', calories: '', proteinG: '', carbsG: '', fatG: '' });
  }

  async function saveRecipe() {
    if (!recipeForm.name || recipeForm.ingredients.length === 0) return;
    try {
      await api.post('/nutrition/recipes', recipeForm);
      setRecipeForm({ name: '', ingredients: [] });
      loadRecipes();
    } catch (err: any) { setError(err.message); }
  }

  async function deleteRecipe(id: string) {
    try { await api.delete(`/nutrition/recipes/${id}`); loadRecipes(); } catch (_) {}
  }

  async function logRecipeAsMeal(recipe: any) {
    try {
      await api.post('/nutrition/meals', {
        mealType: 'snack', mealName: recipe.name,
        consumedAt: new Date().toISOString(),
        calories:  recipe.total_calories,
        proteinG:  recipe.total_protein_g,
        carbsG:    recipe.total_carbs_g,
        fatG:      recipe.total_fat_g,
      });
      load();
    } catch (_) {}
  }

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

  // Net calories: consumed - burned today (pulled from weekly summary on Dashboard)
  const [burnedToday, setBurnedToday] = React.useState(0);
  React.useEffect(() => {
    api.get<any>('/gamification/weekly-summary').then((r) => {
      // daily burned = weekly calories burned / days with workouts (approx today's share)
      const weeklyBurned = r.workouts?.caloriesBurned ?? 0;
      const workoutsThisWeek = r.workouts?.count ?? 1;
      const todayEstimate = workoutsThisWeek > 0 ? Math.round(weeklyBurned / workoutsThisWeek) : 0;
      setBurnedToday(todayEstimate);
    }).catch(() => {});
  }, []);

  // Reasonable default targets
  const calTarget  = modeTargets?.targetCalories ?? 2000;
  const proTarget  = modeTargets?.proteinGrams ?? 150;
  const carbTarget = calTarget > 0 ? Math.round((calTarget * 0.45) / 4) : 250;  // 45% cals from carbs
  const fatTarget  = calTarget > 0 ? Math.round((calTarget * 0.25) / 9) : 65;   // 25% cals from fat

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Nutrition 🥗</h1>
        <p className="text-slate-500 text-sm mt-1">Track your daily food intake and macros</p>
      </div>

      {error && <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([['log','📝 Log Meal'],['search','🔍 Food Search'],['recipes','📖 Recipes'],['water','💧 Hydration']] as const).map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${tab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* MFP-style calorie + macro panel */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Today's Summary</p>
          {/* Net calories remaining pill */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            calTarget - totalCal > 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
          }`}>
            {calTarget - totalCal > 0
              ? `${calTarget - totalCal} kcal remaining`
              : `${totalCal - calTarget} kcal over goal`}
          </div>
        </div>
        {modeTargets && <p className="text-[10px] text-slate-600 -mt-2 mb-4">Targets from your active training mode · <span className="text-violet-400">Profile → Training Mode to adjust</span></p>}
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

      {/* ─── Macro Donut + Net Calories ─── */}
      {(totalPro > 0 || totalCarb > 0 || totalFat > 0) && (() => {
        const proCal  = totalPro  * 4;
        const carbCal = totalCarb * 4;
        const fatCal  = totalFat  * 9;
        const macroTotal = proCal + carbCal + fatCal || 1;
        // SVG donut
        const R = 46; const cx = 60; const cy = 60; const stroke = 18;
        const circ = 2 * Math.PI * R;
        let offset = 0;
        const slices = [
          { val: proCal,  color: '#2563eb', label: 'P' },
          { val: carbCal, color: '#f59e0b', label: 'C' },
          { val: fatCal,  color: '#e11d48', label: 'F' },
        ];
        const paths = slices.map((s) => {
          const frac = s.val / macroTotal;
          const dash = frac * circ;
          const el = (
            <circle key={s.label}
              cx={cx} cy={cy} r={R}
              fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset * circ}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
          offset += frac;
          return el;
        });
        const netCal = totalCal - burnedToday;
        const netColor = netCal <= calTarget ? '#22c55e' : '#ef4444';
        return (
          <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-8">
            {/* Donut */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Macro Split</p>
              <svg width={120} height={120} viewBox="0 0 120 120">
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="#ffffff08" strokeWidth={stroke} />
                {paths}
                <text x={cx} y={cy - 5}  textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{totalCal}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill="#6b7280" fontSize="8">kcal eaten</text>
              </svg>
              <div className="flex gap-3 text-[10px]">
                {[['P', '#2563eb', totalPro], ['C', '#f59e0b', totalCarb], ['F', '#e11d48', totalFat]].map(([l, c, v]) => (
                  <span key={String(l)} style={{ color: String(c) }} className="font-bold">
                    {l} {Number(v).toFixed(0)}g ({Math.round((Number(l === 'F' ? v as number * 9 : v as number * 4) / macroTotal) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
            {/* Net calories card */}
            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🍽️', label: 'Consumed',  val: totalCal,   color: '#f97316' },
                  { icon: '🔥', label: 'Burned',    val: burnedToday, color: '#ef4444' },
                  { icon: '⚡', label: 'Net',       val: netCal,     color: netColor  },
                ].map(({ icon, label, val, color }) => (
                  <div key={label} className="glass rounded-xl p-3 text-center">
                    <p className="text-lg mb-0.5">{icon}</p>
                    <p className="text-lg font-black" style={{ color }}>{val.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">{label} kcal</p>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>🎯 Goal: <span className="text-white font-bold">{calTarget} kcal</span>
                   {netCal <= calTarget
                     ? <span className="text-emerald-400 ml-2">· {calTarget - netCal} left</span>
                     : <span className="text-rose-400 ml-2">· {netCal - calTarget} over</span>}
                </p>
                <p className="text-[10px]">Net = consumed − exercise calories. Burned is estimated from today's workouts.</p>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* ─── Food Search Tab ─── */}
      {tab === 'search' && (
        <div className="space-y-4">
          {/* Name search */}
          <div className="glass rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white mb-3">🔍 Search by Name</h2>
            <div className="flex gap-2">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchFood()}
                placeholder="e.g. chicken breast, banana, oatmeal"
                className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-orange-500/50" />
              <button onClick={searchFood} disabled={searching}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-50">
                {searching ? '…' : 'Search'}
              </button>
            </div>
          </div>
          {/* Barcode lookup */}
          <div className="glass rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white mb-3">📦 Lookup by Barcode</h2>
            <div className="flex gap-2">
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchBarcode()}
                placeholder="EAN/UPC barcode number"
                className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-orange-500/50" />
              <button onClick={searchBarcode} disabled={searching}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-50">
                {searching ? '…' : 'Scan'}
              </button>
            </div>
          </div>
          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((p, i) => (
                <div key={i} className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                    {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      <span className="text-orange-300">🔥 {p.per100g.calories} kcal</span>
                      <span className="text-blue-300">P {p.per100g.proteinG}g</span>
                      <span className="text-amber-300">C {p.per100g.carbsG}g</span>
                      <span className="text-rose-300">F {p.per100g.fatG}g</span>
                      <span className="text-slate-500">per 100g</span>
                    </div>
                  </div>
                  <button onClick={() => fillFromProduct(p)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold">
                    Use
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchResults.length === 0 && !searching && (searchQuery || barcode) && (
            <p className="text-center text-slate-500 text-sm py-8">No results found. Try a different search term.</p>
          )}
        </div>
      )}

      {/* ─── Recipes Tab ─── */}
      {tab === 'recipes' && (
        <div className="space-y-6">
          {/* Build recipe */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4">📖 Build a Recipe</h2>
            <input value={recipeForm.name} onChange={(e) => setRecipeForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Recipe name" className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-orange-500/50 mb-3" />
            {/* Add ingredient */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {[['Name', 'name', 'text'], ['Qty (g)', 'quantityG', 'number'], ['Kcal', 'calories', 'number'], ['Protein g', 'proteinG', 'number'], ['Carbs g', 'carbsG', 'number'], ['Fat g', 'fatG', 'number']].map(([label, key, type]) => (
                <input key={key} type={type} placeholder={label} value={(ingForm as any)[key]}
                  onChange={(e) => setIngForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-orange-500/50" />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addIngredient} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold">+ Add Ingredient</button>
              <button onClick={saveRecipe} disabled={!recipeForm.name || recipeForm.ingredients.length === 0}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40">Save Recipe</button>
            </div>
            {recipeForm.ingredients.length > 0 && (
              <div className="mt-4 space-y-1">
                {recipeForm.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-400 px-2">
                    <span>{ing.name} ({ing.quantityG}g)</span>
                    <span>{ing.calories} kcal · P{ing.proteinG} C{ing.carbsG} F{ing.fatG}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2 mt-2 text-xs font-bold text-white px-2 flex justify-between">
                  <span>Total:</span>
                  <span>
                    {recipeForm.ingredients.reduce((s, i) => s + i.calories, 0)} kcal ·
                    P{recipeForm.ingredients.reduce((s, i) => s + i.proteinG, 0)}g ·
                    C{recipeForm.ingredients.reduce((s, i) => s + i.carbsG, 0)}g ·
                    F{recipeForm.ingredients.reduce((s, i) => s + i.fatG, 0)}g
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Saved recipes */}
          {recipes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Saved Recipes</h2>
              {recipes.map((r) => (
                <div key={r.id} className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{r.name}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs">
                      <span className="text-orange-300">🔥 {Math.round(r.total_calories)} kcal</span>
                      <span className="text-blue-300">P {Number(r.total_protein_g).toFixed(1)}g</span>
                      <span className="text-amber-300">C {Number(r.total_carbs_g).toFixed(1)}g</span>
                      <span className="text-rose-300">F {Number(r.total_fat_g).toFixed(1)}g</span>
                      <span className="text-slate-500">{(r.ingredients as any[]).length} ingredients</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => logRecipeAsMeal(r)}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold">Log</button>
                    <button onClick={() => deleteRecipe(r.id)}
                      className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Water Tab ─── */}
      {tab === 'water' && (
        <div className="space-y-6">
          {/* Daily progress */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">💧 Daily Hydration</h2>
              <span className="text-lg font-black text-cyan-400">{(waterTotal / 1000).toFixed(2)} L</span>
            </div>
            <div className="relative h-4 rounded-full bg-white/5 overflow-hidden mb-3">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{ width: `${Math.min((waterTotal / WATER_GOAL) * 100, 100)}%`, background: 'linear-gradient(90deg,#06b6d4,#3b82f6)' }} />
            </div>
            <p className="text-sm text-slate-400 text-center">
              {waterTotal} ml / {WATER_GOAL} ml goal
              {waterTotal >= WATER_GOAL && ' ✅ Goal reached!'}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: 8 }).map((_, i) => {
                const glassSize = WATER_GOAL / 8;
                const filled = waterTotal >= glassSize * (i + 1);
                const partial = !filled && waterTotal > glassSize * i;
                return (
                  <div key={i} className={`text-2xl transition-all ${filled ? 'opacity-100' : partial ? 'opacity-60' : 'opacity-20'}`}>
                    💧
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick add buttons */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-4">Quick Add</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Small Glass', ml: 200, icon: '🥛' },
                { label: 'Glass', ml: 250, icon: '🥤' },
                { label: 'Large Glass', ml: 350, icon: '🫗' },
                { label: 'Bottle', ml: 500, icon: '🍶' },
                { label: 'Large Bottle', ml: 750, icon: '🧃' },
                { label: '1 Litre', ml: 1000, icon: '💧' },
                { label: 'Post-Workout', ml: 600, icon: '🏋️' },
                { label: 'With Coffee', ml: 300, icon: '☕' },
              ].map((opt) => (
                <button key={`${opt.ml}-${opt.label}`} onClick={() => logWater(opt.ml)}
                  className="flex flex-col items-center gap-1.5 p-3 glass rounded-xl hover:bg-cyan-500/10 border border-white/5 transition-all active:scale-95">
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-bold text-white">{opt.ml} ml</span>
                  <span className="text-[10px] text-slate-500">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {waterLogs.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Today's Log</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {waterLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-slate-400">{new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-cyan-300 font-bold">💧 {log.milliliters} ml</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import Ring from '../components/Ring';
import BodyMap from '../components/BodyMap';
import { api } from '../lib/api';

interface Tier { name: string; min: number; }
interface RankResult {
  current: Tier;
  next: Tier | null;
  progress: number;
}
interface RankingEntry {
  id: string;
  muscle_group: string;
  score: number;
  tier: string;
  consistency_factor: number;
  updated_at: string;
}

const TIER_STYLES: Record<string, { color: string; glow: string; badge: string }> = {
  beginner: { color: '#64748b', glow: '#64748b33', badge: 'bg-slate-500/20 text-slate-300' },
  bronze:   { color: '#cd7f32', glow: '#cd7f3233', badge: 'bg-amber-800/20 text-amber-400' },
  silver:   { color: '#94a3b8', glow: '#94a3b833', badge: 'bg-slate-400/20 text-slate-200' },
  gold:     { color: '#f59e0b', glow: '#f59e0b33', badge: 'bg-yellow-500/20 text-yellow-300' },
  platinum: { color: '#38bdf8', glow: '#38bdf833', badge: 'bg-sky-500/20 text-sky-300' },
  diamond:  { color: '#818cf8', glow: '#818cf833', badge: 'bg-indigo-500/20 text-indigo-300' },
  elite:    { color: '#f43f5e', glow: '#f43f5e33', badge: 'bg-rose-500/20 text-rose-300' },
};

const TIER_EMOJI: Record<string, string> = {
  beginner: '🌱', bronze: '🥉', silver: '🥈', gold: '🥇',
  platinum: '💎', diamond: '💠', elite: '👑',
};

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

const defaultForm = {
  muscleGroup: 'chest',
  weightKg: '80',
  reps: '8',
  workoutsPerWeek: '4',
  streakDays: '10',
  volumeProgression: '0.5',
};

export default function RankingPage() {
  const [form, setForm]               = useState(defaultForm);
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const [previewRank, setPreviewRank]   = useState<RankResult | null>(null);
  const [myRankings, setMyRankings]     = useState<RankingEntry[]>([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [saved, setSaved]               = useState(false);

  function loadMyRankings() {
    api.get<{ rankings: RankingEntry[] }>('/ranking/my')
      .then((r) => setMyRankings(r.rankings))
      .catch(() => {});
  }

  useEffect(() => { loadMyRankings(); }, []);

  /* Build tierMap: saved data + live preview for currently-selected group */
  const tierMap = useMemo(() => {
    const map: Record<string, string> = {};
    myRankings.forEach(r => { map[r.muscle_group] = r.tier; });
    if (previewRank) map[form.muscleGroup] = previewRank.current.name;
    return map;
  }, [myRankings, previewRank, form.muscleGroup]);

  /* When user clicks a body-map region, switch the form's muscle group */
  function handleBodySelect(group: string) {
    setForm(f => ({ ...f, muscleGroup: group }));
    setPreviewRank(null);
    setPreviewScore(null);
    setSaved(false);
  }

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true); setSaved(false);
    try {
      const params = new URLSearchParams({
        muscleGroup:       form.muscleGroup,
        weightKg:          form.weightKg,
        reps:              form.reps,
        workoutsPerWeek:   form.workoutsPerWeek,
        streakDays:        form.streakDays,
        volumeProgression: form.volumeProgression,
      });
      const res = await api.get<{ muscleGroup: string; score: number; rank: RankResult }>(
        `/ranking/muscle?${params.toString()}`
      );
      setPreviewScore(res.score);
      setPreviewRank(res.rank);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRanking() {
    if (!previewRank) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.post('/ranking/my', {
        muscleGroup:       form.muscleGroup,
        weightKg:          Number(form.weightKg),
        reps:              Number(form.reps),
        workoutsPerWeek:   Number(form.workoutsPerWeek),
        streakDays:        Number(form.streakDays),
        volumeProgression: Number(form.volumeProgression),
      });
      setSaved(true);
      loadMyRankings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const tierStyle = previewRank
    ? (TIER_STYLES[previewRank.current.name] ?? TIER_STYLES['beginner'])
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-black text-white">Muscle Ranking 🏆</h1>
        <p className="text-slate-500 text-sm mt-1">
          Click a muscle group on the body map, enter your stats, and see your tier
        </p>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Main layout: body-map | form | result ──────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[auto_1fr_1fr]">

        {/* ── Body map ─────────────────────────────────────────────── */}
        <div className="glass rounded-2xl p-5 flex flex-col items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 self-start w-full">
            Body Map
          </p>
          <BodyMap
            tierMap={tierMap}
            selected={form.muscleGroup}
            onSelect={handleBodySelect}
          />
        </div>

        {/* ── Calculator form ──────────────────────────────────────── */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Rank Calculator
          </p>

          {/* Selected muscle badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${muscleColor(form.muscleGroup)}`}>
              {form.muscleGroup}
            </span>
            <span className="text-xs text-slate-500">← tap body map to change</span>
          </div>

          <form onSubmit={calculate} className="space-y-3">
            {/* Numeric inputs */}
            <div className="grid grid-cols-2 gap-2">
              {([
                ['Weight (kg)', 'weightKg',        '0',  '1000'],
                ['Reps',        'reps',             '1',  '100' ],
                ['Workouts/wk', 'workoutsPerWeek',  '0',  '14'  ],
                ['Streak (d)',  'streakDays',        '0',  '365' ],
              ] as const).map(([label, key, min, max]) => (
                <div key={key}>
                  <p className="text-[11px] text-slate-500 mb-1">{label}</p>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={key === 'weightKg' ? '0.5' : '1'}
                    className="w-full rounded-xl glass px-3 py-2.5 text-sm text-white
                      placeholder-slate-600 focus:outline-none focus:ring-1
                      focus:ring-orange-500/40 text-center"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required
                  />
                </div>
              ))}
            </div>

            {/* Volume progression slider */}
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-[11px] text-slate-500">Volume Progression</p>
                <p className="text-[11px] text-orange-400 font-bold">
                  {Math.round(Number(form.volumeProgression) * 100)}%
                </p>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                className="w-full accent-orange-500"
                value={form.volumeProgression}
                onChange={(e) => setForm({ ...form, volumeProgression: e.target.value })}
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>Declining</span><span>Stable</span><span>Improving</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl gradient-orange glow-orange text-white text-sm
                font-bold hover:scale-[1.02] active:scale-[0.97] transition-transform
                disabled:opacity-60"
            >
              {loading ? 'Calculating…' : 'Calculate Rank 🏆'}
            </button>
          </form>
        </div>

        {/* ── Rank result ──────────────────────────────────────────── */}
        {previewRank && tierStyle ? (
          <div className="glass rounded-2xl p-5 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your Rank</p>

            {/* Ring + tier name */}
            <div className="flex flex-col items-center gap-3 py-1">
              <Ring
                value={previewRank.progress}
                color={tierStyle.color}
                trackColor={tierStyle.glow}
                size={110}
                strokeWidth={10}
                label={`${previewRank.progress.toFixed(0)}%`}
                sublabel="to next tier"
              >
                <span className="text-3xl">{TIER_EMOJI[previewRank.current.name] ?? '🏅'}</span>
              </Ring>
              <div className="text-center">
                <p className="text-2xl font-black text-white capitalize">{previewRank.current.name}</p>
                <p className="text-slate-500 text-sm">
                  Score: <span className="text-white font-bold">{previewScore?.toFixed(0)}</span>
                </p>
                {previewRank.next && (
                  <p className="text-xs text-slate-600 mt-1">
                    Next: <span className="capitalize text-slate-400">{previewRank.next.name}</span>
                    {' '}(need {previewRank.next.min} pts)
                  </p>
                )}
              </div>
            </div>

            {/* Tier ladder */}
            <div className="space-y-1">
              {(['beginner', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'elite'] as const).map(tier => {
                const isActive = previewRank.current.name === tier;
                const style    = TIER_STYLES[tier];
                return (
                  <div
                    key={tier}
                    className={`flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all ${
                      isActive ? 'glass-heavy' : 'opacity-40'
                    }`}
                  >
                    <span className="text-base">{TIER_EMOJI[tier]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${style.badge}`}>
                      {tier}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-[10px] font-bold" style={{ color: style.color }}>
                        YOU ARE HERE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save button */}
            <button
              onClick={saveRanking}
              disabled={saving}
              className="w-full py-2.5 rounded-xl gradient-green glow-green text-white text-sm
                font-bold hover:scale-[1.02] active:scale-[0.97] transition-transform
                disabled:opacity-60"
            >
              {saving ? 'Saving…' : saved ? '✔ Saved!' : 'Save to My Rankings'}
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center
            text-center min-h-64 gap-3">
            <span className="text-5xl">🏋️</span>
            <p className="text-sm text-slate-500">
              Pick a muscle on the body map,<br/>fill in your stats, then hit<br/>
              <span className="text-orange-400 font-semibold">Calculate Rank</span>
            </p>
          </div>
        )}
      </div>

      {/* ── My saved rankings ──────────────────────────────────────── */}
      {myRankings.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            My Saved Rankings
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {myRankings.map((r) => {
              const style = TIER_STYLES[r.tier] ?? TIER_STYLES['beginner'];
              return (
                <div key={r.id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${muscleColor(r.muscle_group)}`}>
                      {r.muscle_group}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${style.badge}`}>
                      {TIER_EMOJI[r.tier]} {r.tier}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Score</span>
                    <span className="text-sm font-black text-white">{Number(r.score).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Consistency</span>
                    <span className="text-xs font-bold text-orange-400">
                      {Math.round(Number(r.consistency_factor) * 100)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    Updated {new Date(r.updated_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

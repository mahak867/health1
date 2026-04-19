import React, { useEffect, useMemo, useState } from 'react';
import Ring from '../components/Ring';
import BodyMap, { TIER_ORDER } from '../components/BodyMap';
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

/* ── Tier config ──────────────────────────────────────────────────── */
const TIER_STYLES: Record<string, { color: string; glow: string; badge: string; bg: string }> = {
  wood:     { color: '#8B5E3C', glow: '#8B5E3C33', badge: 'bg-amber-900/30 text-amber-700',   bg: 'from-amber-900/30 to-amber-950/60' },
  bronze:   { color: '#CD7F32', glow: '#CD7F3233', badge: 'bg-amber-800/20 text-amber-400',   bg: 'from-amber-800/30 to-amber-900/60' },
  silver:   { color: '#94A3B8', glow: '#94A3B833', badge: 'bg-slate-400/20 text-slate-200',   bg: 'from-slate-600/30 to-slate-800/60' },
  gold:     { color: '#F59E0B', glow: '#F59E0B33', badge: 'bg-yellow-500/20 text-yellow-300', bg: 'from-yellow-700/30 to-yellow-900/60' },
  platinum: { color: '#22C55E', glow: '#22C55E33', badge: 'bg-green-500/20 text-green-300',   bg: 'from-green-700/30 to-green-900/60' },
  diamond:  { color: '#38BDF8', glow: '#38BDF833', badge: 'bg-sky-500/20 text-sky-300',       bg: 'from-sky-700/30 to-sky-900/60' },
  champion: { color: '#A855F7', glow: '#A855F733', badge: 'bg-purple-500/20 text-purple-300', bg: 'from-purple-700/30 to-purple-900/60' },
  titan:    { color: '#EF4444', glow: '#EF444433', badge: 'bg-red-500/20 text-red-300',       bg: 'from-red-700/30 to-red-900/60' },
  olympian: { color: '#F97316', glow: '#F9731633', badge: 'bg-orange-500/20 text-orange-300', bg: 'from-orange-600/30 to-orange-900/60' },
};

/* ── Tier badge icons (circular game-style emblems) ─────────────── */
const TIER_INNER: Record<string, React.ReactNode> = {
  // Wood — tree trunk + crown
  wood: <>
    <rect x="27" y="30" width="6" height="12" rx="1.5" fill="#8B5E3C"/>
    <path d="M23 32 Q30 17 37 32 Z" fill="#5C3A1E"/>
    <path d="M25 29 Q30 16 35 29 Z" fill="#8B5E3C"/>
    <path d="M27 26 Q30 14 33 26 Z" fill="#A0522D"/>
  </>,
  // Bronze — shield
  bronze: <>
    <path d="M30 16 L42 22 L42 32 Q42 40 30 45 Q18 40 18 32 L18 22 Z"
      fill="#CD7F3233" stroke="#CD7F32" strokeWidth="1.5"/>
    <path d="M30 21 L37 25 L37 32 Q37 37 30 41 Q23 37 23 32 L23 25 Z"
      fill="#CD7F32" opacity="0.6"/>
    <text x="30" y="36" textAnchor="middle" fontSize="13" fontWeight="900"
      fill="#CD7F32" fontFamily="system-ui">B</text>
  </>,
  // Silver — 5-pointed star
  silver: <>
    <path d="M30 14 L32.9 23.1 L42.4 23.1 L35 28.9 L37.7 38 L30 32.5 L22.3 38 L25 28.9 L17.6 23.1 L27.1 23.1 Z"
      fill="#94A3B8" opacity="0.9"/>
    <path d="M30 17 L32 23.5 L38.5 23.5 L33 27.5 L35 34 L30 30.5 L25 34 L27 27.5 L21.5 23.5 L28 23.5 Z"
      fill="white" opacity="0.18"/>
  </>,
  // Gold — trophy cup
  gold: <>
    <path d="M24 16 L36 16 L36 28 Q36 36 30 38 Q24 36 24 28 Z" fill="#F59E0B" opacity="0.85"/>
    <rect x="27" y="38" width="6" height="5" rx="1" fill="#F59E0B" opacity="0.7"/>
    <rect x="23" y="43" width="14" height="3" rx="1.5" fill="#F59E0B"/>
    <path d="M24 18 Q19 18 19 24 Q19 29 24 29" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M36 18 Q41 18 41 24 Q41 29 36 29" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M26 24 Q30 20 34 24" fill="none" stroke="white" strokeWidth="1" opacity="0.35"/>
  </>,
  // Platinum — faceted gem / octagon
  platinum: <>
    <path d="M30 14 L40 20 L40 34 L30 46 L20 34 L20 20 Z" fill="#22C55E22" stroke="#22C55E" strokeWidth="1.5"/>
    <path d="M30 18 L38 23 L38 33 L30 42 L22 33 L22 23 Z" fill="#22C55E" opacity="0.55"/>
    <path d="M22 23 L30 18 L38 23 L34 30 L26 30 Z" fill="white" opacity="0.15"/>
    <line x1="30" y1="18" x2="30" y2="42" stroke="white" strokeWidth="0.6" opacity="0.25"/>
    <line x1="22" y1="23" x2="38" y2="33" stroke="white" strokeWidth="0.6" opacity="0.2"/>
    <line x1="38" y1="23" x2="22" y2="33" stroke="white" strokeWidth="0.6" opacity="0.2"/>
  </>,
  // Diamond — classic diamond shape
  diamond: <>
    <path d="M30 13 L44 25 L30 47 L16 25 Z" fill="#38BDF833" stroke="#38BDF8" strokeWidth="1.5"/>
    <path d="M30 17 L40 27 L30 43 L20 27 Z" fill="#38BDF8" opacity="0.65"/>
    <path d="M20 27 L30 17 L40 27 L35 21 L25 21 Z" fill="white" opacity="0.25"/>
    <line x1="30" y1="17" x2="30" y2="43" stroke="white" strokeWidth="0.8" opacity="0.3"/>
    <line x1="20" y1="27" x2="40" y2="27" stroke="white" strokeWidth="0.8" opacity="0.2"/>
  </>,
  // Champion — crown
  champion: <>
    <path d="M16 38 L16 24 L22 30 L30 16 L38 30 L44 24 L44 38 Z"
      fill="#A855F7" opacity="0.85"/>
    <rect x="14" y="38" width="32" height="5" rx="2.5" fill="#A855F7"/>
    <circle cx="30" cy="16" r="3" fill="#E9D5FF"/>
    <circle cx="16" cy="24" r="2.5" fill="#E9D5FF"/>
    <circle cx="44" cy="24" r="2.5" fill="#E9D5FF"/>
    <path d="M18 36 L42 36" stroke="white" strokeWidth="0.7" opacity="0.3"/>
  </>,
  // Titan — flaming skull / fire pillar
  titan: <>
    <path d="M30 12 Q37 16 37 24 Q37 30 34 33 L36 44 L30 40 L24 44 L26 33 Q23 30 23 24 Q23 16 30 12 Z"
      fill="#EF4444" opacity="0.9"/>
    <path d="M30 16 Q34 19 34 24 Q34 28 32 30 L33 38 L30 36 L27 38 L28 30 Q26 28 26 24 Q26 19 30 16 Z"
      fill="white" opacity="0.2"/>
    <ellipse cx="26" cy="27" rx="2" ry="2.5" fill="#1a1a2e" opacity="0.7"/>
    <ellipse cx="34" cy="27" rx="2" ry="2.5" fill="#1a1a2e" opacity="0.7"/>
    <path d="M27 35 Q30 32 33 35" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
  </>,
  // Olympian — sun / radiant crown
  olympian: <>
    {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
      const r = deg * Math.PI / 180;
      const x1 = 30 + 14 * Math.cos(r), y1 = 30 + 14 * Math.sin(r);
      const x2 = 30 + 21 * Math.cos(r), y2 = 30 + 21 * Math.sin(r);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F97316" strokeWidth="3" strokeLinecap="round"/>;
    })}
    <circle cx="30" cy="30" r="12" fill="#F97316" opacity="0.9"/>
    <circle cx="30" cy="30" r="8"  fill="#FED7AA" opacity="0.3"/>
  </>,
};

function TierBadge({ tier, size = 56, active = false, passed = false }: {
  tier: string; size?: number; active?: boolean; passed?: boolean;
}) {
  const color = TIER_STYLES[tier]?.color ?? '#64748b';
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={{ overflow: 'visible' }}>
      {active && (
        <circle cx="30" cy="30" r="30" fill="none" stroke={color} strokeWidth="2.5" opacity="0.5"/>
      )}
      <circle cx="30" cy="30" r="26"
        fill={`${color}1a`}
        stroke={color}
        strokeWidth={active ? 2.5 : 1.5}
        opacity={passed ? 0.65 : active ? 1 : 0.9}
      />
      <g opacity={passed ? 0.65 : 1}>
        {TIER_INNER[tier]}
      </g>
    </svg>
  );
}

/* Map tier name → badge element (for rank card large badge) */
function TierCardBadge({ tier }: { tier: string }) {
  const color = TIER_STYLES[tier]?.color ?? '#64748b';
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ overflow: 'visible' }}>
      <circle cx="30" cy="30" r="30" fill="none" stroke={color} strokeWidth="3" opacity="0.4"/>
      <circle cx="30" cy="30" r="26" fill={`${color}2a`} stroke={color} strokeWidth="2.5"/>
      {TIER_INNER[tier]}
    </svg>
  );
}

const TIER_EMOJI: Record<string, string> = {
  wood: '🪵', bronze: '🥉', silver: '🥈', gold: '🥇',
  platinum: '💚', diamond: '💎', champion: '🔮', titan: '🔥', olympian: '⚡',
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

/** Convert 0-100 progress to Division (I/II/III/IV) and LP (0-99) */
function divisionInfo(progress: number): { division: string; lp: number } {
  const clamped = Math.min(Math.max(progress, 0), 100);
  const divIdx  = Math.min(Math.floor(clamped / 25), 3); // 0=IV,1=III,2=II,3=I
  const divName = ['IV', 'III', 'II', 'I'][divIdx];
  const lp      = Math.round((clamped % 25) * 4); // 0-99
  return { division: divName, lp };
}

/* ── Form defaults ─────────────────────────────────────────────────── */
const defaultForm = {
  muscleGroup: 'chest',
  weightKg: '80',
  reps: '8',
  workoutsPerWeek: '4',
  streakDays: '10',
  volumeProgression: '0.5',
};

/* ================================================================== */

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

  const tierMap = useMemo(() => {
    const map: Record<string, string> = {};
    myRankings.forEach(r => { map[r.muscle_group] = r.tier; });
    if (previewRank) map[form.muscleGroup] = previewRank.current.name;
    return map;
  }, [myRankings, previewRank, form.muscleGroup]);

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
    ? (TIER_STYLES[previewRank.current.name] ?? TIER_STYLES['wood'])
    : null;

  const divInfo = previewRank ? divisionInfo(previewRank.progress) : null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ── */}
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

      {/* ── Main layout: body-map | form | result ── */}
      <div className="grid gap-6 lg:grid-cols-[auto_1fr_1fr]">

        {/* ── Body map ── */}
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

        {/* ── Calculator form ── */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Rank Calculator
          </p>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${muscleColor(form.muscleGroup)}`}>
              {form.muscleGroup}
            </span>
            <span className="text-xs text-slate-500">← tap body map to change</span>
          </div>

          <form onSubmit={calculate} className="space-y-3">
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

        {/* ── Rank result ── */}
        {previewRank && tierStyle && divInfo ? (
          <div className="glass rounded-2xl overflow-hidden">
            {/* Card header — gradient bg matching tier */}
            <div className={`bg-gradient-to-br ${tierStyle.bg} p-5 flex items-center gap-4
              border-b border-white/5`}
              style={{ boxShadow: `inset 0 0 60px ${tierStyle.glow}` }}
            >
              {/* Tier badge icon */}
              <div className="shrink-0">
                <TierCardBadge tier={previewRank.current.name} />
              </div>
              {/* Tier name + division + LP */}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {form.muscleGroup}
                </p>
                <p className="text-2xl font-black text-white leading-tight capitalize">
                  {previewRank.current.name}{' '}
                  <span style={{ color: tierStyle.color }}>{divInfo.division}</span>
                </p>
                <p className="text-sm font-bold mt-0.5" style={{ color: tierStyle.color }}>
                  {divInfo.lp} LP
                </p>
              </div>
              {/* Score badge */}
              <div className="ml-auto shrink-0 text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Score</p>
                <p className="text-xl font-black text-white">{previewScore?.toFixed(0)}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                {form.muscleGroup === 'cardio' ? 'Cardio' : 'Bench Press'}
              </span>
              <span className="ml-auto text-sm font-black text-white">
                {form.weightKg} kg
              </span>
              <span className="text-slate-600">×</span>
              <span className="text-sm font-black text-white">{form.reps} reps</span>
            </div>

            {/* Progress ring + next tier */}
            <div className="px-5 py-4 flex items-center gap-5">
              <Ring
                value={previewRank.progress}
                color={tierStyle.color}
                trackColor={tierStyle.glow}
                size={80}
                strokeWidth={8}
              >
                <span className="text-xl">{TIER_EMOJI[previewRank.current.name] ?? '🏅'}</span>
              </Ring>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-slate-400 capitalize">{previewRank.current.name}</span>
                  {previewRank.next && (
                    <span className="text-slate-400 capitalize">{previewRank.next.name}</span>
                  )}
                </div>
                {/* LP progress bar */}
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${previewRank.progress}%`,
                      backgroundColor: tierStyle.color,
                      boxShadow: `0 0 8px ${tierStyle.glow}`,
                    }}
                  />
                </div>
                {previewRank.next ? (
                  <p className="text-[10px] text-slate-600 mt-1">
                    {previewRank.progress.toFixed(0)}% to {' '}
                    <span className="capitalize text-slate-400">{previewRank.next.name}</span>
                    {' '}(need {previewRank.next.min} pts)
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-600 mt-1">Max tier reached 🏆</p>
                )}
              </div>
            </div>

            {/* 2-row tier grid: 5 on top (Wood→Platinum), 4 on bottom (Diamond→Olympian) */}
            <div className="px-3 pb-4 space-y-2">
              {[TIER_ORDER.slice(0, 5), TIER_ORDER.slice(5)].map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-end justify-around">
                  {row.map(tier => {
                    const isActive = previewRank.current.name === tier;
                    const isPassed = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(previewRank.current.name);
                    const tStyle   = TIER_STYLES[tier];
                    return (
                      <div key={tier} className="flex flex-col items-center gap-0.5" title={tier}>
                        <div className={`transition-all duration-200 ${isActive ? 'scale-110 drop-shadow-lg' : ''}`}>
                          <TierBadge tier={tier} size={isActive ? 52 : 44} active={isActive} passed={isPassed} />
                        </div>
                        <span className={`text-[9px] font-bold capitalize mt-0.5 ${isActive ? 'text-white' : 'text-slate-600'}`}
                          style={isActive ? { color: tStyle.color } : {}}>
                          {tier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Save button */}
            <div className="px-5 pb-5">
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
          </div>
        ) : (
          <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center
            text-center min-h-64 gap-4">
            <span className="text-5xl">🏋️</span>
            <p className="text-sm text-slate-500">
              Pick a muscle on the body map,<br/>fill in your stats, then hit<br/>
              <span className="text-orange-400 font-semibold">Calculate Rank</span>
            </p>
            {/* Preview tier grid — 2 rows, dimmed */}
            <div className="px-2 space-y-2 mt-2 opacity-35">
              {[TIER_ORDER.slice(0, 5), TIER_ORDER.slice(5)].map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-end justify-around">
                  {row.map(tier => (
                    <div key={tier} className="flex flex-col items-center gap-0.5">
                      <TierBadge tier={tier} size={40} />
                      <span className="text-[9px] text-slate-600 capitalize">{tier}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── My saved rankings ── */}
      {myRankings.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            My Saved Rankings
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {myRankings.map((r) => {
              const style = TIER_STYLES[r.tier] ?? TIER_STYLES['wood'];
              const div   = divisionInfo(
                r.score && r.tier ? (() => {
                  // approximate progress within tier for saved card display
                  return 50; // stored entries don't carry progress; show mid
                })() : 0
              );
              return (
                <div key={r.id}
                  className={`glass rounded-xl overflow-hidden border border-white/5`}
                >
                  <div className={`bg-gradient-to-br ${style.bg} px-4 pt-4 pb-3 flex items-center gap-3`}
                    style={{ boxShadow: `inset 0 0 30px ${style.glow}` }}
                  >
                    <div className="shrink-0"><TierBadge tier={r.tier} size={40} active /></div>
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${muscleColor(r.muscle_group)}`}>
                        {r.muscle_group}
                      </span>
                      <p className="text-base font-black text-white mt-1 capitalize leading-tight">
                        {r.tier} <span style={{ color: style.color }}>II</span>
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[10px] text-white/40">Score</p>
                      <p className="text-sm font-black text-white">{Number(r.score).toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

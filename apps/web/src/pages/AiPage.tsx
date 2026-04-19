import React, { useState, useRef, useEffect } from 'react';
import Card from '../components/Card';
import Ring from '../components/Ring';
import { api } from '../lib/api';

interface RecoveryInsight {
  recoveryScore: number;
  sleepScore: number;
  rhrScore: number;
  loadScore: number;
  readiness: 'high' | 'moderate' | 'low';
  recommendations: string[];
}

interface NutritionInsight {
  proteinAdequate: boolean;
  proteinOptimal: boolean;
  leucineAdequate: boolean;
  deficitSeverity: string;
  proteinPerKg: number;
  recommendations: string[];
}

interface FitnessInsight {
  overloadRisk: boolean;
  undertrainingRisk: boolean;
  weeklyVolumeChangePct: number;
  injuryRiskLevel: string;
  recommendations: string[];
}

interface Vo2MaxResult {
  vo2max: number;
  category: string;
  unit: string;
}

const READINESS_COLOR: Record<string, string> = {
  high:     '#22c55e',
  moderate: '#f59e0b',
  low:      '#ef4444',
};

const READINESS_LABEL: Record<string, string> = {
  high:     '✅ Clear to train hard',
  moderate: '⚠️ Train with caution',
  low:      '🛑 Rest day recommended',
};

const INJURY_LEVEL_COLOR: Record<string, string> = {
  low:      '#22c55e',
  moderate: '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444',
};

export default function AiPage() {
  // Recovery form
  const [rec, setRec] = useState({ sleepHours: '7.5', restingHeartRateDelta: '0', workoutLoad: '1.0' });
  // Nutrition form
  const [nut, setNut] = useState({ calorieDeficit: '300', proteinG: '140', weightKg: '75' });
  // Fitness form
  const [fit, setFit] = useState({ weeklyVolumeChange: '0.08', injuryRisk: '0.2' });
  // VO2Max form
  const [vo2, setVo2] = useState({ maxHeartRate: '190', restingHeartRate: '55' });

  const [recResult, setRecResult] = useState<RecoveryInsight | null>(null);
  const [nutResult, setNutResult] = useState<NutritionInsight | null>(null);
  const [fitResult, setFitResult] = useState<FitnessInsight | null>(null);
  const [vo2Result, setVo2Result] = useState<Vo2MaxResult | null>(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [aiTab, setAiTab] = useState<'chat' | 'tools'>('chat');
  // HR Zones
  const [hrZones, setHrZones] = useState<any[] | null>(null);
  useEffect(() => {
    api.get<{ zones: any[] }>('/fitness/hr-zones').then((r) => setHrZones(r.zones)).catch(() => {});
  }, []);

  // Chat state
  interface ChatMessage { role: 'user' | 'ai'; text: string; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: "👋 Hi! I'm your AI Health Coach. Ask me anything — recovery readiness, nutrition advice, workout progress, or VO2Max estimation.\n\nTry: _\"Am I ready to train?\"_ or _\"How's my protein intake?\"_" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await api.post<{ reply: string }>('/ai/chat', { message: msg });
      setChatMessages((prev) => [...prev, { role: 'ai', text: res.reply }]);
    } catch (_) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: "Sorry, I couldn't process that. Please try again." }]);
    }
    setChatLoading(false);
  }

  function sendQuickPrompt(prompt: string) {
    setChatInput(prompt);
  }

  async function runRecommendations(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading('rec');
    try {
      const body = {
        sleepHours:             Number(rec.sleepHours),
        restingHeartRateDelta:  Number(rec.restingHeartRateDelta),
        workoutLoad:            Number(rec.workoutLoad),
        calorieDeficit:         Number(nut.calorieDeficit),
        proteinG:               Number(nut.proteinG),
        weightKg:               Number(nut.weightKg),
        weeklyVolumeChange:     Number(fit.weeklyVolumeChange),
        injuryRisk:             Number(fit.injuryRisk),
      };
      const res = await api.post<{ insight: any }>('/ai/recommendations', body);
      const { recovery, nutrition, fitness } = res.insight;
      setRecResult(recovery);
      setNutResult(nutrition);
      setFitResult(fitness);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(''); }
  }

  async function runVo2Max(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading('vo2');
    try {
      const params = new URLSearchParams({
        maxHeartRate:     vo2.maxHeartRate,
        restingHeartRate: vo2.restingHeartRate,
      });
      const res = await api.get<{ vo2max: Vo2MaxResult }>(`/ai/vo2max?${params}`);
      setVo2Result(res.vo2max);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(''); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">AI Health Engine 🤖</h1>
        <p className="text-slate-500 text-sm mt-1">
          Chat with your AI coach or use precision science tools
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        {([['chat','💬 AI Chat'],['tools','🔬 Science Tools']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setAiTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${aiTab === t ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Chat Tab ─── */}
      {aiTab === 'chat' && (
        <div className="space-y-4">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2">
            {[
              'Am I ready to train today?',
              "How's my protein intake?",
              'How are my workouts going?',
              "What's my VO2Max?",
              'How much XP do I have?',
            ].map((prompt) => (
              <button key={prompt} onClick={() => sendQuickPrompt(prompt)}
                className="text-xs px-3 py-1.5 rounded-full glass text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10">
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat window */}
          <div className="glass rounded-2xl flex flex-col" style={{ height: '420px' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-600/40 text-white rounded-br-sm'
                      : 'bg-white/5 text-slate-200 rounded-bl-sm border border-white/10'
                  }`}>
                    {msg.role === 'ai' && <span className="text-xs text-violet-400 font-bold block mb-1">🤖 AI Coach</span>}
                    {msg.text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/_(.*?)_/g, '$1')}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 text-slate-400 text-sm">
                    <span className="animate-pulse">AI is thinking…</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={sendChat} className="p-3 border-t border-white/10 flex gap-2">
              <input
                className="flex-1 rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                placeholder="Ask your AI coach anything…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" disabled={!chatInput.trim() || chatLoading}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-40 transition-colors">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Science Tools Tab ─── */}
      {aiTab === 'tools' && (<>
        <p className="text-xs text-slate-500">Evidence-based analysis — ACWR injury risk, Epley 1RM, Uth VO₂Max, Morton protein, leucine threshold</p>
        <form onSubmit={runRecommendations}>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Recovery inputs */}
          <Card title="Recovery Signals" accent="violet">
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Sleep (hours)</span>
                <input type="number" step="0.5" min="0" max="24"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  value={rec.sleepHours} onChange={(e) => setRec({ ...rec, sleepHours: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Resting HR delta (bpm above baseline)</span>
                <input type="number" step="1" min="-10" max="40"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  value={rec.restingHeartRateDelta} onChange={(e) => setRec({ ...rec, restingHeartRateDelta: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Workout load (ACWR — 1.0 = baseline)</span>
                <input type="number" step="0.05" min="0" max="3"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  value={rec.workoutLoad} onChange={(e) => setRec({ ...rec, workoutLoad: e.target.value })} />
              </label>
            </div>
          </Card>

          {/* Nutrition inputs */}
          <Card title="Nutrition Signals" accent="orange">
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Calorie deficit (kcal/day; 0 = maintenance)</span>
                <input type="number" step="50" min="-1000" max="1500"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  value={nut.calorieDeficit} onChange={(e) => setNut({ ...nut, calorieDeficit: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Daily protein (g)</span>
                <input type="number" step="5" min="0" max="500"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  value={nut.proteinG} onChange={(e) => setNut({ ...nut, proteinG: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Body weight (kg)</span>
                <input type="number" step="1" min="20" max="500"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  value={nut.weightKg} onChange={(e) => setNut({ ...nut, weightKg: e.target.value })} />
              </label>
            </div>
          </Card>

          {/* Fitness inputs */}
          <Card title="Fitness Load Signals" accent="rose">
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Weekly volume change (0.10 = +10%)</span>
                <input type="number" step="0.01" min="-1" max="2"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  value={fit.weeklyVolumeChange} onChange={(e) => setFit({ ...fit, weeklyVolumeChange: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 block mb-1">Injury risk score (0.0 – 1.0)</span>
                <input type="number" step="0.05" min="0" max="1"
                  className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  value={fit.injuryRisk} onChange={(e) => setFit({ ...fit, injuryRisk: e.target.value })} />
              </label>
              <button type="submit" disabled={loading === 'rec'}
                className="w-full py-2.5 rounded-xl gradient-violet glow-violet text-white text-sm font-bold disabled:opacity-50 hover:scale-[1.02] transition-transform mt-1">
                {loading === 'rec' ? 'Analysing…' : '🧠 Run Full Analysis'}
              </button>
            </div>
          </Card>
        </div>
      </form>

      {/* ─── Recovery result ─────────────────────────────────────────────────── */}
      {recResult && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-solid rounded-2xl p-5 border border-white/10 sm:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Recovery Score</p>
            <div className="flex justify-center mb-4">
              <Ring value={recResult.recoveryScore} color={READINESS_COLOR[recResult.readiness]}
                trackColor="#1a1a2e" size={112} strokeWidth={10}
                label={`${recResult.recoveryScore}`} sublabel="/ 100">
                <span className="text-2xl">💪</span>
              </Ring>
            </div>
            <p className="text-center text-sm font-bold" style={{ color: READINESS_COLOR[recResult.readiness] }}>
              {READINESS_LABEL[recResult.readiness]}
            </p>
            <div className="mt-4 divide-y divide-white/5">
              {[
                ['Sleep', recResult.sleepScore],
                ['HRV / RHR', recResult.rhrScore],
                ['Load (ACWR)', recResult.loadScore],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-bold text-white">{val}/100</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-solid rounded-2xl p-5 border border-white/10 sm:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Recommendations</p>
            <ul className="space-y-2">
              {[...(recResult.recommendations), ...(nutResult?.recommendations ?? []), ...(fitResult?.recommendations ?? [])].map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300 leading-snug">
                  <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            {nutResult && (
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Protein/kg</p>
                  <p className="text-lg font-black" style={{ color: nutResult.proteinOptimal ? '#22c55e' : nutResult.proteinAdequate ? '#f59e0b' : '#ef4444' }}>
                    {nutResult.proteinPerKg}g
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Leucine MPS</p>
                  <p className="text-lg font-black" style={{ color: nutResult.leucineAdequate ? '#22c55e' : '#ef4444' }}>
                    {nutResult.leucineAdequate ? '✅' : '⚠️'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Deficit</p>
                  <p className="text-sm font-black text-white capitalize">{nutResult.deficitSeverity}</p>
                </div>
              </div>
            )}
            {fitResult && (
              <div className="mt-3 flex gap-3 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${fitResult.overloadRisk ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                  Volume risk: {fitResult.overloadRisk ? `⚠️ +${fitResult.weeklyVolumeChangePct}%` : `✅ +${fitResult.weeklyVolumeChangePct}%`}
                </span>
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{
                  backgroundColor: INJURY_LEVEL_COLOR[fitResult.injuryRiskLevel] + '22',
                  color: INJURY_LEVEL_COLOR[fitResult.injuryRiskLevel]
                }}>
                  Injury risk: {fitResult.injuryRiskLevel}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VO2Max calculator ───────────────────────────────────────────────── */}
      <Card title="VO₂Max Estimator (Uth-Sørensen formula)" accent="blue">
        <form onSubmit={runVo2Max} className="flex flex-wrap gap-3 items-end">
          <label className="block min-w-[160px]">
            <span className="text-xs text-slate-500 block mb-1">Max Heart Rate (bpm)</span>
            <input type="number" min="100" max="250"
              className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              value={vo2.maxHeartRate} onChange={(e) => setVo2({ ...vo2, maxHeartRate: e.target.value })} />
          </label>
          <label className="block min-w-[160px]">
            <span className="text-xs text-slate-500 block mb-1">Resting Heart Rate (bpm)</span>
            <input type="number" min="30" max="120"
              className="w-full rounded-xl glass px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              value={vo2.restingHeartRate} onChange={(e) => setVo2({ ...vo2, restingHeartRate: e.target.value })} />
          </label>
          <button type="submit" disabled={loading === 'vo2'}
            className="py-2 px-5 rounded-xl gradient-blue text-white text-sm font-bold disabled:opacity-50 hover:scale-[1.02] transition-transform">
            {loading === 'vo2' ? 'Calculating…' : 'Estimate VO₂Max'}
          </button>
          {vo2Result && (
            <div className="flex items-center gap-6 ml-4">
              <div className="text-center">
                <p className="text-3xl font-black text-blue-400">{vo2Result.vo2max}</p>
                <p className="text-[10px] text-slate-500">{vo2Result.unit}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white capitalize">{vo2Result.category}</p>
                <p className="text-xs text-slate-500">ACSM fitness category</p>
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* ─── Personalized Heart Rate Zones ─── */}
      {hrZones && (
        <Card title="❤️ Your Personalized HR Zones" accent="rose">
          <p className="text-xs text-slate-500 mb-4">Karvonen method — based on your age-predicted max HR and resting HR from recent vitals</p>
          <div className="space-y-3">
            {hrZones.map((z) => (
              <div key={z.zone}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">Zone {z.zone} — {z.name}</span>
                  <span className="text-xs font-mono" style={{ color: z.color }}>{z.low}–{z.high} bpm</span>
                </div>
                <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${((z.high - z.low) / (hrZones[hrZones.length - 1].high - hrZones[0].low)) * 60 + 30}%`,
                    background: z.color,
                    opacity: 0.8
                  }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{z.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-xl bg-white/5 text-[10px] text-slate-400">
            💡 Tip: Most training time (70-80%) should be in Z2 (aerobic base) for optimal endurance adaptation.
          </div>
        </Card>
      )}
      </>)}
    </div>
  );
}

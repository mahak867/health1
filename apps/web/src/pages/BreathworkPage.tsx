import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';

// ─── Technique definitions ────────────────────────────────────────────────────
interface Phase { label: string; seconds: number; expand: boolean }
interface Technique {
  name: string; subtitle: string; emoji: string;
  color: string; gradient: string;
  phases: Phase[];
}

const TECHNIQUES: Technique[] = [
  {
    name: 'Box Breathing', subtitle: '4-4-4-4 · Focus & calm', emoji: '🟦',
    color: '#3b82f6', gradient: 'from-blue-500/20 to-blue-800/10',
    phases: [
      { label: 'Inhale',  seconds: 4, expand: true  },
      { label: 'Hold',    seconds: 4, expand: true  },
      { label: 'Exhale',  seconds: 4, expand: false },
      { label: 'Hold',    seconds: 4, expand: false },
    ],
  },
  {
    name: '4-7-8 Breathing', subtitle: '4-7-8 · Deep relaxation', emoji: '💜',
    color: '#8b5cf6', gradient: 'from-violet-500/20 to-violet-800/10',
    phases: [
      { label: 'Inhale',        seconds: 4, expand: true  },
      { label: 'Hold',          seconds: 7, expand: true  },
      { label: 'Exhale slowly', seconds: 8, expand: false },
    ],
  },
  {
    name: 'Physiological Sigh', subtitle: '2-1-6 · Rapid calm', emoji: '🌊',
    color: '#06b6d4', gradient: 'from-cyan-500/20 to-cyan-800/10',
    phases: [
      { label: 'Inhale',         seconds: 2, expand: true  },
      { label: 'Double-Inhale',  seconds: 1, expand: true  },
      { label: 'Exhale slowly',  seconds: 6, expand: false },
    ],
  },
  {
    name: 'Wim Hof Style', subtitle: '2-0-4-0 · Energise', emoji: '❄️',
    color: '#0ea5e9', gradient: 'from-sky-500/20 to-sky-800/10',
    phases: [
      { label: 'Power Inhale', seconds: 2, expand: true  },
      { label: 'Exhale',       seconds: 2, expand: false },
    ],
  },
];

const TOTAL_CYCLES = 4;

// ─── Animated breathing circle ────────────────────────────────────────────────
interface CircleProps {
  scale: number;
  label: string;
  countdown: number;
  color: string;
  emoji: string;
  running: boolean;
}

function BreathCircle({ scale, label, countdown, color, emoji, running }: CircleProps) {
  const size    = 96 + 80 * scale;     // 96px min, 176px max
  const opacity = 0.15 + 0.25 * scale;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outer glow */}
      <div
        className="absolute rounded-full transition-all"
        style={{
          width: size + 40, height: size + 40,
          background: `${color}${Math.round(opacity * 255).toString(16).padStart(2,'0')}`,
          filter: 'blur(24px)',
          transition: 'width 0.5s ease, height 0.5s ease',
        }}
      />
      {/* Main circle */}
      <div
        className="absolute rounded-full flex flex-col items-center justify-center text-white"
        style={{
          width: size, height: size,
          background: `radial-gradient(circle, ${color}cc, ${color}44)`,
          boxShadow: `0 0 40px ${color}44`,
          transition: 'width 0.5s ease, height 0.5s ease',
        }}
      >
        {running ? (
          <>
            <span className="font-bold text-sm text-center leading-tight px-2">{label}</span>
            <span className="text-4xl font-black mt-1">{countdown}</span>
          </>
        ) : (
          <span className="text-5xl">{emoji}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BreathworkPage() {
  const [techIdx,    setTechIdx]    = useState(0);
  const [running,    setRunning]    = useState(false);
  const [phaseIdx,   setPhaseIdx]   = useState(0);
  const [cycle,      setCycle]      = useState(0);
  const [countdown,  setCountdown]  = useState(0);
  const [circScale,  setCircScale]  = useState(0.6);
  const [done,       setDone]       = useState(false);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; clearAllTimers(); };
  }, []);

  function clearAllTimers() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }

  const tech = TECHNIQUES[techIdx];

  // ── Session runner ──────────────────────────────────────────────────────────
  function startSession() {
    setRunning(true);
    setDone(false);
    setCycle(0);
    setPhaseIdx(0);
    runPhase(0, 0);
  }

  function stopSession() {
    clearAllTimers();
    setRunning(false);
    setCircScale(0.6);
    setCountdown(0);
  }

  function runPhase(pIdx: number, cyc: number) {
    const t = TECHNIQUES[techIdx];
    const p = t.phases[pIdx];

    setPhaseIdx(pIdx);
    setCountdown(p.seconds);
    setCircScale(p.expand ? 0.6 : 1.0);

    // Animate toward target over the phase duration
    const targetScale = p.expand ? 1.0 : 0.6;
    const steps = p.seconds;
    let step = 0;

    function tick() {
      if (!isMountedRef.current) return;
      step++;
      const progress = step / steps;
      setCircScale(p.expand
        ? 0.6 + 0.4 * progress
        : 1.0 - 0.4 * progress);
      setCountdown(p.seconds - step + 1);

      if (step < steps) {
        timeoutRef.current = setTimeout(tick, 1000);
      } else {
        // Advance to next phase
        const nextP = pIdx + 1;
        if (nextP < t.phases.length) {
          timeoutRef.current = setTimeout(() => runPhase(nextP, cyc), 200);
        } else {
          const nextC = cyc + 1;
          setCycle(nextC);
          if (nextC >= TOTAL_CYCLES) {
            setRunning(false);
            setCircScale(0.8);
            setDone(true);
          } else {
            timeoutRef.current = setTimeout(() => runPhase(0, nextC), 500);
          }
        }
      }
    }
    timeoutRef.current = setTimeout(tick, 1000);
  }

  const currentPhase = running ? tech.phases[phaseIdx] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-black text-white">🧘 Breathwork & Mindfulness</h1>

      {/* Technique selector */}
      {!running && (
        <div className="grid grid-cols-2 gap-3">
          {TECHNIQUES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => { setTechIdx(i); setDone(false); }}
              className={`rounded-2xl p-4 text-left transition-all border-2 ${
                i === techIdx
                  ? 'border-white/30 bg-white/10'
                  : 'border-transparent bg-white/5 hover:bg-white/8'
              }`}
            >
              <div className="text-2xl mb-1">{t.emoji}</div>
              <div className="text-sm font-bold text-white">{t.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.subtitle}</div>
            </button>
          ))}
        </div>
      )}

      {/* Animated circle */}
      <div className="flex flex-col items-center gap-4 py-6">
        <BreathCircle
          scale={circScale}
          label={currentPhase?.label ?? ''}
          countdown={countdown}
          color={tech.color}
          emoji={tech.emoji}
          running={running}
        />

        {/* Cycle dots */}
        {(running || done) && (
          <div className="flex gap-2 mt-2">
            {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{ background: i < cycle ? tech.color : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>
        )}
        {running && (
          <p className="text-slate-400 text-sm">
            Cycle {Math.min(cycle + 1, TOTAL_CYCLES)} of {TOTAL_CYCLES}
          </p>
        )}
      </div>

      {/* Controls */}
      {!running && !done && (
        <button
          onClick={startSession}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all"
          style={{ background: `linear-gradient(135deg, ${tech.color}cc, ${tech.color}44)` }}
        >
          ▶ Start {TOTAL_CYCLES}-Cycle Session
        </button>
      )}
      {running && (
        <button
          onClick={stopSession}
          className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-base transition-all border border-white/10"
        >
          ◼ End Session
        </button>
      )}
      {done && (
        <div className="glass rounded-2xl p-5 text-center space-y-2">
          <p className="text-3xl">🎉</p>
          <p className="text-white font-bold">Session Complete!</p>
          <p className="text-slate-400 text-sm">{TOTAL_CYCLES} cycles of {tech.name}</p>
          <button
            onClick={() => { setDone(false); setCircScale(0.6); setCycle(0); setPhaseIdx(0); }}
            className="mt-3 px-6 py-2 rounded-xl text-white text-sm font-bold"
            style={{ background: tech.color }}
          >
            Start Again
          </button>
        </div>
      )}

      {/* Technique info cards */}
      {!running && (
        <Card title={`About ${tech.name}`} accent="blue">
          <div className="space-y-2">
            {tech.phases.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: tech.color + '88' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-white">{p.label}</span>
                  <span className="text-slate-400 text-xs ml-2">
                    {p.seconds === 0 ? 'instant' : `${p.seconds}s`}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{p.expand ? '↑ inhale' : '↓ exhale'}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-white/5 text-xs text-slate-400">
            {techIdx === 0 && '📖 Box breathing is used by Navy SEALs to reduce stress and improve focus under pressure.'}
            {techIdx === 1 && '📖 Developed by Dr. Andrew Weil — activates the parasympathetic nervous system for deep sleep.'}
            {techIdx === 2 && '📖 Stanford researchers found this is the fastest way to reduce physiological stress.'}
            {techIdx === 3 && '📖 High-repetition connected breathing followed by breath retention to boost energy and resilience.'}
          </div>
        </Card>
      )}
    </div>
  );
}

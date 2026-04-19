import React, { useState } from 'react';

/* ------------------------------------------------------------------ */
/* Tier → hex fill colour (mirrors TIER_STYLES in RankingPage)         */
/* ------------------------------------------------------------------ */
const TIER_FILL: Record<string, string> = {
  beginner: '#64748b',
  bronze:   '#cd7f32',
  silver:   '#94a3b8',
  gold:     '#f59e0b',
  platinum: '#38bdf8',
  diamond:  '#818cf8',
  elite:    '#f43f5e',
};

const TIER_ORDER = ['beginner', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'elite'];

const UNRANKED_FILL   = '#1e293b';
const UNRANKED_STROKE = '#334155';
const HOVER_FILL      = '#263447';

/* ------------------------------------------------------------------ */

interface Props {
  /** muscle_group → tier name (from saved / preview data) */
  tierMap: Record<string, string>;
  selected?: string;
  onSelect?: (group: string) => void;
}

export default function BodyMap({ tierMap, selected, onSelect }: Props) {
  const [view, setView]       = useState<'front' | 'back'>('front');
  const [hovered, setHovered] = useState<string | null>(null);

  /* ---- helpers ---------------------------------------------------- */
  function fillFor(g: string) {
    const tier = tierMap[g];
    if (tier) return TIER_FILL[tier] ?? UNRANKED_FILL;
    return hovered === g ? HOVER_FILL : UNRANKED_FILL;
  }

  function strokeFor(g: string) {
    if (selected === g) return '#ffffff';
    const tier = tierMap[g];
    return tier ? TIER_FILL[tier] : UNRANKED_STROKE;
  }

  function opacityFor(g: string) {
    if (selected === g) return 1;
    if (tierMap[g]) return 0.88;
    return hovered === g ? 0.55 : 0.38;
  }

  /** Props for the clickable <g> wrapper */
  function gp(g: string) {
    return {
      style:        { cursor: 'pointer' } as React.CSSProperties,
      onClick:      () => onSelect?.(g),
      onMouseEnter: () => setHovered(g),
      onMouseLeave: () => setHovered(null),
    };
  }

  /** Inline style for every shape in a muscle group */
  function sp(g: string): React.CSSProperties {
    return {
      fill:        fillFor(g),
      stroke:      strokeFor(g),
      strokeWidth: selected === g ? 2 : tierMap[g] ? 1 : 0.5,
      opacity:     opacityFor(g),
      transition:  'fill 0.22s, opacity 0.22s, stroke-width 0.15s',
    };
  }

  const tooltipText = hovered
    ? `${hovered[0].toUpperCase()}${hovered.slice(1)} — ${tierMap[hovered] ?? 'unranked'}`
    : '';

  /* ------------------------------------------------------------------ */
  return (
    <div className="flex flex-col items-center gap-3 select-none">

      {/* ── Front / Back toggle ─────────────────────────────────────── */}
      <div className="flex gap-0.5 bg-white/5 rounded-full p-0.5">
        {(['front', 'back'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-xs px-4 py-1 rounded-full font-medium capitalize transition-all ${
              view === v ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── SVG body ─────────────────────────────────────────────────── */}
      <div className="relative">
        <svg
          viewBox="0 0 180 400"
          width="160"
          height="356"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Human body muscle map"
        >
          {/* Head */}
          <ellipse cx="90" cy="36" rx="26" ry="28"
            fill="#111827" stroke="#334155" strokeWidth="1"/>
          {/* Neck */}
          <rect x="84" y="62" width="12" height="13" rx="3"
            fill="#111827" stroke="#334155" strokeWidth="0.5"/>

          {/* ── FRONT VIEW ──────────────────────────────────────────── */}
          {view === 'front' && (
            <>
              {/* Shoulders (deltoids) */}
              <g {...gp('shoulders')}>
                <ellipse cx="50"  cy="88" rx="23" ry="15" style={sp('shoulders')}/>
                <ellipse cx="130" cy="88" rx="23" ry="15" style={sp('shoulders')}/>
              </g>

              {/* Chest (pectorals) */}
              <g {...gp('chest')}>
                <path d="M66 76 Q90 71 114 76 L112 126 Q90 131 68 126 Z"
                  style={sp('chest')}/>
              </g>

              {/* Arms (biceps + forearms) */}
              <g {...gp('arms')}>
                {/* Left upper arm */}
                <rect x="24"  y="98" width="23" height="60" rx="11" style={sp('arms')}/>
                {/* Right upper arm */}
                <rect x="133" y="98" width="23" height="60" rx="11" style={sp('arms')}/>
                {/* Left forearm */}
                <rect x="25"  y="162" width="21" height="55" rx="10" style={sp('arms')}/>
                {/* Right forearm */}
                <rect x="134" y="162" width="21" height="55" rx="10" style={sp('arms')}/>
              </g>

              {/* Core / Abs */}
              <g {...gp('core')}>
                <path d="M68 126 Q90 131 112 126 L110 183 Q90 188 70 183 Z"
                  style={sp('core')}/>
              </g>

              {/* Pelvis separator (non-interactive) */}
              <rect x="64" y="183" width="52" height="22" rx="10"
                fill="#0f172a" stroke="#1e293b" strokeWidth="0.5"/>

              {/* Legs (quads + calves) */}
              <g {...gp('legs')}>
                {/* Left quad */}
                <rect x="65" y="206" width="24" height="84" rx="12" style={sp('legs')}/>
                {/* Right quad */}
                <rect x="91" y="206" width="24" height="84" rx="12" style={sp('legs')}/>
                {/* Left calf */}
                <rect x="66" y="294" width="22" height="62" rx="10" style={sp('legs')}/>
                {/* Right calf */}
                <rect x="92" y="294" width="22" height="62" rx="10" style={sp('legs')}/>
              </g>
            </>
          )}

          {/* ── BACK VIEW ───────────────────────────────────────────── */}
          {view === 'back' && (
            <>
              {/* Shoulders (rear delts) */}
              <g {...gp('shoulders')}>
                <ellipse cx="50"  cy="88" rx="23" ry="15" style={sp('shoulders')}/>
                <ellipse cx="130" cy="88" rx="23" ry="15" style={sp('shoulders')}/>
              </g>

              {/* Back (traps + lats) */}
              <g {...gp('back')}>
                {/* Traps / upper-back centre */}
                <path d="M66 76 Q90 71 114 76 L116 128 Q90 135 64 128 Z"
                  style={sp('back')}/>
                {/* Left lat */}
                <path d="M35 103 L64 78 L64 130 L35 150 Z"
                  style={sp('back')} strokeLinejoin="round"/>
                {/* Right lat */}
                <path d="M145 103 L116 78 L116 130 L145 150 Z"
                  style={sp('back')} strokeLinejoin="round"/>
              </g>

              {/* Arms (triceps) */}
              <g {...gp('arms')}>
                <rect x="24"  y="98" width="23" height="60" rx="11" style={sp('arms')}/>
                <rect x="133" y="98" width="23" height="60" rx="11" style={sp('arms')}/>
                <rect x="25"  y="162" width="21" height="55" rx="10" style={sp('arms')}/>
                <rect x="134" y="162" width="21" height="55" rx="10" style={sp('arms')}/>
              </g>

              {/* Core (lower back) */}
              <g {...gp('core')}>
                <path d="M64 128 Q90 135 116 128 L114 183 Q90 187 66 183 Z"
                  style={sp('core')}/>
              </g>

              {/* Legs (glutes + hamstrings + calves) */}
              <g {...gp('legs')}>
                {/* Glutes */}
                <ellipse cx="79"  cy="196" rx="17" ry="14" style={sp('legs')}/>
                <ellipse cx="101" cy="196" rx="17" ry="14" style={sp('legs')}/>
                {/* Hamstrings */}
                <rect x="65" y="211" width="24" height="80" rx="12" style={sp('legs')}/>
                <rect x="91" y="211" width="24" height="80" rx="12" style={sp('legs')}/>
                {/* Calves */}
                <rect x="66" y="295" width="22" height="61" rx="10" style={sp('legs')}/>
                <rect x="92" y="295" width="22" height="61" rx="10" style={sp('legs')}/>
              </g>
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {tooltipText && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-white/80
            bg-black/75 px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none z-10">
            {tooltipText}
          </div>
        )}
      </div>

      {/* ── Cardio badge (not on body map) ─────────────────────────── */}
      <button
        onClick={() => onSelect?.('cardio')}
        onMouseEnter={() => setHovered('cardio')}
        onMouseLeave={() => setHovered(null)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all mt-1 ${
          selected === 'cardio'
            ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400'
            : tierMap['cardio']
              ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30'
              : 'glass text-slate-400 hover:text-white'
        }`}
      >
        <span>🫀</span>
        <span>Cardio{tierMap['cardio'] ? ` — ${tierMap['cardio']}` : ''}</span>
      </button>

      {/* ── Tier colour legend ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center pt-1">
        {TIER_ORDER.map(tier => (
          <div key={tier} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_FILL[tier] }}/>
            <span className="text-[10px] text-slate-500 capitalize">{tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

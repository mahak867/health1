import React, { useState } from 'react';

/* ------------------------------------------------------------------ */
/* Tier → hex fill colour                                               */
/* ------------------------------------------------------------------ */
const TIER_FILL: Record<string, string> = {
  wood:     '#8B5E3C',
  bronze:   '#CD7F32',
  silver:   '#94A3B8',
  gold:     '#F59E0B',
  platinum: '#22C55E',
  diamond:  '#38BDF8',
  champion: '#A855F7',
  titan:    '#EF4444',
  olympian: '#F97316',
};

export const TIER_ORDER = ['wood', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'titan', 'olympian'];

/* Default tint colour per muscle group (shown even when unranked) */
const MUSCLE_TINT: Record<string, string> = {
  chest:     '#c0394a',
  back:      '#2563eb',
  shoulders: '#b45309',
  arms:      '#7c3aed',
  core:      '#047857',
  legs:      '#b45309',
  cardio:    '#0e7490',
};

const UNRANKED_FILL   = '#1a2744';
const UNRANKED_STROKE = '#2d4060';
const HOVER_FILL      = '#1e3a6e';

/* ------------------------------------------------------------------ */

interface Props {
  tierMap: Record<string, string>;
  selected?: string;
  onSelect?: (group: string) => void;
}

export default function BodyMap({ tierMap, selected, onSelect }: Props) {
  const [view, setView]       = useState<'front' | 'back'>('front');
  const [hovered, setHovered] = useState<string | null>(null);

  function fillFor(g: string) {
    const tier = tierMap[g];
    if (tier) return TIER_FILL[tier] ?? UNRANKED_FILL;
    if (selected === g || hovered === g) return HOVER_FILL;
    return MUSCLE_TINT[g] ?? UNRANKED_FILL;
  }

  function strokeFor(g: string) {
    if (selected === g) return '#ffffff';
    const tier = tierMap[g];
    if (tier) return TIER_FILL[tier];
    return MUSCLE_TINT[g] ?? UNRANKED_STROKE;
  }

  function opacityFor(g: string) {
    if (selected === g) return 1;
    if (tierMap[g]) return 0.92;
    return hovered === g ? 0.75 : 0.45;
  }

  function filterFor(g: string): string | undefined {
    if (selected === g) {
      const tier = tierMap[g];
      const col  = tier ? TIER_FILL[tier] : (MUSCLE_TINT[g] ?? '#ffffff');
      return `drop-shadow(0 0 8px ${col}) drop-shadow(0 0 3px ${col})`;
    }
    if (tierMap[g]) {
      return `drop-shadow(0 0 3px ${TIER_FILL[tierMap[g]]})`;
    }
    return undefined;
  }

  function gp(g: string) {
    return {
      style:        { cursor: 'pointer', filter: filterFor(g) } as React.CSSProperties,
      onClick:      () => onSelect?.(g),
      onMouseEnter: () => setHovered(g),
      onMouseLeave: () => setHovered(null),
    };
  }

  function sp(g: string): React.CSSProperties {
    return {
      fill:        fillFor(g),
      stroke:      strokeFor(g),
      strokeWidth: selected === g ? 2.5 : tierMap[g] ? 1.5 : 1,
      opacity:     opacityFor(g),
      transition:  'fill 0.22s, opacity 0.22s, stroke-width 0.15s',
    };
  }

  const tooltipText = hovered
    ? `${hovered[0].toUpperCase()}${hovered.slice(1)} — ${tierMap[hovered] ?? 'unranked'}`
    : '';

  return (
    <div className="flex flex-col items-center gap-3 select-none">

      {/* Front / Back toggle */}
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

      {/* SVG body */}
      <div className="relative">
        <svg
          viewBox="0 0 200 440"
          width="200"
          height="440"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Human body muscle map"
        >
          {/* ── Body outline (silhouette) ── */}
          <path
            d="M100 8 C82 8 72 22 72 36 C72 50 80 60 84 64
               L78 72 C68 72 54 78 44 90 C36 100 30 112 30 118
               L26 174 C26 178 28 182 32 182 L36 182 L36 220
               L30 220 L28 350 C28 354 30 358 34 358 L40 358
               L40 410 C40 420 48 428 58 428 L74 428 C80 428 84 422 84 416
               L84 370 L92 370 L92 428 C92 434 96 440 102 440
               L116 440 C122 440 126 434 126 428 L126 370 L134 370
               L134 416 C134 422 138 428 144 428 L160 428 C168 428 174 420 174 410
               L174 358 L180 358 C184 358 186 354 186 350 L184 220 L178 220
               L178 182 L182 182 C186 182 188 178 188 174 L184 118
               C184 112 178 100 170 90 C160 78 146 72 136 72
               L130 64 C134 60 142 50 142 36 C142 22 132 8 114 8 Z"
            fill="#0f1624"
            stroke="#243048"
            strokeWidth="1.5"
          />

          {/* Head */}
          <ellipse cx="100" cy="34" rx="28" ry="30"
            fill="#162030" stroke="#2d4060" strokeWidth="1.5"/>
          {/* Face features */}
          <ellipse cx="92" cy="32" rx="4" ry="5" fill="#0a1220" opacity="0.7"/>
          <ellipse cx="108" cy="32" rx="4" ry="5" fill="#0a1220" opacity="0.7"/>
          <path d="M93 44 Q100 48 107 44" fill="none" stroke="#2d4060" strokeWidth="1.5" strokeLinecap="round"/>

          {/* Neck */}
          <rect x="91" y="62" width="18" height="14" rx="4"
            fill="#162030" stroke="#2d4060" strokeWidth="1"/>

          {/* ── FRONT VIEW ── */}
          {view === 'front' && (<>

            {/* Shoulders / Deltoids */}
            <g {...gp('shoulders')}>
              {/* Left delt */}
              <ellipse cx="46" cy="96" rx="22" ry="16" style={sp('shoulders')}/>
              {/* Right delt */}
              <ellipse cx="154" cy="96" rx="22" ry="16" style={sp('shoulders')}/>
              {/* Delt detail lines */}
              <path d="M34 92 Q46 88 58 92" fill="none" stroke={strokeFor('shoulders')} strokeWidth="0.8" opacity={opacityFor('shoulders') * 0.5} style={{pointerEvents:'none'}}/>
              <path d="M142 92 Q154 88 166 92" fill="none" stroke={strokeFor('shoulders')} strokeWidth="0.8" opacity={opacityFor('shoulders') * 0.5} style={{pointerEvents:'none'}}/>
            </g>

            {/* Chest / Pectorals */}
            <g {...gp('chest')}>
              {/* Left pec */}
              <path d="M78 78 Q100 73 122 78 L120 116 Q109 124 100 126 Q91 124 80 116 Z"
                style={sp('chest')}/>
              {/* Pec separation line */}
              <line x1="100" y1="76" x2="100" y2="126" stroke={strokeFor('chest')} strokeWidth="0.8"
                opacity={opacityFor('chest') * 0.4} style={{pointerEvents:'none'}}/>
              {/* Pec lower curve lines */}
              <path d="M80 108 Q90 116 100 118 Q110 116 120 108"
                fill="none" stroke={strokeFor('chest')} strokeWidth="0.7"
                opacity={opacityFor('chest') * 0.4} style={{pointerEvents:'none'}}/>
            </g>

            {/* Arms / Biceps + Forearms */}
            <g {...gp('arms')}>
              {/* Left upper arm */}
              <path d="M28 104 Q22 130 26 158 L42 162 Q46 134 46 108 Z"
                style={sp('arms')}/>
              {/* Right upper arm */}
              <path d="M172 104 Q178 130 174 158 L158 162 Q154 134 154 108 Z"
                style={sp('arms')}/>
              {/* Left forearm */}
              <path d="M26 162 Q22 196 28 222 L44 218 Q46 188 42 164 Z"
                style={sp('arms')}/>
              {/* Right forearm */}
              <path d="M174 162 Q178 196 172 222 L156 218 Q154 188 158 164 Z"
                style={sp('arms')}/>
              {/* Bicep peak lines */}
              <path d="M30 126 Q34 118 40 124" fill="none" stroke={strokeFor('arms')} strokeWidth="0.8" opacity={opacityFor('arms') * 0.45} style={{pointerEvents:'none'}}/>
              <path d="M170 126 Q166 118 160 124" fill="none" stroke={strokeFor('arms')} strokeWidth="0.8" opacity={opacityFor('arms') * 0.45} style={{pointerEvents:'none'}}/>
            </g>

            {/* Core / Abs */}
            <g {...gp('core')}>
              <path d="M80 124 Q100 130 120 124 L118 192 Q100 196 82 192 Z"
                style={sp('core')}/>
              {/* Ab grid lines */}
              {[140, 156, 172].map(y => (
                <line key={y} x1="84" y1={y} x2="116" y2={y}
                  stroke={strokeFor('core')} strokeWidth="0.7"
                  opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
              ))}
              <line x1="100" y1="126" x2="100" y2="192"
                stroke={strokeFor('core')} strokeWidth="0.7"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
            </g>

            {/* Hip / Pelvis (non-interactive) */}
            <path d="M78 192 Q100 198 122 192 L124 214 Q100 220 76 214 Z"
              fill="#0f172a" stroke="#1e293b" strokeWidth="0.5"/>

            {/* Legs / Quads + Calves */}
            <g {...gp('legs')}>
              {/* Left quad */}
              <path d="M76 216 Q68 260 70 300 L86 300 Q88 262 86 216 Z"
                style={sp('legs')}/>
              {/* Right quad */}
              <path d="M124 216 Q132 260 130 300 L114 300 Q112 262 114 216 Z"
                style={sp('legs')}/>
              {/* Quad sweep lines */}
              <path d="M72 250 Q78 246 84 250" fill="none" stroke={strokeFor('legs')} strokeWidth="0.8" opacity={opacityFor('legs') * 0.4} style={{pointerEvents:'none'}}/>
              <path d="M128 250 Q122 246 116 250" fill="none" stroke={strokeFor('legs')} strokeWidth="0.8" opacity={opacityFor('legs') * 0.4} style={{pointerEvents:'none'}}/>
              {/* Knee caps */}
              <ellipse cx="78" cy="304" rx="10" ry="7" style={{...sp('legs'), opacity: opacityFor('legs') * 0.7}}/>
              <ellipse cx="122" cy="304" rx="10" ry="7" style={{...sp('legs'), opacity: opacityFor('legs') * 0.7}}/>
              {/* Left calf */}
              <path d="M70 312 Q66 354 68 388 L86 388 Q88 352 84 312 Z"
                style={sp('legs')}/>
              {/* Right calf */}
              <path d="M130 312 Q134 354 132 388 L114 388 Q112 352 116 312 Z"
                style={sp('legs')}/>
            </g>
          </>)}

          {/* ── BACK VIEW ── */}
          {view === 'back' && (<>

            {/* Shoulders (rear delts) */}
            <g {...gp('shoulders')}>
              <ellipse cx="46" cy="96" rx="22" ry="16" style={sp('shoulders')}/>
              <ellipse cx="154" cy="96" rx="22" ry="16" style={sp('shoulders')}/>
            </g>

            {/* Back / Traps + Lats */}
            <g {...gp('back')}>
              {/* Traps */}
              <path d="M78 74 Q100 68 122 74 L120 106 Q100 112 80 106 Z"
                style={sp('back')}/>
              {/* Left lat */}
              <path d="M36 104 L78 78 L80 148 L42 172 Z"
                style={sp('back')} strokeLinejoin="round"/>
              {/* Right lat */}
              <path d="M164 104 L122 78 L120 148 L158 172 Z"
                style={sp('back')} strokeLinejoin="round"/>
              {/* Spine line */}
              <line x1="100" y1="72" x2="100" y2="196"
                stroke={strokeFor('back')} strokeWidth="1"
                opacity={opacityFor('back') * 0.4} style={{pointerEvents:'none'}}/>
            </g>

            {/* Arms (triceps) */}
            <g {...gp('arms')}>
              <path d="M28 104 Q22 130 26 158 L42 162 Q46 134 46 108 Z" style={sp('arms')}/>
              <path d="M172 104 Q178 130 174 158 L158 162 Q154 134 154 108 Z" style={sp('arms')}/>
              <path d="M26 162 Q22 196 28 222 L44 218 Q46 188 42 164 Z" style={sp('arms')}/>
              <path d="M174 162 Q178 196 172 222 L156 218 Q154 188 158 164 Z" style={sp('arms')}/>
            </g>

            {/* Core (lower back / erectors) */}
            <g {...gp('core')}>
              <path d="M80 148 Q100 154 120 148 L118 196 Q100 200 82 196 Z"
                style={sp('core')}/>
              {/* Erector lines */}
              <line x1="94" y1="150" x2="94" y2="196"
                stroke={strokeFor('core')} strokeWidth="0.8"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
              <line x1="106" y1="150" x2="106" y2="196"
                stroke={strokeFor('core')} strokeWidth="0.8"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
            </g>

            {/* Hip (non-interactive) */}
            <path d="M78 196 Q100 202 122 196 L124 214 Q100 220 76 214 Z"
              fill="#0f172a" stroke="#1e293b" strokeWidth="0.5"/>

            {/* Legs (glutes + hamstrings + calves) */}
            <g {...gp('legs')}>
              {/* Glutes */}
              <ellipse cx="86"  cy="220" rx="18" ry="16" style={sp('legs')}/>
              <ellipse cx="114" cy="220" rx="18" ry="16" style={sp('legs')}/>
              {/* Glute cleft */}
              <line x1="100" y1="210" x2="100" y2="236"
                stroke={strokeFor('legs')} strokeWidth="0.8"
                opacity={opacityFor('legs') * 0.35} style={{pointerEvents:'none'}}/>
              {/* Left hamstring */}
              <path d="M76 236 Q68 270 70 308 L86 308 Q88 272 84 236 Z"
                style={sp('legs')}/>
              {/* Right hamstring */}
              <path d="M124 236 Q132 270 130 308 L114 308 Q112 272 116 236 Z"
                style={sp('legs')}/>
              {/* Left calf */}
              <path d="M70 314 Q66 356 68 390 L86 390 Q88 354 84 314 Z"
                style={sp('legs')}/>
              {/* Right calf */}
              <path d="M130 314 Q134 356 132 390 L114 390 Q112 354 116 314 Z"
                style={sp('legs')}/>
            </g>
          </>)}
        </svg>

        {/* Hover tooltip */}
        {tooltipText && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-white/80
            bg-black/75 px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none z-10">
            {tooltipText}
          </div>
        )}
      </div>

      {/* Cardio badge */}
      <button
        onClick={() => onSelect?.('cardio')}
        onMouseEnter={() => setHovered('cardio')}
        onMouseLeave={() => setHovered(null)}
        style={{ filter: filterFor('cardio') }}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all mt-1 ${
          selected === 'cardio'
            ? 'bg-cyan-500/25 text-cyan-200 ring-2 ring-cyan-400'
            : tierMap['cardio']
              ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40'
              : 'glass text-slate-400 hover:text-white'
        }`}
      >
        <span>🫀</span>
        <span>Cardio{tierMap['cardio'] ? ` — ${tierMap['cardio']}` : ''}</span>
      </button>
    </div>
  );
}

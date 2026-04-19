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
    return hovered === g ? 0.8 : 0.55;
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
          viewBox="0 0 200 420"
          width="185"
          height="388"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Human body muscle map"
        >
          {/* ── Body outline (silhouette) — wider, more muscular ── */}
          <path
            d="M100 6 C78 6 64 20 64 34 C64 50 74 61 80 65
               L68 74 C52 74 32 82 16 98 C4 112 2 126 2 134
               L0 196 C0 200 4 204 8 204 L14 204 L14 242
               L4 242 L2 350 C2 354 6 358 10 358 L20 358
               L20 400 C20 410 30 418 42 418 L66 418 C76 418 82 410 82 402
               L82 360 L90 360 L90 418 L110 418 L110 360 L118 360
               L118 402 C118 410 124 418 136 418 L158 418 C170 418 180 410 180 400
               L180 358 L190 358 C194 358 198 354 198 350 L196 242 L186 242
               L186 204 L192 204 C196 204 200 200 200 196 L198 134
               C198 126 194 112 184 98 C168 82 148 74 132 74
               L120 65 C126 61 136 50 136 34 C136 20 122 6 100 6 Z"
            fill="#0a1220"
            stroke="#1e3050"
            strokeWidth="1.5"
          />

          {/* Head */}
          <ellipse cx="100" cy="34" rx="28" ry="28"
            fill="#131f35" stroke="#1e3050" strokeWidth="1.5"/>
          {/* Eyes */}
          <ellipse cx="91" cy="31" rx="4" ry="5" fill="#060d1a" opacity="0.8"/>
          <ellipse cx="109" cy="31" rx="4" ry="5" fill="#060d1a" opacity="0.8"/>
          {/* Mouth */}
          <path d="M93 44 Q100 48 107 44" fill="none" stroke="#1e3050" strokeWidth="1.5" strokeLinecap="round"/>

          {/* Neck */}
          <rect x="89" y="61" width="22" height="14" rx="5"
            fill="#131f35" stroke="#1e3050" strokeWidth="1"/>

          {/* ── FRONT VIEW ── */}
          {view === 'front' && (<>

            {/* RENDER ORDER: chest → core → hip → shoulders (overlap chest) → arms → legs */}

            {/* Chest / Pectorals */}
            <g {...gp('chest')}>
              <path d="M58 72 Q100 62 142 72 L138 122 Q118 136 100 138 Q82 136 62 122 Z"
                style={sp('chest')}/>
              <line x1="100" y1="68" x2="100" y2="138" stroke={strokeFor('chest')} strokeWidth="1"
                opacity={opacityFor('chest') * 0.4} style={{pointerEvents:'none'}}/>
              <path d="M64 114 Q82 126 100 128 Q118 126 136 114"
                fill="none" stroke={strokeFor('chest')} strokeWidth="0.9"
                opacity={opacityFor('chest') * 0.4} style={{pointerEvents:'none'}}/>
            </g>

            {/* Core / Abs */}
            <g {...gp('core')}>
              <path d="M62 136 Q100 142 138 136 L136 198 Q100 204 64 198 Z"
                style={sp('core')}/>
              {[154, 170, 185].map(y => (
                <line key={y} x1="68" y1={y} x2="132" y2={y}
                  stroke={strokeFor('core')} strokeWidth="0.8"
                  opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
              ))}
              <line x1="100" y1="138" x2="100" y2="198"
                stroke={strokeFor('core')} strokeWidth="0.8"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
            </g>

            {/* Hip / Pelvis */}
            <path d="M60 198 Q100 206 140 198 L142 220 Q100 226 58 220 Z"
              fill="#0a1220" stroke="#1a2a40" strokeWidth="0.8"/>

            {/* Shoulders — rendered AFTER chest so they overlap/cover the junction */}
            <g {...gp('shoulders')}>
              <ellipse cx="34" cy="96" rx="34" ry="26" style={sp('shoulders')}/>
              <ellipse cx="166" cy="96" rx="34" ry="26" style={sp('shoulders')}/>
              <path d="M16 92 Q34 84 52 92" fill="none" stroke={strokeFor('shoulders')} strokeWidth="1" opacity={opacityFor('shoulders') * 0.5} style={{pointerEvents:'none'}}/>
              <path d="M148 92 Q166 84 184 92" fill="none" stroke={strokeFor('shoulders')} strokeWidth="1" opacity={opacityFor('shoulders') * 0.5} style={{pointerEvents:'none'}}/>
            </g>

            {/* Arms / Biceps + Forearms */}
            <g {...gp('arms')}>
              <path d="M8 104 Q2 138 6 168 L54 172 Q62 140 60 106 Z" style={sp('arms')}/>
              <path d="M192 104 Q198 138 194 168 L146 172 Q138 140 140 106 Z" style={sp('arms')}/>
              <path d="M6 172 Q2 206 8 232 L52 228 Q56 200 54 174 Z" style={sp('arms')}/>
              <path d="M194 172 Q198 206 192 232 L148 228 Q144 200 146 174 Z" style={sp('arms')}/>
              <path d="M12 136 Q20 124 32 134" fill="none" stroke={strokeFor('arms')} strokeWidth="1" opacity={opacityFor('arms') * 0.45} style={{pointerEvents:'none'}}/>
              <path d="M188 136 Q180 124 168 134" fill="none" stroke={strokeFor('arms')} strokeWidth="1" opacity={opacityFor('arms') * 0.45} style={{pointerEvents:'none'}}/>
            </g>

            {/* Legs / Quads + Calves */}
            <g {...gp('legs')}>
              {/* Left quad */}
              <path d="M58 222 Q46 264 50 302 L88 300 Q94 262 86 222 Z" style={sp('legs')}/>
              {/* Right quad */}
              <path d="M142 222 Q154 264 150 302 L112 300 Q106 262 114 222 Z" style={sp('legs')}/>
              <path d="M50 260 Q62 252 74 260" fill="none" stroke={strokeFor('legs')} strokeWidth="1" opacity={opacityFor('legs') * 0.4} style={{pointerEvents:'none'}}/>
              <path d="M150 260 Q138 252 126 260" fill="none" stroke={strokeFor('legs')} strokeWidth="1" opacity={opacityFor('legs') * 0.4} style={{pointerEvents:'none'}}/>
              {/* Knee caps */}
              <ellipse cx="69" cy="306" rx="18" ry="10" style={{...sp('legs'), opacity: opacityFor('legs') * 0.75}}/>
              <ellipse cx="131" cy="306" rx="18" ry="10" style={{...sp('legs'), opacity: opacityFor('legs') * 0.75}}/>
              {/* Left calf */}
              <path d="M50 316 Q44 350 48 384 L88 384 Q92 350 86 316 Z" style={sp('legs')}/>
              {/* Right calf */}
              <path d="M150 316 Q156 350 152 384 L112 384 Q108 350 114 316 Z" style={sp('legs')}/>
            </g>
          </>)}

          {/* ── BACK VIEW ── */}
          {view === 'back' && (<>

            {/* Shoulders (rear delts) */}
            <g {...gp('shoulders')}>
              <ellipse cx="34" cy="96" rx="34" ry="26" style={sp('shoulders')}/>
              <ellipse cx="166" cy="96" rx="34" ry="26" style={sp('shoulders')}/>
            </g>

            {/* Back / Traps + Lats */}
            <g {...gp('back')}>
              <path d="M60 72 Q100 62 140 72 L136 110 Q100 118 64 110 Z"
                style={sp('back')}/>
              <path d="M16 104 L62 76 L64 148 L24 172 Z"
                style={sp('back')} strokeLinejoin="round"/>
              <path d="M184 104 L138 76 L136 148 L176 172 Z"
                style={sp('back')} strokeLinejoin="round"/>
              <line x1="100" y1="68" x2="100" y2="200"
                stroke={strokeFor('back')} strokeWidth="1.2"
                opacity={opacityFor('back') * 0.4} style={{pointerEvents:'none'}}/>
            </g>

            {/* Arms (triceps) */}
            <g {...gp('arms')}>
              <path d="M8 104 Q2 138 6 168 L54 172 Q62 140 60 106 Z" style={sp('arms')}/>
              <path d="M192 104 Q198 138 194 168 L146 172 Q138 140 140 106 Z" style={sp('arms')}/>
              <path d="M6 172 Q2 206 8 232 L52 228 Q56 200 54 174 Z" style={sp('arms')}/>
              <path d="M194 172 Q198 206 192 232 L148 228 Q144 200 146 174 Z" style={sp('arms')}/>
            </g>

            {/* Core (lower back / erectors) */}
            <g {...gp('core')}>
              <path d="M64 146 Q100 152 136 146 L134 200 Q100 206 66 200 Z"
                style={sp('core')}/>
              <line x1="92" y1="148" x2="92" y2="200"
                stroke={strokeFor('core')} strokeWidth="1"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
              <line x1="108" y1="148" x2="108" y2="200"
                stroke={strokeFor('core')} strokeWidth="1"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
            </g>

            {/* Hip */}
            <path d="M62 200 Q100 208 138 200 L140 222 Q100 228 60 222 Z"
              fill="#0a1220" stroke="#1a2a40" strokeWidth="0.8"/>

            {/* Legs (glutes + hamstrings + calves) */}
            <g {...gp('legs')}>
              <ellipse cx="80"  cy="228" rx="24" ry="18" style={sp('legs')}/>
              <ellipse cx="120" cy="228" rx="24" ry="18" style={sp('legs')}/>
              <line x1="100" y1="214" x2="100" y2="244"
                stroke={strokeFor('legs')} strokeWidth="1"
                opacity={opacityFor('legs') * 0.35} style={{pointerEvents:'none'}}/>
              {/* Left hamstring */}
              <path d="M58 244 Q46 282 50 318 L86 316 Q90 278 80 244 Z" style={sp('legs')}/>
              {/* Right hamstring */}
              <path d="M142 244 Q154 282 150 318 L114 316 Q110 278 120 244 Z" style={sp('legs')}/>
              {/* Left calf */}
              <path d="M50 324 Q46 358 50 388 L88 388 Q92 356 86 324 Z" style={sp('legs')}/>
              {/* Right calf */}
              <path d="M150 324 Q154 358 150 388 L112 388 Q108 356 114 324 Z" style={sp('legs')}/>
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

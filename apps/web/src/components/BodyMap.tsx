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
          viewBox="0 0 200 440"
          width="200"
          height="440"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Human body muscle map"
        >
          {/* ── Body outline (silhouette) — wider, more muscular ── */}
          <path
            d="M100 6 C78 6 64 20 64 36 C64 52 74 63 80 67
               L68 76 C52 76 32 84 16 100 C4 114 2 128 2 136
               L0 198 C0 202 4 206 8 206 L14 206 L14 244
               L4 244 L2 366 C2 370 6 374 10 374 L20 374
               L20 424 C20 434 30 442 42 442 L66 442 C76 442 82 432 82 424
               L82 378 L90 378 L90 442 C90 448 96 452 102 452
               L118 452 C124 452 130 448 130 442 L130 378 L142 378
               L142 424 C142 432 148 442 158 442 L180 442 C192 442 180 434 180 424
               L180 374 L190 374 C194 374 198 370 198 366 L196 244 L186 244
               L186 206 L192 206 C196 206 200 202 200 198 L198 136
               C198 128 194 114 184 100 C168 84 148 76 132 76
               L120 67 C126 63 136 52 136 36 C136 20 122 6 100 6 Z"
            fill="#0a1220"
            stroke="#1e3050"
            strokeWidth="1.5"
          />

          {/* Head */}
          <ellipse cx="100" cy="36" rx="28" ry="30"
            fill="#131f35" stroke="#1e3050" strokeWidth="1.5"/>
          {/* Eyes */}
          <ellipse cx="91" cy="33" rx="4" ry="5" fill="#060d1a" opacity="0.8"/>
          <ellipse cx="109" cy="33" rx="4" ry="5" fill="#060d1a" opacity="0.8"/>
          {/* Mouth */}
          <path d="M93 46 Q100 50 107 46" fill="none" stroke="#1e3050" strokeWidth="1.5" strokeLinecap="round"/>

          {/* Neck */}
          <rect x="89" y="65" width="22" height="14" rx="5"
            fill="#131f35" stroke="#1e3050" strokeWidth="1"/>

          {/* ── FRONT VIEW ── */}
          {view === 'front' && (<>

            {/* RENDER ORDER: chest → core → hip → shoulders (overlap chest) → arms → legs */}

            {/* Chest / Pectorals — rendered first so shoulders overlap its edges */}
            <g {...gp('chest')}>
              <path d="M58 74 Q100 64 142 74 L138 128 Q118 142 100 144 Q82 142 62 128 Z"
                style={sp('chest')}/>
              <line x1="100" y1="70" x2="100" y2="144" stroke={strokeFor('chest')} strokeWidth="1"
                opacity={opacityFor('chest') * 0.4} style={{pointerEvents:'none'}}/>
              <path d="M64 120 Q82 132 100 134 Q118 132 136 120"
                fill="none" stroke={strokeFor('chest')} strokeWidth="0.9"
                opacity={opacityFor('chest') * 0.4} style={{pointerEvents:'none'}}/>
            </g>

            {/* Core / Abs — connects directly to chest bottom */}
            <g {...gp('core')}>
              <path d="M62 142 Q100 148 138 142 L136 210 Q100 216 64 210 Z"
                style={sp('core')}/>
              {[162, 178, 194].map(y => (
                <line key={y} x1="68" y1={y} x2="132" y2={y}
                  stroke={strokeFor('core')} strokeWidth="0.8"
                  opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
              ))}
              <line x1="100" y1="144" x2="100" y2="210"
                stroke={strokeFor('core')} strokeWidth="0.8"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
            </g>

            {/* Hip / Pelvis */}
            <path d="M60 210 Q100 218 140 210 L142 234 Q100 240 58 234 Z"
              fill="#0a1220" stroke="#1a2a40" strokeWidth="0.8"/>

            {/* Shoulders — rendered AFTER chest so they overlap/cover the junction */}
            <g {...gp('shoulders')}>
              <ellipse cx="34" cy="100" rx="34" ry="26" style={sp('shoulders')}/>
              <ellipse cx="166" cy="100" rx="34" ry="26" style={sp('shoulders')}/>
              <path d="M16 96 Q34 88 52 96" fill="none" stroke={strokeFor('shoulders')} strokeWidth="1" opacity={opacityFor('shoulders') * 0.5} style={{pointerEvents:'none'}}/>
              <path d="M148 96 Q166 88 184 96" fill="none" stroke={strokeFor('shoulders')} strokeWidth="1" opacity={opacityFor('shoulders') * 0.5} style={{pointerEvents:'none'}}/>
            </g>

            {/* Arms / Biceps + Forearms — on top of shoulders */}
            <g {...gp('arms')}>
              <path d="M8 108 Q2 142 6 174 L54 178 Q62 144 60 110 Z"
                style={sp('arms')}/>
              <path d="M192 108 Q198 142 194 174 L146 178 Q138 144 140 110 Z"
                style={sp('arms')}/>
              <path d="M6 178 Q2 214 8 242 L52 238 Q56 208 54 180 Z"
                style={sp('arms')}/>
              <path d="M194 178 Q198 214 192 242 L148 238 Q144 208 146 180 Z"
                style={sp('arms')}/>
              <path d="M12 140 Q20 128 32 138" fill="none" stroke={strokeFor('arms')} strokeWidth="1" opacity={opacityFor('arms') * 0.45} style={{pointerEvents:'none'}}/>
              <path d="M188 140 Q180 128 168 138" fill="none" stroke={strokeFor('arms')} strokeWidth="1" opacity={opacityFor('arms') * 0.45} style={{pointerEvents:'none'}}/>
            </g>

            {/* Legs / Quads + Calves */}
            <g {...gp('legs')}>
              <path d="M58 236 Q46 282 50 324 L90 322 Q96 278 88 236 Z"
                style={sp('legs')}/>
              <path d="M142 236 Q154 282 150 324 L110 322 Q104 278 112 236 Z"
                style={sp('legs')}/>
              <path d="M50 276 Q62 268 76 276" fill="none" stroke={strokeFor('legs')} strokeWidth="1" opacity={opacityFor('legs') * 0.4} style={{pointerEvents:'none'}}/>
              <path d="M150 276 Q138 268 124 276" fill="none" stroke={strokeFor('legs')} strokeWidth="1" opacity={opacityFor('legs') * 0.4} style={{pointerEvents:'none'}}/>
              <ellipse cx="70" cy="328" rx="18" ry="11" style={{...sp('legs'), opacity: opacityFor('legs') * 0.75}}/>
              <ellipse cx="130" cy="328" rx="18" ry="11" style={{...sp('legs'), opacity: opacityFor('legs') * 0.75}}/>
              <path d="M50 338 Q44 378 48 412 L90 412 Q94 376 88 338 Z"
                style={sp('legs')}/>
              <path d="M150 338 Q156 378 152 412 L110 412 Q106 376 112 338 Z"
                style={sp('legs')}/>
            </g>
          </>)}

          {/* ── BACK VIEW ── */}
          {view === 'back' && (<>

            {/* Shoulders (rear delts) */}
            <g {...gp('shoulders')}>
              <ellipse cx="36" cy="100" rx="32" ry="24" style={sp('shoulders')}/>
              <ellipse cx="164" cy="100" rx="32" ry="24" style={sp('shoulders')}/>
            </g>

            {/* Back / Traps + Lats */}
            <g {...gp('back')}>
              <path d="M60 76 Q100 66 140 76 L136 116 Q100 124 64 116 Z"
                style={sp('back')}/>
              <path d="M16 108 L62 80 L64 156 L24 180 Z"
                style={sp('back')} strokeLinejoin="round"/>
              <path d="M184 108 L138 80 L136 156 L176 180 Z"
                style={sp('back')} strokeLinejoin="round"/>
              <line x1="100" y1="72" x2="100" y2="210"
                stroke={strokeFor('back')} strokeWidth="1.2"
                opacity={opacityFor('back') * 0.4} style={{pointerEvents:'none'}}/>
            </g>

            {/* Arms (triceps) — thick, close to torso */}
            <g {...gp('arms')}>
              <path d="M12 108 Q6 140 10 172 L52 176 Q58 142 56 110 Z" style={sp('arms')}/>
              <path d="M188 108 Q194 140 190 172 L148 176 Q142 142 144 110 Z" style={sp('arms')}/>
              <path d="M10 176 Q6 212 12 238 L50 234 Q54 206 52 178 Z" style={sp('arms')}/>
              <path d="M190 176 Q194 212 188 238 L150 234 Q146 206 148 178 Z" style={sp('arms')}/>
            </g>

            {/* Core (lower back / erectors) */}
            <g {...gp('core')}>
              <path d="M64 154 Q100 160 136 154 L134 210 Q100 216 66 210 Z"
                style={sp('core')}/>
              <line x1="92" y1="156" x2="92" y2="210"
                stroke={strokeFor('core')} strokeWidth="1"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
              <line x1="108" y1="156" x2="108" y2="210"
                stroke={strokeFor('core')} strokeWidth="1"
                opacity={opacityFor('core') * 0.35} style={{pointerEvents:'none'}}/>
            </g>

            {/* Hip */}
            <path d="M62 210 Q100 218 138 210 L140 234 Q100 240 60 234 Z"
              fill="#0a1220" stroke="#1a2a40" strokeWidth="0.8"/>

            {/* Legs (glutes + hamstrings + calves) */}
            <g {...gp('legs')}>
              <ellipse cx="80"  cy="240" rx="24" ry="20" style={sp('legs')}/>
              <ellipse cx="120" cy="240" rx="24" ry="20" style={sp('legs')}/>
              <line x1="100" y1="224" x2="100" y2="258"
                stroke={strokeFor('legs')} strokeWidth="1"
                opacity={opacityFor('legs') * 0.35} style={{pointerEvents:'none'}}/>
              <path d="M58 256 Q46 298 50 336 L86 334 Q90 292 80 256 Z"
                style={sp('legs')}/>
              <path d="M142 256 Q154 298 150 336 L114 334 Q110 292 120 256 Z"
                style={sp('legs')}/>
              <path d="M50 342 Q46 382 50 418 L88 418 Q92 380 86 342 Z"
                style={sp('legs')}/>
              <path d="M150 342 Q154 382 150 418 L112 418 Q108 380 114 342 Z"
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

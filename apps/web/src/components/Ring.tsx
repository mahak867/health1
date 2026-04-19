import React from 'react';

interface RingProps {
  /** 0–100 */
  value: number;
  /** hex or tailwind-like color string */
  color: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  children?: React.ReactNode;
}

export default function Ring({
  value,
  color,
  trackColor = '#1e1e2e',
  size = 96,
  strokeWidth = 9,
  label,
  sublabel,
  children
}: RingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(value, 0), 100) / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
      {label && <p className="text-xs font-semibold text-white">{label}</p>}
      {sublabel && <p className="text-[10px] text-slate-500">{sublabel}</p>}
    </div>
  );
}

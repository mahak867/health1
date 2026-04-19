import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  filled?: boolean;
}

/** Pure-SVG sparkline chart — no external dependencies. */
export default function Sparkline({
  data,
  color = '#6366f1',
  height = 40,
  width = 120,
  strokeWidth = 2,
  filled = true,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;

  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + ((max - v) / range) * (height - pad * 2),
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath = [
    `M${points[0].x.toFixed(1)},${height - pad}`,
    ...points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${points[points.length - 1].x.toFixed(1)},${height - pad}`,
    'Z',
  ].join(' ');

  const lastPt = points[points.length - 1];
  const gradId = `sg-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {filled && (
        <path d={areaPath} fill={`url(#${gradId})`} />
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt.x} cy={lastPt.y} r={3} fill={color} />
    </svg>
  );
}

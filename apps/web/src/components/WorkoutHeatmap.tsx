import React, { useMemo } from 'react';

interface HeatmapProps {
  /** Map of "YYYY-MM-DD" → count */
  data: Record<string, number>;
  /** Number of weeks to display (default 16) */
  weeks?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL = 13;
const GAP  = 2;

function intensityClass(count: number): string {
  if (count === 0) return 'bg-white/5';
  if (count === 1) return 'bg-violet-500/30';
  if (count === 2) return 'bg-violet-500/55';
  if (count === 3) return 'bg-violet-500/80';
  return 'bg-violet-400';
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** GitHub-style workout activity heatmap (pure CSS grid, no SVG needed). */
export default function WorkoutHeatmap({ data, weeks = 16 }: HeatmapProps) {
  const grid = useMemo(() => {
    // Build a grid of `weeks` columns × 7 rows (days of week)
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Find the Sunday at or before `weeks` weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);

    const columns: { date: string; count: number }[][] = [];
    let d = new Date(startDate);

    for (let w = 0; w < weeks; w++) {
      const week: { date: string; count: number }[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const key = isoDate(d);
        week.push({ date: key, count: data[key] ?? 0 });
        d.setDate(d.getDate() + 1);
      }
      columns.push(week);
    }
    return columns;
  }, [data, weeks]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    grid.forEach((week, col) => {
      const m = new Date(week[0].date).getMonth();
      if (m !== lastMonth) {
        labels.push({ label: new Date(week[0].date).toLocaleString('default', { month: 'short' }), col });
        lastMonth = m;
      }
    });
    return labels;
  }, [grid]);

  const totalThisYear = Object.values(data).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Workout Activity</p>
        <span className="text-xs text-slate-500">{totalThisYear} workouts logged</span>
      </div>

      {/* Month labels row */}
      <div className="overflow-x-auto">
        <div style={{ width: grid.length * (CELL + GAP) }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ gap: GAP }}>
            {grid.map((week, col) => {
              const ml = monthLabels.find((l) => l.col === col);
              return (
                <div key={col} style={{ width: CELL, flexShrink: 0 }} className="text-[9px] text-slate-600 font-medium truncate">
                  {ml?.label ?? ''}
                </div>
              );
            })}
          </div>

          {/* Day rows */}
          <div className="flex" style={{ gap: GAP }}>
            {grid.map((week, col) => (
              <div key={col} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.count} workout${cell.count !== 1 ? 's' : ''}`}
                    style={{ width: CELL, height: CELL }}
                    className={`rounded-sm transition-colors ${intensityClass(cell.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[10px] text-slate-600">Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} style={{ width: 10, height: 10 }} className={`rounded-sm ${intensityClass(n)}`} />
        ))}
        <span className="text-[10px] text-slate-600">More</span>
      </div>
    </div>
  );
}

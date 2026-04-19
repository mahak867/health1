import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  distance_m: number | null;
  duration_seconds: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  elevation_m: number | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string;
  kudos_count?: number;
  route_points?: Array<{ lat: number; lon: number }>;
}

/** Render a tiny SVG polyline map from lat/lon points */
function RouteMiniMap({ points, color }: { points: Array<{ lat: number; lon: number }>; color: string }) {
  if (points.length < 2) return null;
  const W = 80; const H = 48;
  const minLat = Math.min(...points.map((p) => p.lat));
  const maxLat = Math.max(...points.map((p) => p.lat));
  const minLon = Math.min(...points.map((p) => p.lon));
  const maxLon = Math.max(...points.map((p) => p.lon));
  const latR = maxLat - minLat || 1e-9;
  const lonR = maxLon - minLon || 1e-9;
  const pad = 4;
  const toX = (lon: number) => pad + ((lon - minLon) / lonR) * (W - pad * 2);
  const toY = (lat: number) => H - pad - ((lat - minLat) / latR) * (H - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.lon).toFixed(1)},${toY(p.lat).toFixed(1)}`).join(' ');
  return (
    <svg width={W} height={H} className="rounded-lg shrink-0" style={{ background: `${color}11` }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={toX(points[0].lon)} cy={toY(points[0].lat)} r="3" fill="#22c55e" />
      <circle cx={toX(points[points.length - 1].lon)} cy={toY(points[points.length - 1].lat)} r="3" fill="#ef4444" />
    </svg>
  );
}

/** Karvonen HR zones (5 zones) from avg HR approximation */
function hrZoneLabel(hr: number): { zone: number; label: string; color: string } {
  if (hr < 114) return { zone: 1, label: 'Zone 1 — Easy',      color: '#22c55e' };
  if (hr < 133) return { zone: 2, label: 'Zone 2 — Aerobic',   color: '#3b82f6' };
  if (hr < 152) return { zone: 3, label: 'Zone 3 — Tempo',     color: '#f59e0b' };
  if (hr < 171) return { zone: 4, label: 'Zone 4 — Threshold', color: '#f97316' };
  return         { zone: 5, label: 'Zone 5 — Max',             color: '#ef4444' };
}

const ACTIVITY_ICONS: Record<string, string> = {
  run: '🏃', ride: '🚴', walk: '🚶', swim: '🏊', hike: '🥾', row: '🚣', other: '⚡'
};

const ACTIVITY_COLORS: Record<string, string> = {
  run: '#f97316', ride: '#3b82f6', walk: '#22c55e', swim: '#06b6d4',
  hike: '#a16207', row: '#8b5cf6', other: '#6b7280'
};

const empty = {
  activityType: 'run',
  title: '',
  distanceM: '',
  durationSeconds: '',
  caloriesBurned: '',
  avgHeartRate: '',
  elevationM: '',
  notes: '',
  completedAt: new Date().toISOString().slice(0, 16)
};

function fmt(seconds: number | null) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDist(m: number | null) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m} m`;
}

function pace(distM: number | null, secs: number | null) {
  if (!distM || !secs || distM < 100) return null;
  const minPerKm = secs / 60 / (distM / 1000);
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [distancePBs, setDistancePBs] = useState<any[] | null>(null);

  function load() {
    api.get<{ activities: Activity[] }>('/activities').then((r) => setActivities(r.activities));
  }

  useEffect(() => {
    load();
    api.get<{ personalBests: any[] }>('/activities/personal-bests')
      .then((r) => setDistancePBs(r.personalBests))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const body: any = {
        activityType: form.activityType,
        title: form.title,
        completedAt: new Date(form.completedAt).toISOString()
      };
      if (form.distanceM)       body.distanceM       = Number(form.distanceM);
      if (form.durationSeconds) body.durationSeconds = Number(form.durationSeconds);
      if (form.caloriesBurned)  body.caloriesBurned  = Number(form.caloriesBurned);
      if (form.avgHeartRate)    body.avgHeartRate     = Number(form.avgHeartRate);
      if (form.elevationM)      body.elevationM       = Number(form.elevationM);
      if (form.notes)           body.notes            = form.notes;
      await api.post('/activities', body);
      setForm(empty); setShowForm(false); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleKudos(id: string) {
    try {
      await api.post(`/activities/${id}/kudos`, {});
      load();
    } catch (_) {}
  }

  // Stats
  const totalDist    = activities.reduce((s, a) => s + (a.distance_m ?? 0), 0);
  const totalCal     = activities.reduce((s, a) => s + (a.calories_burned ?? 0), 0);
  const totalTime    = activities.reduce((s, a) => s + (a.duration_seconds ?? 0), 0);

  // This week's stats
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0,0,0,0);
  const thisWeek    = activities.filter((a) => new Date(a.completed_at) >= startOfWeek);
  const weekDist    = thisWeek.reduce((s, a) => s + (a.distance_m ?? 0), 0);
  const weekTime    = thisWeek.reduce((s, a) => s + (a.duration_seconds ?? 0), 0);
  const weekCal     = thisWeek.reduce((s, a) => s + (a.calories_burned ?? 0), 0);

  // Activity type distribution (this month)
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
  const thisMonth = activities.filter((a) => new Date(a.completed_at) >= startOfMonth);
  const typeCounts: Record<string, number> = {};
  thisMonth.forEach((a) => { typeCounts[a.activity_type] = (typeCounts[a.activity_type] ?? 0) + 1; });
  const typeTotal = Object.values(typeCounts).reduce((s, v) => s + v, 0);
  const TYPE_COLORS: Record<string, string> = { run: '#f97316', ride: '#3b82f6', walk: '#22c55e', swim: '#06b6d4', hike: '#a855f7', row: '#f59e0b', other: '#6b7280' };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Activities 🏃</h1>
          <p className="text-slate-500 text-sm mt-1">Track runs, rides, walks and more</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
        >
          {showForm ? 'Cancel' : '+ Log Activity'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Distance', value: fmtDist(totalDist), icon: '📍' },
          { label: 'Total Calories', value: `${totalCal.toLocaleString()} kcal`, icon: '🔥' },
          { label: 'Total Time',     value: fmt(totalTime), icon: '⏱️' }
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-white font-black text-lg">{s.value}</p>
            <p className="text-slate-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Distance PRs — Strava-style fastest times per distance */}
      {distancePBs && distancePBs.some((pb) => pb.pb !== null) && (
        <div className="glass rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">🏅 Distance Personal Bests</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {distancePBs.map((item) => (
              <div key={item.label} className={`glass rounded-xl p-3 text-center ${item.pb ? 'border border-yellow-500/25' : 'opacity-40'}`}>
                <p className="text-xs font-bold text-slate-400 mb-1">{item.label}</p>
                {item.pb ? (
                  <>
                    <p className="text-lg font-black text-yellow-400">
                      {Math.floor(item.pb.durationSec / 3600) > 0
                        ? `${Math.floor(item.pb.durationSec / 3600)}h ${Math.floor((item.pb.durationSec % 3600) / 60)}m`
                        : `${Math.floor(item.pb.durationSec / 60)}:${String(item.pb.durationSec % 60).padStart(2,'0')}`}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.pb.paceMinKm} /km</p>
                    <p className="text-[9px] text-slate-600 mt-1 truncate">{item.pb.title}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-600 mt-2">No runs yet</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* This Week's Progress (Strava-style) + Activity Type Distribution */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Weekly summary */}
        <div className="glass rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">📅 This Week</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-black text-orange-400">{fmtDist(weekDist) ?? '—'}</p>
              <p className="text-[10px] text-slate-500">Distance</p>
            </div>
            <div>
              <p className="text-xl font-black text-blue-400">{fmt(weekTime)}</p>
              <p className="text-[10px] text-slate-500">Active Time</p>
            </div>
            <div>
              <p className="text-xl font-black text-red-400">{weekCal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Kcal Burned</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[10px] text-slate-500">{thisWeek.length} activities this week</p>
            {/* Weekly distance progress toward 30km goal */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Weekly distance goal</span>
                <span className="font-bold text-orange-300">{fmtDist(weekDist) ?? '0'} / 30 km</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min((weekDist / 30000) * 100, 100)}%`, background: '#f97316' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Activity type distribution pie */}
        {typeTotal > 0 && (
          <div className="glass rounded-2xl p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">📊 This Month</p>
            <div className="flex items-center gap-4">
              {/* Mini donut */}
              {(() => {
                const R = 36; const cx = 42; const cy = 42; const sw = 14;
                const circ = 2 * Math.PI * R;
                let offset = 0;
                const types = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                return (
                  <svg width={84} height={84} viewBox="0 0 84 84" className="shrink-0">
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="#ffffff08" strokeWidth={sw} />
                    {types.map(([type, count]) => {
                      const frac = count / typeTotal;
                      const el = (
                        <circle key={type} cx={cx} cy={cy} r={R}
                          fill="none" stroke={TYPE_COLORS[type] ?? '#6b7280'} strokeWidth={sw}
                          strokeDasharray={`${frac * circ} ${circ}`}
                          strokeDashoffset={-offset * circ}
                          transform={`rotate(-90 ${cx} ${cy})`} />
                      );
                      offset += frac;
                      return el;
                    })}
                    <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{typeTotal}</text>
                  </svg>
                );
              })()}
              <div className="space-y-1.5 flex-1">
                {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[type] ?? '#6b7280' }} />
                    <span className="capitalize text-slate-300 flex-1">{type}</span>
                    <span className="font-bold text-white">{count}</span>
                    <span className="text-slate-500">({Math.round((count / typeTotal) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log form */}
      {showForm && (
        <Card>
          <h2 className="text-base font-bold text-white mb-4">Log Activity</h2>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {/* Activity type */}
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <div className="flex gap-2 flex-wrap">
                {['run','ride','walk','swim','hike','row','other'].map((t) => (
                  <button type="button" key={t}
                    onClick={() => setForm((f) => ({ ...f, activityType: t }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                      form.activityType === t ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {ACTIVITY_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Morning Run" className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-orange-500/50" />
            </div>

            {[
              { label: 'Distance (m)', key: 'distanceM', placeholder: '5000' },
              { label: 'Duration (s)', key: 'durationSeconds', placeholder: '1800' },
              { label: 'Calories',     key: 'caloriesBurned',  placeholder: '350' },
              { label: 'Avg HR (bpm)', key: 'avgHeartRate',    placeholder: '145' },
              { label: 'Elevation (m)',key: 'elevationM',      placeholder: '80' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type="number" min="0" value={(form as any)[key]} placeholder={placeholder}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-orange-500/50" />
              </div>
            ))}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Date & Time</label>
              <input type="datetime-local" value={form.completedAt}
                onChange={(e) => setForm((f) => ({ ...f, completedAt: e.target.value }))}
                className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white border border-white/10 focus:outline-none focus:border-orange-500/50" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="How did it feel?" rows={2}
                className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-orange-500/50 resize-none" />
            </div>

            <div className="col-span-2">
              <button type="submit" className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2.5 rounded-xl transition-colors">
                Save Activity
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Activity list */}
      <div className="space-y-3">
        {activities.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">🏃</p>
            <p className="font-semibold">No activities yet</p>
            <p className="text-sm mt-1">Log your first run, ride or walk</p>
          </div>
        )}
        {activities.map((a) => {
          const color = ACTIVITY_COLORS[a.activity_type] ?? '#6b7280';
          const p = pace(a.distance_m, a.duration_seconds);
          return (
            <div key={a.id} className="glass rounded-2xl p-4 flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${color}22`, border: `1.5px solid ${color}44` }}>
                {ACTIVITY_ICONS[a.activity_type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-white text-sm truncate">{a.title}</h3>
                  <span className="text-xs text-slate-500 shrink-0">
                    {new Date(a.completed_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {a.distance_m   != null && <Stat icon="📍" v={fmtDist(a.distance_m)} />}
                  {a.duration_seconds != null && <Stat icon="⏱️" v={fmt(a.duration_seconds)} />}
                  {p && <Stat icon="⚡" v={p} />}
                  {a.calories_burned != null && <Stat icon="🔥" v={`${a.calories_burned} kcal`} />}
                  {a.avg_heart_rate  != null && (
                    <>
                      <Stat icon="💓" v={`${a.avg_heart_rate} bpm`} />
                      {(() => {
                        const z = hrZoneLabel(a.avg_heart_rate);
                        return (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${z.color}20`, color: z.color }}>
                            {z.label}
                          </span>
                        );
                      })()}
                    </>
                  )}
                  {a.elevation_m     != null && a.elevation_m > 0 && <Stat icon="⛰️" v={`${a.elevation_m}m`} />}
                </div>
                {a.notes && <p className="text-slate-500 text-xs mt-2 truncate">{a.notes}</p>}
                {a.route_points && a.route_points.length >= 2 && (
                  <div className="mt-2">
                    <RouteMiniMap points={a.route_points} color={color} />
                  </div>
                )}
                {/* HR Zones bar from per-activity zone seconds */}
                {(() => {
                  const z1 = (a as any).hr_zone1_s ?? 0;
                  const z2 = (a as any).hr_zone2_s ?? 0;
                  const z3 = (a as any).hr_zone3_s ?? 0;
                  const z4 = (a as any).hr_zone4_s ?? 0;
                  const z5 = (a as any).hr_zone5_s ?? 0;
                  const total = z1 + z2 + z3 + z4 + z5;
                  if (total === 0) return null;
                  const zones = [
                    { s: z1, color: '#94a3b8', label: 'Z1' },
                    { s: z2, color: '#22c55e', label: 'Z2' },
                    { s: z3, color: '#f59e0b', label: 'Z3' },
                    { s: z4, color: '#f97316', label: 'Z4' },
                    { s: z5, color: '#ef4444', label: 'Z5' },
                  ];
                  return (
                    <div className="mt-2">
                      <p className="text-[10px] text-slate-500 mb-1">HR Zones</p>
                      <div className="flex h-2.5 rounded-full overflow-hidden w-full">
                        {zones.map((z) => z.s > 0 && (
                          <div key={z.label} style={{ width: `${(z.s / total) * 100}%`, background: z.color }}
                            title={`${z.label}: ${Math.round(z.s / 60)}min`} />
                        ))}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {zones.map((z) => z.s > 0 && (
                          <span key={z.label} className="text-[9px]" style={{ color: z.color }}>
                            {z.label} {Math.round(z.s / 60)}m
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button onClick={() => handleKudos(a.id)}
                className="shrink-0 flex flex-col items-center gap-0.5 text-slate-500 hover:text-yellow-400 transition-colors">
                <span className="text-lg">👍</span>
                <span className="text-[10px] font-bold">{a.kudos_count ?? 0}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, v }: { icon: string; v: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-slate-300">
      <span>{icon}</span><span>{v}</span>
    </span>
  );
}

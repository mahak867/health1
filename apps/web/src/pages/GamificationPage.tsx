import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface XPData {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
}

interface Badge {
  key: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  earnedAt: string | null;
}

interface Challenge {
  id: string;
  key: string;
  title: string;
  description: string;
  cadence: string;
  goal: number;
  xp_reward: number;
  icon: string;
  userProgress: number;
  completed: boolean;
  completedAt: string | null;
}

export default function GamificationPage() {
  const [xp, setXp] = useState<XPData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tab, setTab] = useState<'challenges' | 'badges'>('challenges');

  useEffect(() => {
    api.get<XPData>('/gamification/xp').then(setXp).catch(() => {});
    api.get<{ badges: Badge[] }>('/gamification/badges').then((r) => setBadges(r.badges)).catch(() => {});
    api.get<{ challenges: Challenge[] }>('/gamification/challenges').then((r) => setChallenges(r.challenges)).catch(() => {});
  }, []);

  const earnedBadges = badges.filter((b) => b.earned);
  const unearnedBadges = badges.filter((b) => !b.earned);
  const dailyChallenges = challenges.filter((c) => c.cadence === 'daily');
  const weeklyChallenges = challenges.filter((c) => c.cadence === 'weekly');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Gamification 🎮</h1>
        <p className="text-slate-500 text-sm mt-1">Earn XP, unlock badges, and crush challenges</p>
      </div>

      {/* XP Level card */}
      {xp && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Current Level</p>
              <p className="text-5xl font-black text-white">
                <span className="text-gradient-green">LVL {xp.level}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total XP</p>
              <p className="text-2xl font-black text-yellow-400">{xp.totalXP.toLocaleString()}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{xp.currentLevelXP} XP into this level</span>
              <span>{xp.nextLevelXP} XP to next level</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${xp.progress}%`, background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">{xp.progress}% to Level {xp.level + 1}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['challenges', 'badges'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${
              tab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            {t === 'challenges' ? '🎯 Challenges' : `🏅 Badges (${earnedBadges.length}/${badges.length})`}
          </button>
        ))}
      </div>

      {/* Challenges tab */}
      {tab === 'challenges' && (
        <div className="space-y-6">
          {[{ label: '📅 Daily Challenges', items: dailyChallenges }, { label: '📆 Weekly Challenges', items: weeklyChallenges }].map(({ label, items }) => (
            <div key={label}>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">{label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((c) => {
                  const pct = Math.min((c.userProgress / c.goal) * 100, 100);
                  return (
                    <div key={c.id} className={`glass rounded-2xl p-4 ${c.completed ? 'border border-green-500/30' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{c.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{c.title}</p>
                            <p className="text-xs text-slate-500">{c.description}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-yellow-400 ml-2">+{c.xp_reward} XP</span>
                      </div>
                      <div className="space-y-1 mt-3">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{c.completed ? '✅ Completed!' : `${c.userProgress} / ${c.goal}`}</span>
                          <span>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: c.completed ? '#22c55e' : '#f59e0b' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badges tab */}
      {tab === 'badges' && (
        <div className="space-y-6">
          {earnedBadges.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">🏅 Earned ({earnedBadges.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {earnedBadges.map((b) => (
                  <BadgeCard key={b.key} badge={b} />
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">🔒 Locked ({unearnedBadges.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {unearnedBadges.map((b) => (
                <BadgeCard key={b.key} badge={b} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div className={`glass rounded-2xl p-4 text-center transition-all ${
      badge.earned ? 'border border-yellow-500/30' : 'opacity-40'
    }`}>
      <p className="text-3xl mb-2">{badge.earned ? badge.icon : '🔒'}</p>
      <p className="text-xs font-bold text-white">{badge.name}</p>
      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{badge.desc}</p>
      {badge.earned && badge.earnedAt && (
        <p className="text-[9px] text-green-400 mt-2 font-semibold">
          {new Date(badge.earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

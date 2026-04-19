import React from 'react';
import type { AuthUser } from '../lib/auth';

interface Props {
  user: AuthUser | null;
  page: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
}

const LINKS: { label: string; icon: string }[] = [
  { label: 'Dashboard',      icon: '⚡' },
  { label: 'Vitals',         icon: '💓' },
  { label: 'Workouts',       icon: '🏋️' },
  { label: 'Activities',     icon: '🏃' },
  { label: 'Feed',           icon: '🌊' },
  { label: 'Meals',          icon: '🥗' },
  { label: 'Ranking',        icon: '🏆' },
  { label: 'Gamification',   icon: '🎮' },
  { label: 'AI Engine',      icon: '🧠' },
  { label: 'Breathwork',     icon: '🧘' },
  { label: 'Telemedicine',   icon: '🩺' },
  { label: 'Notifications',  icon: '🔔' },
  { label: 'Profile',        icon: '👤' },
];

export default function Navbar({ user, page, onNavigate, onLogout }: Props) {
  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 py-2.5 flex items-center gap-4">
      {/* Logo */}
      <button onClick={() => onNavigate('Dashboard')} className="shrink-0 flex items-center gap-1.5 mr-2">
        <span className="text-xl">🌿</span>
        <span className="font-black text-base tracking-tight text-gradient-green hidden sm:block">HealthSphere</span>
      </button>

      {/* Nav links */}
      <div className="flex gap-0.5 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
        {LINKS.map(({ label, icon }) => (
          <button
            key={label}
            onClick={() => onNavigate(label)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              page === label
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{icon}</span>
            <span className="hidden md:block">{label}</span>
          </button>
        ))}
      </div>

      {/* User + logout */}
      <div className="ml-auto shrink-0 flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-white leading-none">{user.full_name}</span>
            <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
          </div>
        )}
        <button
          onClick={onLogout}
          className="text-xs font-medium text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

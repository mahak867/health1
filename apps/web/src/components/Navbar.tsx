import React from 'react';
import type { AuthUser } from '../lib/auth';

interface Props {
  user: AuthUser | null;
  page: string;
  onNavigate: (p: string) => void;
  onLogout: () => void;
}

const LINKS = ['Dashboard', 'Vitals', 'Workouts', 'Meals', 'Telemedicine', 'Notifications', 'Profile'];

export default function Navbar({ user, page, onNavigate, onLogout }: Props) {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-6">
      <span className="font-bold text-emerald-400 text-lg shrink-0">HealthSphere</span>
      <div className="flex gap-2 flex-wrap">
        {LINKS.map((l) => (
          <button
            key={l}
            onClick={() => onNavigate(l)}
            className={`px-3 py-1 rounded text-sm ${page === l ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3 shrink-0">
        {user && <span className="text-xs text-slate-400">{user.full_name} ({user.role})</span>}
        <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-300">Logout</button>
      </div>
    </nav>
  );
}

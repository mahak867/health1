import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { getUser, clearAuth, type AuthUser } from './lib/auth';
import { api } from './lib/api';
import AdminNav from './components/AdminNav';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import ProvidersPage from './pages/ProvidersPage';
import AuditLogPage from './pages/AuditLogPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';

const PAGES: Record<string, React.FC<any>> = {
  Overview: OverviewPage,
  Users: UsersPage,
  Providers: ProvidersPage,
  'Audit Log': AuditLogPage,
  Reports: ReportsPage,
  Analytics: AnalyticsPage
};

function LoginForm({ onAuth }: { onAuth: () => void }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.post<{ user: AuthUser; accessToken: string; refreshToken: string }>(
        '/auth/login', form
      );
      if (res.user.role !== 'admin') { setError('Admin access only'); return; }
      localStorage.setItem('user', JSON.stringify(res.user));
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      onAuth();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold text-rose-400 mb-6">HS Admin</h1>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Admin Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
          <input type="password" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
          <button type="submit" className="w-full py-2 rounded bg-rose-700 hover:bg-rose-600 text-white font-medium text-sm">Sign In</button>
        </form>
      </div>
    </main>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [page, setPage] = useState('Overview');

  useEffect(() => { setUser(getUser()); }, []);

  function handleLogout() {
    const token = localStorage.getItem('refreshToken');
    if (token) api.post('/auth/logout', { refreshToken: token }).catch(() => {});
    clearAuth(); setUser(null);
  }

  if (!user || user.role !== 'admin') {
    return <LoginForm onAuth={() => setUser(getUser())} />;
  }

  const PageComponent = PAGES[page] ?? OverviewPage;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AdminNav user={user} page={page} onNavigate={setPage} onLogout={handleLogout} />
      <PageComponent user={user} onNavigate={setPage} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { getUser, clearAuth, type AuthUser } from './lib/auth';
import { api } from './lib/api';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import VitalsPage from './pages/VitalsPage';
import WorkoutsPage from './pages/WorkoutsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import FeedPage from './pages/FeedPage';
import MealsPage from './pages/MealsPage';
import TelemedicinePage from './pages/TelemedicinePage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import RankingPage from './pages/RankingPage';
import GamificationPage from './pages/GamificationPage';
import AiPage from './pages/AiPage';
import Navbar from './components/Navbar';

const PAGES: Record<string, React.FC<any>> = {
  Dashboard: DashboardPage,
  Vitals: VitalsPage,
  Workouts: WorkoutsPage,
  Activities: ActivitiesPage,
  Feed: FeedPage,
  Meals: MealsPage,
  Telemedicine: TelemedicinePage,
  Notifications: NotificationsPage,
  Profile: ProfilePage,
  Ranking: RankingPage,
  Gamification: GamificationPage,
  'AI Engine': AiPage,
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [page, setPage] = useState('Dashboard');

  useEffect(() => { setUser(getUser()); }, []);

  function handleAuth() { setUser(getUser()); setPage('Dashboard'); }

  function handleLogout() {
    const token = localStorage.getItem('refreshToken');
    if (token) api.post('/auth/logout', { refreshToken: token }).catch(() => {});
    clearAuth();
    setUser(null);
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  const PageComponent = PAGES[page] ?? DashboardPage;

  return (
    <div className="min-h-screen bg-[#0b0b12] text-slate-100">
      <Navbar user={user} page={page} onNavigate={setPage} onLogout={handleLogout} />
      <PageComponent user={user} onNavigate={setPage} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

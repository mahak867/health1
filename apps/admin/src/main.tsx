import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const cards = ['Manage users', 'Manage providers', 'System analytics', 'Security audit'];

function App() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-6 text-3xl font-bold">HealthSphere Admin</h1>
      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">{card}</h2>
            <p className="mt-2 text-sm text-slate-400">Admin capability scaffold.</p>
          </article>
        ))}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

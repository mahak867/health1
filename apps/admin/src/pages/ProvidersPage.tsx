import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Provider { id: string; email: string; full_name: string; role: string; }

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ users: Provider[] }>('/admin/users?role=doctor,trainer,nutritionist').then((r) => setProviders(r.users)).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Provider Management</h1>
      {error && <p className="text-yellow-400 text-sm">{error} (admin endpoints require backend wiring)</p>}
      <Card title="Doctors, Trainers & Nutritionists">
        {providers.length === 0 ? <p className="text-sm text-slate-500">No providers found.</p> : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-4 text-sm bg-slate-800 rounded p-2">
                <span>{p.full_name}</span>
                <span className="text-slate-400">{p.email}</span>
                <span className="ml-auto bg-teal-800 px-2 py-0.5 rounded text-xs">{p.role}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

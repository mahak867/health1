import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface User { id: string; email: string; full_name: string; role: string; created_at: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ users: User[] }>('/admin/users').then((r) => setUsers(r.users)).catch((err) => setError(err.message));
  }, []);

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>
      {error && <p className="text-yellow-400 text-sm">{error} (admin endpoints require backend wiring)</p>}
      <Card title="Users">
        <input className="w-full mb-4 rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
          placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {filtered.length === 0 ? <p className="text-sm text-slate-500">No users found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th><th className="pb-2">Joined</th>
              </tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 pr-4">{u.full_name}</td>
                    <td className="py-2 pr-4 text-slate-400">{u.email}</td>
                    <td className="py-2 pr-4"><span className="bg-slate-700 px-2 py-0.5 rounded text-xs">{u.role}</span></td>
                    <td className="py-2 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

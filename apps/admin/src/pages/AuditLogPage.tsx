import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface AuditEntry { id: string; actor_id: string | null; action: string; resource_type: string; created_at: string; metadata: any; }

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ logs: AuditEntry[] }>('/admin/audit').then((r) => setEntries(r.logs)).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      {error && <p className="text-yellow-400 text-sm">{error} (admin endpoints require backend wiring)</p>}
      <Card title="Recent Audit Events">
        {entries.length === 0 ? <p className="text-sm text-slate-500">No audit entries.</p> : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {entries.map((e) => (
              <div key={e.id} className="text-xs bg-slate-800 rounded p-2 space-y-0.5">
                <p className="font-medium text-slate-200">{e.action}</p>
                <p className="text-slate-400">{e.resource_type} · {new Date(e.created_at).toLocaleString()}</p>
                {e.metadata && <p className="text-slate-500">Status: {e.metadata.statusCode} · {e.metadata.durationMs}ms</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

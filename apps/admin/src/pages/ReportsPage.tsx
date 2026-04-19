import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';

interface Report { id: string; user_id: string; report_type: string; format: string; status: string; requested_at: string; file_url: string | null; }

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ reports: Report[] }>('/exports/reports').then((r) => setReports(r.reports)).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Export Reports</h1>
      {error && <p className="text-yellow-400 text-sm">{error}</p>}
      <Card title="All Report Requests">
        {reports.length === 0 ? <p className="text-sm text-slate-500">No reports.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Format</th>
                <th className="pb-2 pr-4">Status</th><th className="pb-2">Requested</th>
              </tr></thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/50">
                    <td className="py-2 pr-4">{r.report_type}</td>
                    <td className="py-2 pr-4 text-slate-400 uppercase text-xs">{r.format}</td>
                    <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-2 text-slate-400 text-xs">{new Date(r.requested_at).toLocaleString()}</td>
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

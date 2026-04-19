import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';

interface Appointment { id: string; provider_user_id: string; starts_at: string; ends_at: string; status: string; meeting_url: string|null; }

const emptyA = { providerUserId: '', startsAt: '', endsAt: '', status: 'scheduled', meetingUrl: '' };

export default function TelemedicinePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState(emptyA);
  const [error, setError] = useState('');

  function load() {
    api.get<{ appointments: Appointment[] }>('/telemedicine/appointments').then((r) => setAppointments(r.appointments));
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const body: any = {
        providerUserId: form.providerUserId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        status: form.status
      };
      if (form.meetingUrl) body.meetingUrl = form.meetingUrl;
      await api.post('/telemedicine/appointments', body);
      setForm(emptyA); load();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Telemedicine</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Book Appointment">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Provider User ID (UUID)" value={form.providerUserId} onChange={(e) => setForm({...form, providerUserId: e.target.value})} required />
            <div>
              <label className="text-xs text-slate-400">Start Time</label>
              <input type="datetime-local" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" value={form.startsAt} onChange={(e) => setForm({...form, startsAt: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-slate-400">End Time</label>
              <input type="datetime-local" className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" value={form.endsAt} onChange={(e) => setForm({...form, endsAt: e.target.value})} required />
            </div>
            <input className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm" placeholder="Meeting URL (optional)" value={form.meetingUrl} onChange={(e) => setForm({...form, meetingUrl: e.target.value})} />
            <button type="submit" className="w-full py-2 rounded bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium">Book</button>
          </form>
        </Card>
        <Card title="Appointments">
          {appointments.length === 0 ? <p className="text-sm text-slate-500">No appointments.</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {appointments.map((a) => (
                <div key={a.id} className="text-sm bg-slate-800 rounded p-3 space-y-1">
                  <div className="flex items-center gap-2"><StatusBadge status={a.status} /><span className="text-xs text-slate-400">{new Date(a.starts_at).toLocaleString()}</span></div>
                  {a.meeting_url && <a href={a.meeting_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">Join Meeting →</a>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

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
        endsAt:   new Date(form.endsAt).toISOString(),
        status: form.status
      };
      if (form.meetingUrl) body.meetingUrl = form.meetingUrl;
      await api.post('/telemedicine/appointments', body);
      setForm(emptyA); load();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Telemedicine 🩺</h1>
        <p className="text-slate-500 text-sm mt-1">Book and manage virtual appointments</p>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Book form */}
        <Card title="Book Appointment" accent="teal">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
              placeholder="Provider User ID (UUID)" value={form.providerUserId}
              onChange={(e) => setForm({...form, providerUserId: e.target.value})} required />
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Start Time</label>
              <input type="datetime-local"
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                value={form.startsAt} onChange={(e) => setForm({...form, startsAt: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">End Time</label>
              <input type="datetime-local"
                className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                value={form.endsAt} onChange={(e) => setForm({...form, endsAt: e.target.value})} required />
            </div>
            <input
              className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
              placeholder="Meeting URL (optional)" value={form.meetingUrl}
              onChange={(e) => setForm({...form, meetingUrl: e.target.value})} />
            <button type="submit"
              className="w-full py-2.5 rounded-xl gradient-teal glow-green text-white text-sm font-bold hover:scale-[1.02] transition-transform">
              🗓 Book Appointment
            </button>
          </form>
        </Card>

        {/* Appointment list */}
        <Card title="Appointments" accent="teal">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-4xl mb-3">📅</span>
              <p className="text-sm text-slate-600">No appointments yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {appointments.map((a) => (
                <div key={a.id} className="glass rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={a.status} />
                    <span className="text-xs text-slate-500">{new Date(a.starts_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Duration:</span>
                    <span className="text-xs text-white font-medium">
                      {Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000)} min
                    </span>
                  </div>
                  {a.meeting_url && (
                    <a href={a.meeting_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold">
                      🎥 Join Meeting →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

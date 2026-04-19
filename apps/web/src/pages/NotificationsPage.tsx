import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Prefs { email_enabled: boolean; push_enabled: boolean; sms_enabled: boolean; }
interface Notification { id: string; category: string; channel: string; payload: any; scheduled_at: string|null; delivered_at: string|null; }

function Toggle({ label, icon, description, checked, onChange }: { label: string; icon: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 glass rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}
        onClick={() => onChange(!checked)}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </label>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [form, setForm] = useState<Prefs>({ email_enabled: true, push_enabled: true, sms_enabled: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ preferences: Prefs }>('/notifications/preferences').then((r) => {
      if (r.preferences) setForm(r.preferences);
    });
    api.get<{ notifications: Notification[] }>('/notifications/').then((r) => setNotifications(r.notifications));
  }, []);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    await api.put('/notifications/preferences', { emailEnabled: form.email_enabled, pushEnabled: form.push_enabled, smsEnabled: form.sms_enabled });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const CHANNEL_COLORS: Record<string, string> = {
    email: 'bg-blue-500/15 text-blue-300',
    push:  'bg-violet-500/15 text-violet-300',
    sms:   'bg-emerald-500/15 text-emerald-300',
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Notifications 🔔</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your alert preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Preferences */}
        <Card title="Alert Channels" accent="green">
          <form onSubmit={savePrefs} className="space-y-3">
            <Toggle label="Email" icon="📧" description="Receive alerts via email" checked={form.email_enabled} onChange={(v) => setForm({...form, email_enabled: v})} />
            <Toggle label="Push" icon="📱" description="In-app push notifications" checked={form.push_enabled} onChange={(v) => setForm({...form, push_enabled: v})} />
            <Toggle label="SMS" icon="💬" description="Text message alerts" checked={form.sms_enabled} onChange={(v) => setForm({...form, sms_enabled: v})} />
            <button type="submit"
              className="w-full py-2.5 rounded-xl gradient-green glow-green text-white text-sm font-bold hover:scale-[1.02] transition-transform mt-2">
              {saved ? '✓ Preferences Saved' : 'Save Preferences'}
            </button>
          </form>
        </Card>

        {/* Notification history */}
        <Card title="Recent Alerts" accent="green">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-4xl mb-3">🔕</span>
              <p className="text-sm text-slate-600">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div key={n.id} className="glass rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-white capitalize">{n.category}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${CHANNEL_COLORS[n.channel] ?? 'bg-slate-500/20 text-slate-300'}`}>
                      {n.channel}
                    </span>
                  </div>
                  {n.scheduled_at && (
                    <p className="text-[10px] text-slate-500 mt-1">Scheduled: {new Date(n.scheduled_at).toLocaleString()}</p>
                  )}
                  {n.delivered_at && (
                    <p className="text-[10px] text-emerald-500 mt-0.5">✓ Delivered {new Date(n.delivered_at).toLocaleString()}</p>
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

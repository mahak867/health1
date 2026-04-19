import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

interface Prefs { email_enabled: boolean; push_enabled: boolean; sms_enabled: boolean; }
interface Notification { id: string; category: string; channel: string; payload: any; scheduled_at: string|null; delivered_at: string|null; }

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [form, setForm] = useState<Prefs>({ email_enabled: true, push_enabled: true, sms_enabled: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ preferences: Prefs }>('/notifications/preferences').then((r) => {
      if (r.preferences) { setPrefs(r.preferences); setForm(r.preferences); }
    });
    api.get<{ notifications: Notification[] }>('/notifications/').then((r) => setNotifications(r.notifications));
  }, []);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    await api.put('/notifications/preferences', { emailEnabled: form.email_enabled, pushEnabled: form.push_enabled, smsEnabled: form.sms_enabled });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Preferences">
          <form onSubmit={savePrefs} className="space-y-3">
            {([['Email Notifications', 'email_enabled'], ['Push Notifications', 'push_enabled'], ['SMS Notifications', 'sms_enabled']] as const).map(([label, key]) => (
              <label key={key} className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 rounded" checked={(form as any)[key]} onChange={(e) => setForm({...form, [key]: e.target.checked})} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
            <button type="submit" className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
              {saved ? '✓ Saved' : 'Save Preferences'}
            </button>
          </form>
        </Card>
        <Card title="Recent Notifications">
          {notifications.length === 0 ? <p className="text-sm text-slate-500">No notifications.</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="text-xs bg-slate-800 rounded p-2">
                  <p className="font-medium">{n.category} <span className="text-slate-400">({n.channel})</span></p>
                  {n.scheduled_at && <p className="text-slate-400">Scheduled: {new Date(n.scheduled_at).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

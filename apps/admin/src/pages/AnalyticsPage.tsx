import React from 'react';
import Card from '../components/Card';

const sections = [
  { title: 'Vitals Trends', desc: 'Average heart rate, BP, and SpO2 over time across the platform.' },
  { title: 'Workout Volume', desc: 'Aggregate workout frequency and muscle group distribution.' },
  { title: 'Nutrition Compliance', desc: 'Daily calorie and macro target adherence rates.' },
  { title: 'Appointment Utilization', desc: 'Appointments scheduled, completed, and cancelled by provider.' }
];

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="text-sm text-slate-400">Platform-wide insights and health metrics visualization (data visualization integration ready).</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title} title={s.title}>
            <p className="text-sm text-slate-400">{s.desc}</p>
            <div className="mt-4 h-24 rounded bg-slate-800 flex items-center justify-center text-slate-600 text-sm">
              Chart placeholder
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

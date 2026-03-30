'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Save, CheckCircle, BarChart2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

const CLAPS_FIELDS = [
  { key: 'connections',   label: 'Conversations',  letter: 'C', barColor: 'bg-blue-400',   letterColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',   tip: 'Coaching conversations initiated' },
  { key: 'leads',         label: 'Learnings',       letter: 'L', barColor: 'bg-purple-400', letterColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', tip: 'Insights captured this week' },
  { key: 'appointments',  label: 'Actions',         letter: 'A', barColor: 'bg-indigo-400', letterColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', tip: 'Commitments made & kept' },
  { key: 'presentations', label: 'Progress',        letter: 'P', barColor: 'bg-orange-400', letterColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', tip: 'Milestones hit this week' },
  { key: 'sales',         label: 'Shifts',          letter: 'S', barColor: 'bg-green-500',  letterColor: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',  tip: 'Mindset shifts experienced' },
] as const;

type ClapsKey = 'connections' | 'leads' | 'appointments' | 'presentations' | 'sales';

interface ClapsRow {
  id?: number;
  week_start: string;
  connections: number;
  leads: number;
  appointments: number;
  presentations: number;
  sales: number;
  revenue: number;
  notes: string;
}

function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function UserClapsPage() {
  const [current, setCurrent] = useState<ClapsRow>({
    week_start: getCurrentMonday(),
    connections: 0, leads: 0, appointments: 0,
    presentations: 0, sales: 0, revenue: 0, notes: '',
  });
  const [history, setHistory] = useState<ClapsRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [curR, histR] = await Promise.all([
        fetch(`${API}/api/claps/current`, { headers: authHeaders() }),
        fetch(`${API}/api/claps`, { headers: authHeaders() }),
      ]);
      if (curR.ok) {
        const data = await curR.json();
        setCurrent({
          week_start: data.week_start || getCurrentMonday(),
          connections: Number(data.connections) || 0,
          leads: Number(data.leads) || 0,
          appointments: Number(data.appointments) || 0,
          presentations: Number(data.presentations) || 0,
          sales: Number(data.sales) || 0,
          revenue: Number(data.revenue) || 0,
          notes: data.notes || '',
        });
      }
      if (histR.ok) setHistory(await histR.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/claps`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(current),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        fetchData();
      }
    } catch {}
    setSaving(false);
  };

  const update = (key: ClapsKey | 'revenue' | 'notes', value: number | string) =>
    setCurrent(prev => ({ ...prev, [key]: value }));

  const maxVal = Math.max(1, ...history.slice(0, 8).flatMap(r =>
    CLAPS_FIELDS.map(f => Number(r[f.key as ClapsKey]) || 0)
  ));

  const weekTotal = CLAPS_FIELDS.reduce((sum, f) => sum + (Number(current[f.key as ClapsKey]) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-indigo-500" />
          My Weekly Wins
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Conversations · Learnings · Actions · Progress · Shifts — track your momentum weekly
        </p>
      </div>

      {/* Current Week */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">This week</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Week of {formatWeek(current.week_start)}</p>
          </div>
          {weekTotal > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{weekTotal}</div>
              <div className="text-xs text-gray-400">total actions</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          {CLAPS_FIELDS.map(f => (
            <div key={f.key}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${f.letterColor}`}>{f.letter}</span>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">{f.label}</label>
                </div>
              </div>
              <input
                type="number" min={0}
                value={current[f.key as ClapsKey]}
                onChange={e => update(f.key as ClapsKey, parseInt(e.target.value) || 0)}
                title={f.tip}
                className="w-full px-3 py-2 text-lg font-bold text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-tight">{f.tip}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Revenue generated this week ($)</label>
            <input
              type="number" min={0} step={0.01} value={current.revenue}
              onChange={e => update('revenue', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes — what moved this week?</label>
            <input
              type="text" value={current.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="One thing that shifted..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save this week'}
        </button>
      </div>

      {/* Trend Chart */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
            8-Week Trend
          </h2>
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            {CLAPS_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className={`w-3 h-3 rounded ${f.barColor}`} />
                {f.label}
              </div>
            ))}
          </div>
          <div className="flex items-end gap-3 h-40 overflow-x-auto pb-2">
            {history.slice(0, 8).reverse().map(row => (
              <div key={row.week_start} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 56 }}>
                <div className="flex items-end gap-0.5 h-32 w-full">
                  {CLAPS_FIELDS.map(f => {
                    const val = Number(row[f.key as ClapsKey]) || 0;
                    const pct = (val / maxVal) * 100;
                    return (
                      <div key={f.key} className="relative group flex-1">
                        <div
                          className={`w-full rounded-t ${f.barColor}`}
                          style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                          {f.label}: {val}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-400 text-center">{formatWeek(row.week_start)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Week</th>
                  {CLAPS_FIELDS.map(f => (
                    <th key={f.key} className="text-center px-3 py-3 font-medium text-gray-500 dark:text-gray-400" title={f.tip}>{f.letter}</th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {history.map((row, i) => (
                  <tr key={row.week_start} className={`hover:bg-gray-50 dark:hover:bg-gray-700/20 ${i === 0 ? 'font-medium' : ''}`}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                      {formatWeek(row.week_start)}
                      {i === 0 && <span className="ml-2 text-xs text-indigo-500 font-normal">current</span>}
                    </td>
                    {CLAPS_FIELDS.map(f => (
                      <td key={f.key} className="px-3 py-3 text-center text-gray-700 dark:text-gray-300">
                        {Number(row[f.key as ClapsKey]) || 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {row.revenue ? `$${Number(row.revenue).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {row.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
          <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Save your first week to start tracking your momentum</p>
        </div>
      )}
    </div>
  );
}

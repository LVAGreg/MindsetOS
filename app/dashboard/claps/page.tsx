'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Save, CheckCircle, BarChart2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

const CLAPS_FIELDS = [
  { key: 'connections',   label: 'Conversations',  letter: 'C', barHex: '#4f6ef7', letterBg: 'rgba(79,110,247,0.12)',  letterColor: '#4f6ef7', tip: 'Coaching conversations initiated' },
  { key: 'leads',         label: 'Learnings',       letter: 'L', barHex: '#7c5bf6', letterBg: 'rgba(124,91,246,0.12)', letterColor: '#7c5bf6', tip: 'Insights captured this week' },
  { key: 'appointments',  label: 'Actions',         letter: 'A', barHex: '#fcc824', letterBg: 'rgba(252,200,36,0.12)', letterColor: '#fcc824', tip: 'Commitments made & kept' },
  { key: 'presentations', label: 'Progress',        letter: 'P', barHex: '#9090a8', letterBg: 'rgba(144,144,168,0.12)', letterColor: '#9090a8', tip: 'Milestones hit this week' },
  { key: 'sales',         label: 'Shifts',          letter: 'S', barHex: '#ededf5', letterBg: 'rgba(237,237,245,0.08)',  letterColor: '#ededf5', tip: 'Mindset shifts experienced' },
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

const CARD = { background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 };
const INPUT_CLS = 'w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] transition-colors';
const INPUT_STYLE = { background: 'rgba(9,9,15,0.6)', border: '1px solid #1e1e30', color: '#ededf5' };

export default function UserClapsPage() {
  const router = useRouter();

  const [current, setCurrent] = useState<ClapsRow>({
    week_start: getCurrentMonday(),
    connections: 0, leads: 0, appointments: 0,
    presentations: 0, sales: 0, revenue: 0, notes: '',
  });
  const [history, setHistory] = useState<ClapsRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      setError('Failed to load data. Please refresh.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Guard: if no token in storage, redirect immediately
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    fetchData();
  }, [fetchData, router]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`${API}/api/claps`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(current),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        fetchData();
      } else {
        setSaveError('Failed to save. Try again.');
      }
    } catch {
      setSaveError('Network error. Try again.');
    }
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent" style={{ borderBottomColor: '#4f6ef7' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-xs px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          {error}
        </p>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
          <TrendingUp className="w-7 h-7" style={{ color: '#4f6ef7' }} />
          My Weekly Wins
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
          Conversations · Learnings · Actions · Progress · Shifts — track your momentum weekly
        </p>
      </div>

      {/* Current Week */}
      <div className="p-6 rounded-2xl" style={CARD}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#ededf5' }}>This week</h2>
            <p className="text-sm" style={{ color: '#9090a8' }}>Week of {formatWeek(current.week_start)}</p>
          </div>
          {weekTotal > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#fcc824' }}>{weekTotal}</div>
              <div className="text-xs" style={{ color: '#9090a8' }}>total actions</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          {CLAPS_FIELDS.map(f => (
            <div key={f.key}>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ background: f.letterBg, color: f.letterColor }}
                >
                  {f.letter}
                </span>
                <label className="text-xs font-medium" style={{ color: '#9090a8' }}>{f.label}</label>
              </div>
              <input
                type="number" min={0}
                value={current[f.key as ClapsKey]}
                onChange={e => update(f.key as ClapsKey, parseInt(e.target.value) || 0)}
                title={f.tip}
                className={`${INPUT_CLS} text-lg font-bold text-center`}
                style={INPUT_STYLE}
              />
              <p className="text-xs mt-1 leading-tight" style={{ color: '#5a5a72' }}>{f.tip}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Revenue generated this week ($)</label>
            <input
              type="number" min={0} step={0.01} value={current.revenue}
              onChange={e => update('revenue', parseFloat(e.target.value) || 0)}
              className={INPUT_CLS}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Notes — what moved this week?</label>
            <input
              type="text" value={current.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="One thing that shifted..."
              className={INPUT_CLS}
              style={{ ...INPUT_STYLE, opacity: 1 }}
            />
          </div>
        </div>

        <div>
          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-black text-sm font-semibold rounded-lg disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: '#fcc824' }}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save this week'}
          </button>
          {saveError && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{saveError}</p>
          )}
        </div>
      </div>

      {/* Trend Chart */}
      {history.length > 0 && (
        <div className="p-6 rounded-2xl" style={CARD}>
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: '#ededf5' }}>
            <BarChart2 className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            8-Week Trend
          </h2>
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            {CLAPS_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-1.5 text-xs" style={{ color: '#9090a8' }}>
                <div className="w-3 h-3 rounded" style={{ background: f.barHex }} />
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
                          className="w-full rounded-t"
                          style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%`, background: f.barHex }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10" style={{ background: '#1e1e30', color: '#ededf5' }}>
                          {f.label}: {val}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-center" style={{ color: '#5a5a72' }}>{formatWeek(row.week_start)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 ? (
        <div className="rounded-2xl overflow-hidden" style={CARD}>
          <div className="p-5" style={{ borderBottom: '1px solid #1e1e30' }}>
            <h2 className="text-lg font-bold" style={{ color: '#ededf5' }}>History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(9,9,15,0.4)', borderBottom: '1px solid #1e1e30' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Week</th>
                  {CLAPS_FIELDS.map(f => (
                    <th key={f.key} className="text-center px-3 py-3 font-medium" style={{ color: '#9090a8' }} title={f.tip}>{f.letter}</th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Revenue</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr
                    key={row.week_start}
                    className={`transition-colors hover:bg-[rgba(255,255,255,0.02)] ${i === 0 ? 'font-medium' : ''}`}
                    style={{ borderBottom: '1px solid rgba(30,30,48,0.6)' }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#ededf5' }}>
                      {formatWeek(row.week_start)}
                      {i === 0 && <span className="ml-2 text-xs font-normal" style={{ color: '#4f6ef7' }}>current</span>}
                    </td>
                    {CLAPS_FIELDS.map(f => (
                      <td key={f.key} className="px-3 py-3 text-center" style={{ color: '#9090a8' }}>
                        {Number(row[f.key as ClapsKey]) || 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right" style={{ color: '#9090a8' }}>
                      {row.revenue ? `$${Number(row.revenue).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#5a5a72' }}>
                      {row.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 rounded-2xl" style={{ ...CARD, color: '#9090a8' }}>
          <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Save your first week to start tracking your momentum</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Save, CheckCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

const CLAPS_FIELDS = [
  { key: 'connections',   label: 'Connections',   letter: 'C', barColor: '#60a5fa', letterBg: 'rgba(96,165,250,0.15)',  letterColor: '#93c5fd' },
  { key: 'leads',         label: 'Leads',         letter: 'L', barColor: '#a78bfa', letterBg: 'rgba(167,139,250,0.15)', letterColor: '#c4b5fd' },
  { key: 'appointments',  label: 'Appointments',  letter: 'A', barColor: '#818cf8', letterBg: 'rgba(129,140,248,0.15)', letterColor: '#a5b4fc' },
  { key: 'presentations', label: 'Presentations', letter: 'P', barColor: '#fbbf24', letterBg: 'rgba(251,191,36,0.15)',  letterColor: '#fde68a' },
  { key: 'sales',         label: 'Sales',         letter: 'S', barColor: '#4ade80', letterBg: 'rgba(74,222,128,0.15)', letterColor: '#86efac' },
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

export default function ClapsPage() {
  const [current, setCurrent] = useState<ClapsRow>({
    week_start: getCurrentMonday(),
    connections: 0, leads: 0, appointments: 0,
    presentations: 0, sales: 0, revenue: 0, notes: '',
  });
  const [history, setHistory] = useState<ClapsRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [curR, histR] = await Promise.all([
        fetch(`${API}/api/admin/claps/current`, { headers: authHeaders() }),
        fetch(`${API}/api/admin/claps`, { headers: authHeaders() }),
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
      } else {
        setFetchError(`Failed to load current week (${curR.status})`);
      }
      if (histR.ok) setHistory(await histR.json());
      else setFetchError(`Failed to load history (${histR.status})`);
    } catch (err) {
      console.error('Failed to fetch CLAPS data:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load CLAPS data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`${API}/api/admin/claps`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(current),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        fetchData();
      } else {
        setSaveError(`Save failed (${r.status})`);
      }
    } catch (err) {
      console.error('Failed to save CLAPS data:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
    setSaving(false);
  };

  const update = (key: ClapsKey | 'revenue' | 'notes', value: number | string) =>
    setCurrent(prev => ({ ...prev, [key]: value }));

  const maxVal = Math.max(1, ...history.slice(0, 8).flatMap(r =>
    CLAPS_FIELDS.map(f => Number(r[f.key as ClapsKey]) || 0)
  ));

  const convRate = current.leads > 0 ? Math.round((current.sales / current.leads) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#4f6ef7' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
          <TrendingUp className="w-7 h-7" style={{ color: '#818cf8' }} />
          CLAPS Tracker
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
          Connections · Leads · Appointments · Presentations · Sales
        </p>
      </div>

      {/* Error banners */}
      {fetchError && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          {fetchError}
        </div>
      )}
      {saveError && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          {saveError}
        </div>
      )}

      {/* Current Week */}
      <div className="p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#ededf5' }}>This week</h2>
            <p className="text-sm" style={{ color: '#9090a8' }}>Week of {formatWeek(current.week_start)}</p>
          </div>
          {convRate > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#4ade80' }}>{convRate}%</div>
              <div className="text-xs" style={{ color: '#9090a8' }}>lead → sale</div>
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
                >{f.letter}</span>
                <label className="text-xs font-medium" style={{ color: '#9090a8' }}>{f.label}</label>
              </div>
              <input
                type="number" min={0}
                value={current[f.key as ClapsKey]}
                onChange={e => update(f.key as ClapsKey, parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-lg font-bold text-center bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Revenue this week ($)</label>
            <input
              type="number" min={0} step={0.01} value={current.revenue}
              onChange={e => update('revenue', parseFloat(e.target.value) || 0)}
              className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Notes</label>
            <input
              type="text" value={current.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="What moved this week?"
              className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
            />
          </div>
        </div>

        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-opacity hover:opacity-80"
          style={{ background: '#fcc824', color: '#09090f' }}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save this week'}
        </button>
      </div>

      {/* Trend Chart */}
      {history.length > 0 && (
        <div className="p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: '#ededf5' }}>8-Week Trend</h2>
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            {CLAPS_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-1.5 text-xs" style={{ color: '#9090a8' }}>
                <div className="w-3 h-3 rounded" style={{ background: f.barColor }} />
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
                          style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%`, background: f.barColor }}
                        />
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10"
                          style={{ background: '#1e1e30', color: '#ededf5', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {f.label}: {val}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-center" style={{ color: '#9090a8' }}>{formatWeek(row.week_start)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 ? (
        <div className="overflow-hidden" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <div className="p-5" style={{ borderBottom: '1px solid #1e1e30' }}>
            <h2 className="text-lg font-bold" style={{ color: '#ededf5' }}>History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(9,9,15,0.6)', borderBottom: '1px solid #1e1e30' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Week</th>
                  {CLAPS_FIELDS.map(f => (
                    <th key={f.key} className="text-center px-3 py-3 font-medium" style={{ color: f.letterColor }}>{f.letter}</th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Revenue</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr
                    key={row.week_start}
                    className={i === 0 ? 'font-medium' : ''}
                    style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(30,30,48,0.4)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#ededf5' }}>
                      {formatWeek(row.week_start)}
                      {i === 0 && <span className="ml-2 text-xs font-normal" style={{ color: '#818cf8' }}>current</span>}
                    </td>
                    {CLAPS_FIELDS.map(f => (
                      <td key={f.key} className="px-3 py-3 text-center" style={{ color: '#ededf5' }}>
                        {Number(row[f.key as ClapsKey]) || 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right" style={{ color: '#ededf5' }}>
                      {row.revenue ? `$${Number(row.revenue).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#9090a8' }}>
                      {row.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center h-32"
          style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16, color: '#9090a8' }}
        >
          <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Save your first week to start tracking</p>
        </div>
      )}
    </div>
  );
}

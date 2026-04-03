'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

type CohortStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
type CohortType = 'architecture_997' | 'intensive_1997';

interface Cohort {
  id: number;
  name: string;
  cohort_type: CohortType;
  status: CohortStatus;
  start_date: string;
  end_date: string;
  max_participants: number;
  current_participants: number;
  price_cents: number;
  created_at: string;
}

interface NewCohortForm {
  name: string;
  cohort_type: CohortType;
  start_date: string;
  end_date: string;
  max_participants: number;
  price_cents: number;
}

const COHORT_TYPE_LABELS: Record<CohortType, string> = {
  architecture_997: '$997 Architecture',
  intensive_1997: '$1,997 Intensive',
};

const COHORT_TYPE_STYLES: Record<CohortType, React.CSSProperties> = {
  architecture_997: { background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.3)', color: '#4f6ef7', borderRadius: 9999 },
  intensive_1997: { background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c', borderRadius: 9999 },
};

const STATUS_CONFIG: Record<CohortStatus, { label: string; style: React.CSSProperties; icon: React.ReactNode }> = {
  upcoming: {
    label: 'Upcoming',
    style: { background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.3)', color: '#4f6ef7', borderRadius: 9999 },
    icon: <Clock className="w-3 h-3" />,
  },
  active: {
    label: 'Active',
    style: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: 9999 },
    icon: <CheckCircle className="w-3 h-3" />,
  },
  completed: {
    label: 'Completed',
    style: { background: 'rgba(144,144,168,0.12)', border: '1px solid rgba(144,144,168,0.25)', color: '#9090a8', borderRadius: 9999 },
    icon: <CheckCircle className="w-3 h-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    style: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: 9999 },
    icon: <XCircle className="w-3 h-3" />,
  },
};

const DEFAULT_FORM: NewCohortForm = {
  name: '',
  cohort_type: 'architecture_997',
  start_date: '',
  end_date: '',
  max_participants: 10,
  price_cents: 99700,
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRevenue(priceCents: number, participants: number): string {
  return ((priceCents / 100) * participants).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<NewCohortForm>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [patchingId, setPatchingId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  useEffect(() => {
    fetchCohorts();
  }, []);

  const fetchCohorts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/cohorts`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCohorts(data.cohorts || data || []);
    } catch (err) {
      console.error('Failed to fetch cohorts:', err);
      showStatus('error', 'Failed to load cohorts.');
    } finally {
      setLoading(false);
    }
  };

  const createCohort = async () => {
    if (!form.name.trim()) {
      showStatus('error', 'Cohort name is required.');
      return;
    }
    if (!form.start_date || !form.end_date) {
      showStatus('error', 'Start and end dates are required.');
      return;
    }
    try {
      setCreating(true);
      const res = await fetch(`${API}/api/admin/cohorts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const created: Cohort = data.cohort || data;
      setCohorts([created, ...cohorts]);
      setShowCreateForm(false);
      setForm(DEFAULT_FORM);
      showStatus('success', `Cohort "${created.name}" created successfully.`);
    } catch (err: any) {
      console.error('Failed to create cohort:', err);
      showStatus('error', err.message || 'Failed to create cohort.');
    } finally {
      setCreating(false);
    }
  };

  const patchStatus = async (cohort: Cohort, newStatus: CohortStatus) => {
    try {
      setPatchingId(cohort.id);
      const res = await fetch(`${API}/api/admin/cohorts/${cohort.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setCohorts(cohorts.map(c => c.id === cohort.id ? { ...c, status: newStatus } : c));
      showStatus('success', `"${cohort.name}" marked as ${newStatus}.`);
    } catch (err: any) {
      console.error('Failed to update cohort status:', err);
      showStatus('error', err.message || 'Failed to update status.');
    } finally {
      setPatchingId(null);
    }
  };

  // Summary stats
  const totalCohorts = cohorts.length;
  const activeCohorts = cohorts.filter(c => c.status === 'active').length;
  const totalEnrolled = cohorts.reduce((sum, c) => sum + (c.current_participants || 0), 0);
  const totalRevenue = cohorts.reduce(
    (sum, c) => sum + (c.price_cents / 100) * (c.current_participants || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Cohorts</h1>
          <p className="mt-1" style={{ color: '#9090a8' }}>
            Manage 90-Day Mindset Architecture cohort enrollments
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchCohorts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Cohort
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
          style={statusMsg.type === 'success'
            ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }
            : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {statusMsg.text}
          </div>
          <button onClick={() => setStatusMsg(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(79,110,247,0.12)' }}>
              <Calendar className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Cohorts</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{totalCohorts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Active Cohorts</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{activeCohorts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(79,110,247,0.12)' }}>
              <Users className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Enrolled</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{totalEnrolled}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Revenue</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>
                {totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Cohort Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 max-w-lg w-full shadow-2xl" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>New Cohort</h2>
              <button
                onClick={() => { setShowCreateForm(false); setForm(DEFAULT_FORM); }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Cohort Name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Spring 2026 Architecture"
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Cohort Type
                </label>
                <select
                  value={form.cohort_type}
                  onChange={e => {
                    const t = e.target.value as CohortType;
                    setForm({
                      ...form,
                      cohort_type: t,
                      price_cents: t === 'intensive_1997' ? 199700 : 99700,
                    });
                  }}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                >
                  <option value="architecture_997">$997 Architecture (90-Day Group Cohort)</option>
                  <option value="intensive_1997">$1,997 Intensive (1:1 Add-on)</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Start Date <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    End Date <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  />
                </div>
              </div>

              {/* Max Participants & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_participants}
                    onChange={e => setForm({ ...form, max_participants: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Price in cents (e.g. 99700 = $997)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.price_cents}
                    onChange={e => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  />
                  <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                    = {(form.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreateForm(false); setForm(DEFAULT_FORM); }}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
              >
                Cancel
              </button>
              <button
                onClick={createCohort}
                disabled={creating}
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Cohort
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cohorts List */}
      <div className="rounded-xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
        <div className="p-4" style={{ borderBottom: '1px solid #1e1e30' }}>
          <h2 className="font-semibold" style={{ color: '#ededf5' }}>All Cohorts</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f6ef7]"></div>
            <p className="text-sm" style={{ color: '#9090a8' }}>Loading cohorts...</p>
          </div>
        ) : cohorts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Calendar className="w-12 h-12 mb-3 opacity-30" style={{ color: '#fcc824' }} />
            <p className="font-semibold" style={{ color: '#ededf5' }}>No cohorts scheduled yet</p>
            <p className="text-sm mt-1 max-w-xs" style={{ color: '#9090a8' }}>
              Create the first cohort and start enrolling your Architecture students.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-sm font-medium hover:underline"
              style={{ color: '#fcc824' }}
            >
              Create a cohort →
            </button>
          </div>
        ) : (
          <div>
            {cohorts.map((cohort, idx) => {
              const statusCfg = STATUS_CONFIG[cohort.status] || STATUS_CONFIG.upcoming;
              const fillPct = cohort.max_participants > 0
                ? Math.min(100, Math.round((cohort.current_participants / cohort.max_participants) * 100))
                : 0;
              const isPatching = patchingId === cohort.id;

              return (
                <div
                  key={cohort.id}
                  className="p-4 sm:p-5 transition-colors"
                  style={{
                    ...(idx < cohorts.length - 1 ? { borderBottom: '1px solid #1e1e30' } : {}),
                    ...(cohort.status === 'cancelled' ? { opacity: 0.55 } : {}),
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Name + badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold truncate" style={{ color: '#ededf5' }}>
                          {cohort.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium" style={COHORT_TYPE_STYLES[cohort.cohort_type]}>
                          {COHORT_TYPE_LABELS[cohort.cohort_type]}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium" style={statusCfg.style}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: '#4f6ef7' }}>
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}</span>
                      </div>

                      {/* Participants + progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#9090a8' }}>
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {cohort.current_participants} / {cohort.max_participants} participants
                          </span>
                          <span style={{ color: '#9090a8' }}>({fillPct}%)</span>
                        </div>
                        <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,30,48,0.8)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${fillPct}%`, background: '#4f6ef7' }}
                          />
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#fcc824' }}>
                        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fcc824' }} />
                        <span>
                          {formatRevenue(cohort.price_cents, cohort.current_participants)} revenue
                        </span>
                        <span className="font-normal" style={{ color: '#9090a8' }}>
                          ({(cohort.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} × {cohort.current_participants})
                        </span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 flex-shrink-0">
                      <Link
                        href={`/admin/cohorts/${cohort.id}/enrollments`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                        style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#4f6ef7' }}
                      >
                        <Users className="w-3.5 h-3.5" />
                        View Enrollments
                      </Link>

                      {cohort.status !== 'active' && cohort.status !== 'cancelled' && (
                        <button
                          onClick={() => patchStatus(cohort, 'active')}
                          disabled={isPatching}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
                        >
                          {isPatching ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Mark Active
                        </button>
                      )}

                      {cohort.status === 'active' && (
                        <button
                          onClick={() => patchStatus(cohort, 'completed')}
                          disabled={isPatching}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                          style={{ background: 'rgba(144,144,168,0.12)', border: '1px solid rgba(144,144,168,0.2)', color: '#9090a8' }}
                        >
                          {isPatching ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Mark Completed
                        </button>
                      )}

                      {(cohort.status === 'upcoming' || cohort.status === 'active') && (
                        <button
                          onClick={() => patchStatus(cohort, 'cancelled')}
                          disabled={isPatching}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                        >
                          {isPatching ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

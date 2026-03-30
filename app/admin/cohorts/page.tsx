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

const COHORT_TYPE_COLORS: Record<CohortType, string> = {
  architecture_997: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  intensive_1997: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const STATUS_CONFIG: Record<CohortStatus, { label: string; color: string; icon: React.ReactNode }> = {
  upcoming: {
    label: 'Upcoming',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    icon: <Clock className="w-3 h-3" />,
  },
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cohorts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage 90-Day Mindset Architecture cohort enrollments
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchCohorts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Cohort
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            statusMsg.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
          }`}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Cohorts</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalCohorts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Cohorts</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeCohorts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Enrolled</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalEnrolled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Cohort Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Cohort</h2>
              <button
                onClick={() => { setShowCreateForm(false); setForm(DEFAULT_FORM); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cohort Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Spring 2026 Architecture"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="architecture_997">$997 Architecture (90-Day Group Cohort)</option>
                  <option value="intensive_1997">$1,997 Intensive (1:1 Add-on)</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Max Participants & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_participants}
                    onChange={e => setForm({ ...form, max_participants: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (cents)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.price_cents}
                    onChange={e => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    = {(form.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreateForm(false); setForm(DEFAULT_FORM); }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCohort}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Cohorts</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading cohorts...</p>
          </div>
        ) : cohorts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No cohorts yet</p>
            <p className="text-sm mt-1">Create your first cohort to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Create a cohort
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {cohorts.map(cohort => {
              const statusCfg = STATUS_CONFIG[cohort.status] || STATUS_CONFIG.upcoming;
              const fillPct = cohort.max_participants > 0
                ? Math.min(100, Math.round((cohort.current_participants / cohort.max_participants) * 100))
                : 0;
              const isPatching = patchingId === cohort.id;

              return (
                <div
                  key={cohort.id}
                  className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Name + badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {cohort.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${COHORT_TYPE_COLORS[cohort.cohort_type]}`}>
                          {COHORT_TYPE_LABELS[cohort.cohort_type]}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}</span>
                      </div>

                      {/* Participants + progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {cohort.current_participants} / {cohort.max_participants} participants
                          </span>
                          <span className="text-gray-400 dark:text-gray-500">({fillPct}%)</span>
                        </div>
                        <div className="w-full max-w-xs h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fillPct >= 100
                                ? 'bg-green-500'
                                : fillPct >= 70
                                ? 'bg-indigo-500'
                                : 'bg-indigo-400'
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>
                          {formatRevenue(cohort.price_cents, cohort.current_participants)} revenue
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 font-normal">
                          ({(cohort.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} × {cohort.current_participants})
                        </span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 flex-shrink-0">
                      <Link
                        href={`/admin/cohorts/${cohort.id}/enrollments`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        View Enrollments
                      </Link>

                      {cohort.status !== 'active' && cohort.status !== 'cancelled' && (
                        <button
                          onClick={() => patchStatus(cohort, 'active')}
                          disabled={isPatching}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
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
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          {isPatching ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Mark Completed
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

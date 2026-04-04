'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
  Brain,
} from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

type CohortStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
type CohortType = 'architecture_997' | 'intensive_1997';
type ParticipantActivityStatus = 'active' | 'at-risk' | 'inactive';

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

interface Participant {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  streak_days: number | null;
  last_activity_date: string | null;
  enrollment_status: string;
  sessions_this_week: number;
  last_active: string | null;
  latest_mindset_score: number | null;
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
  intensive_1997: { background: 'rgba(124,91,246,0.12)', border: '1px solid rgba(124,91,246,0.3)', color: '#7c5bf6', borderRadius: 9999 },
};

const STATUS_CONFIG: Record<CohortStatus, { label: string; style: React.CSSProperties; icon: React.ReactNode }> = {
  upcoming: {
    label: 'Upcoming',
    style: { background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.3)', color: '#4f6ef7', borderRadius: 9999 },
    icon: <Clock className="w-3 h-3" />,
  },
  active: {
    label: 'Active',
    style: { background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.3)', color: '#4f6ef7', borderRadius: 9999 },
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

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getActivityStatus(lastActive: string | null): ParticipantActivityStatus {
  if (!lastActive) return 'inactive';
  const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
  if (days <= 7) return 'active';
  if (days <= 14) return 'at-risk';
  return 'inactive';
}

const ACTIVITY_STATUS_CONFIG: Record<ParticipantActivityStatus, { label: string; style: React.CSSProperties }> = {
  active: {
    label: 'Active',
    style: { background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.3)', color: '#4f6ef7', borderRadius: 9999 },
  },
  'at-risk': {
    label: 'At Risk',
    style: { background: 'rgba(252,200,36,0.12)', border: '1px solid rgba(252,200,36,0.3)', color: '#fcc824', borderRadius: 9999 },
  },
  inactive: {
    label: 'Inactive',
    style: { background: 'rgba(90,90,114,0.15)', border: '1px solid rgba(90,90,114,0.3)', color: '#5a5a72', borderRadius: 9999 },
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Participant table sub-component
// ──────────────────────────────────────────────────────────────────────────────
function ParticipantTable({ cohortId }: { cohortId: number }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/api/admin/cohorts/${cohortId}/participants`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Cohort-level summary
  const totalParticipants = participants.length;
  const avgSessionsWeek = totalParticipants > 0
    ? (participants.reduce((s, p) => s + Number(p.sessions_this_week || 0), 0) / totalParticipants).toFixed(1)
    : '—';
  const avgScore = (() => {
    const scored = participants.filter(p => p.latest_mindset_score !== null);
    if (scored.length === 0) return '—';
    return (scored.reduce((s, p) => s + Number(p.latest_mindset_score), 0) / scored.length).toFixed(0);
  })();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', color: '#9090a8', fontSize: 13 }}>
        <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
        Loading participants…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', color: '#f87171', fontSize: 13 }}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        {error}
        <button
          onClick={fetchParticipants}
          style={{ marginLeft: 8, color: '#4f6ef7', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' }}
          aria-label="Retry loading participants"
        >
          Retry
        </button>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center', color: '#5a5a72', fontSize: 13 }}>
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: '#9090a8' }} aria-hidden="true" />
        <p style={{ color: '#9090a8' }}>No participants enrolled yet</p>
        <p style={{ color: '#5a5a72', marginTop: 4, fontSize: 12 }}>Enroll participants via the cohort service or invite codes.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        padding: '12px 20px',
        borderBottom: '1px solid #1e1e30',
        background: 'rgba(9,9,15,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users className="w-3.5 h-3.5" style={{ color: '#4f6ef7' }} aria-hidden="true" />
          <span style={{ fontSize: 12, color: '#9090a8' }}>Participants:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ededf5' }}>{totalParticipants}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity className="w-3.5 h-3.5" style={{ color: '#4f6ef7' }} aria-hidden="true" />
          <span style={{ fontSize: 12, color: '#9090a8' }}>Avg sessions/wk:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ededf5' }}>{avgSessionsWeek}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain className="w-3.5 h-3.5" style={{ color: '#fcc824' }} aria-hidden="true" />
          <span style={{ fontSize: 12, color: '#9090a8' }}>Avg score:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ededf5' }}>{avgScore}</span>
        </div>
      </div>

      {/* Table — mobile-safe with overflow-x scroll */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e30' }}>
              {['Participant', 'Sessions / Wk', 'Mindset Score', 'Streak', 'Last Active', 'Status'].map(col => (
                <th
                  key={col}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    color: '#5a5a72',
                    fontWeight: 500,
                    fontSize: 11,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map((p, idx) => {
              const activityStatus = getActivityStatus(p.last_active);
              const activityCfg = ACTIVITY_STATUS_CONFIG[activityStatus];
              const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email;
              const isLast = idx === participants.length - 1;

              return (
                <tr
                  key={p.user_id}
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid rgba(30,30,48,0.6)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {/* Participant name/email */}
                  <td style={{ padding: '12px 16px', minWidth: 160 }}>
                    <div style={{ fontWeight: 500, color: '#ededf5' }}>{displayName}</div>
                    {displayName !== p.email && (
                      <div style={{ fontSize: 11, color: '#5a5a72', marginTop: 2 }}>{p.email}</div>
                    )}
                  </td>

                  {/* Sessions this week */}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      color: Number(p.sessions_this_week) > 0 ? '#ededf5' : '#5a5a72',
                      fontWeight: Number(p.sessions_this_week) > 0 ? 600 : 400,
                    }}>
                      {Number(p.sessions_this_week) || 0}
                    </span>
                  </td>

                  {/* Mindset score */}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    {p.latest_mindset_score !== null ? (
                      <span style={{ color: '#fcc824', fontWeight: 600 }}>
                        {Number(p.latest_mindset_score)}
                      </span>
                    ) : (
                      <span style={{ color: '#5a5a72' }}>—</span>
                    )}
                  </td>

                  {/* Streak */}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    {p.streak_days !== null && Number(p.streak_days) > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Flame className="w-3.5 h-3.5" style={{ color: '#fcc824' }} aria-hidden="true" />
                        <span style={{ color: '#ededf5', fontWeight: 600 }}>{Number(p.streak_days)}</span>
                        <span style={{ color: '#5a5a72', fontSize: 11 }}>days</span>
                      </div>
                    ) : (
                      <span style={{ color: '#5a5a72' }}>—</span>
                    )}
                  </td>

                  {/* Last active */}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#9090a8' }}>
                    {relativeTime(p.last_active)}
                  </td>

                  {/* Status pill */}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        ...activityCfg.style,
                      }}
                    >
                      {activityCfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────
export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<NewCohortForm>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [patchingId, setPatchingId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Track which cohorts have their participant panel expanded
  const [expandedCohortIds, setExpandedCohortIds] = useState<Set<number>>(new Set());

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
      setCohorts(Array.isArray(data) ? data : data.cohorts || []);
    } catch (err) {
      console.error('Failed to fetch cohorts:', err);
      showStatus('error', 'Failed to load cohorts.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (cohortId: number) => {
    setExpandedCohortIds(prev => {
      const next = new Set(prev);
      if (next.has(cohortId)) {
        next.delete(cohortId);
      } else {
        next.add(cohortId);
      }
      return next;
    });
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
        throw new Error((err as any).error || `HTTP ${res.status}`);
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
        throw new Error((err as any).error || `HTTP ${res.status}`);
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
        <div className="flex items-center gap-2 self-start sm:self-auto" style={{ flexWrap: 'wrap' }}>
          <button
            onClick={fetchCohorts}
            disabled={loading}
            aria-label="Refresh cohorts"
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8', minHeight: 44 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            aria-label="Create new cohort"
            className="flex items-center gap-2 font-semibold rounded-xl px-5 text-sm transition-colors"
            style={{ background: '#4f6ef7', color: '#ffffff', minHeight: 44 }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Cohort
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
          style={statusMsg.type === 'success'
            ? { background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.25)', color: '#4f6ef7' }
            : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            )}
            {statusMsg.text}
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            aria-label="Dismiss message"
            style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cohorts', value: totalCohorts, icon: <Calendar className="w-5 h-5" style={{ color: '#4f6ef7' }} aria-hidden="true" />, iconBg: 'rgba(79,110,247,0.12)' },
          { label: 'Active Cohorts', value: activeCohorts, icon: <CheckCircle className="w-5 h-5" style={{ color: '#4f6ef7' }} aria-hidden="true" />, iconBg: 'rgba(79,110,247,0.12)' },
          { label: 'Total Enrolled', value: totalEnrolled, icon: <Users className="w-5 h-5" style={{ color: '#4f6ef7' }} aria-hidden="true" />, iconBg: 'rgba(79,110,247,0.12)' },
          { label: 'Total Revenue', value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <TrendingUp className="w-5 h-5" style={{ color: '#fcc824' }} aria-hidden="true" />, iconBg: 'rgba(252,200,36,0.1)' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: stat.iconBg }}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm" style={{ color: '#9090a8' }}>{stat.label}</p>
                <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Cohort Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
          role="dialog"
          aria-modal="true"
          aria-label="New cohort form"
        >
          <div className="rounded-xl p-6 max-w-lg w-full shadow-2xl" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>New Cohort</h2>
              <button
                onClick={() => { setShowCreateForm(false); setForm(DEFAULT_FORM); }}
                aria-label="Close form"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#9090a8', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" aria-hidden="true" />
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
                  aria-required="true"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
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
                    setForm({ ...form, cohort_type: t, price_cents: t === 'intensive_1997' ? 199700 : 99700 });
                  }}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
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
                    aria-required="true"
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
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
                    aria-required="true"
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
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
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Price in cents
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.price_cents}
                    onChange={e => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                    = {(form.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6" style={{ flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowCreateForm(false); setForm(DEFAULT_FORM); }}
                style={{ color: '#9090a8', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={createCohort}
                disabled={creating}
                aria-label="Create cohort"
                className="flex items-center gap-2 font-semibold rounded-xl px-5 text-sm transition-colors disabled:opacity-50"
                style={{ background: '#4f6ef7', color: '#ffffff', minHeight: 44 }}
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#4f6ef7' }} aria-hidden="true"></div>
            <p className="text-sm" style={{ color: '#9090a8' }}>Loading cohorts…</p>
          </div>
        ) : cohorts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Calendar className="w-12 h-12 mb-3 opacity-30" style={{ color: '#fcc824' }} aria-hidden="true" />
            <p className="font-semibold" style={{ color: '#ededf5' }}>No cohorts scheduled yet</p>
            <p className="text-sm mt-1 max-w-xs" style={{ color: '#9090a8' }}>
              Create the first cohort and start enrolling your Architecture students.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-sm font-medium hover:underline"
              style={{ color: '#fcc824', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}
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
              const isExpanded = expandedCohortIds.has(cohort.id);

              return (
                <div
                  key={cohort.id}
                  style={{
                    borderBottom: idx < cohorts.length - 1 ? '1px solid #1e1e30' : undefined,
                    opacity: cohort.status === 'cancelled' ? 0.55 : 1,
                  }}
                >
                  {/* Cohort header row */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name + badges + expand toggle */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => toggleExpanded(cohort.id)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${cohort.name} participant list`}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 44, minWidth: 44 }}
                          >
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#4f6ef7' }} aria-hidden="true" />
                              : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#9090a8' }} aria-hidden="true" />
                            }
                            <h3 className="text-base font-semibold" style={{ color: '#ededf5', textAlign: 'left' }}>
                              {cohort.name}
                            </h3>
                          </button>
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
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          <span>{formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}</span>
                        </div>

                        {/* Participants + progress */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm" style={{ color: '#9090a8' }}>
                            <Users className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            <span>{cohort.current_participants} / {cohort.max_participants} participants</span>
                            <span>({fillPct}%)</span>
                          </div>
                          <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,30,48,0.8)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${fillPct}%`, background: '#4f6ef7' }} />
                          </div>
                        </div>

                        {/* Revenue */}
                        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#fcc824', flexWrap: 'wrap' }}>
                          <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fcc824' }} aria-hidden="true" />
                          <span>{formatRevenue(cohort.price_cents, cohort.current_participants)} revenue</span>
                          <span className="font-normal" style={{ color: '#9090a8' }}>
                            ({(cohort.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} × {cohort.current_participants})
                          </span>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 flex-shrink-0">
                        <Link
                          href={`/admin/cohorts/${cohort.id}/enrollments`}
                          className="flex items-center gap-1.5 px-3 text-sm font-medium rounded-lg transition-colors"
                          style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#4f6ef7', minHeight: 44, alignItems: 'center' }}
                        >
                          <Users className="w-3.5 h-3.5" aria-hidden="true" />
                          View Enrollments
                        </Link>

                        {cohort.status !== 'active' && cohort.status !== 'cancelled' && (
                          <button
                            onClick={() => patchStatus(cohort, 'active')}
                            disabled={isPatching}
                            aria-label={`Mark ${cohort.name} active`}
                            className="flex items-center gap-1.5 px-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.25)', color: '#4f6ef7', minHeight: 44 }}
                          >
                            {isPatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                            Mark Active
                          </button>
                        )}

                        {cohort.status === 'active' && (
                          <button
                            onClick={() => patchStatus(cohort, 'completed')}
                            disabled={isPatching}
                            aria-label={`Mark ${cohort.name} completed`}
                            className="flex items-center gap-1.5 px-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(144,144,168,0.12)', border: '1px solid rgba(144,144,168,0.2)', color: '#9090a8', minHeight: 44 }}
                          >
                            {isPatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                            Mark Completed
                          </button>
                        )}

                        {(cohort.status === 'upcoming' || cohort.status === 'active') && (
                          <button
                            onClick={() => patchStatus(cohort, 'cancelled')}
                            disabled={isPatching}
                            aria-label={`Cancel ${cohort.name}`}
                            className="flex items-center gap-1.5 px-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', minHeight: 44 }}
                          >
                            {isPatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable participant panel */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #1e1e30', background: 'rgba(9,9,15,0.3)' }}>
                      <ParticipantTable cohortId={cohort.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

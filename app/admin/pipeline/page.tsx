'use client';

import { useEffect, useState, useCallback } from 'react';
import { Target, RefreshCw, Plus, Search, X, ChevronDown, Users, UserCheck, ArrowRight, DollarSign, Star } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

const STAGES = [
  { key: 'lead',               label: 'Lead',             color: 'text-[#9090a8]',     accent: '#6b7280', iconBg: 'rgba(107,114,128,0.15)' },
  { key: 'trial',              label: 'Trial',            color: 'text-blue-300',       accent: '#60a5fa', iconBg: 'rgba(96,165,250,0.15)' },
  { key: 'reset_47',          label: '$47 Reset',        color: 'text-violet-300',     accent: '#a78bfa', iconBg: 'rgba(167,139,250,0.15)' },
  { key: 'architecture_997', label: '$997 Architecture', color: 'text-indigo-300',     accent: '#818cf8', iconBg: 'rgba(129,140,248,0.15)' },
  { key: 'intensive_1997',   label: '$1997 Intensive',   color: 'text-amber-300',      accent: '#fbbf24', iconBg: 'rgba(251,191,36,0.15)' },
  { key: 'client',            label: 'Client',           color: 'text-green-300',      accent: '#4ade80', iconBg: 'rgba(74,222,128,0.15)' },
];

const SOURCES = ['quiz', 'scorecard', 'os-audit', '7days', 'manual'];

const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
  quiz:       { bg: 'rgba(244,114,182,0.15)', color: '#f9a8d4' },
  scorecard:  { bg: 'rgba(34,211,238,0.15)',  color: '#67e8f9' },
  'os-audit': { bg: 'rgba(252,200,36,0.15)',  color: '#fde047' },
  '7days':    { bg: 'rgba(45,212,191,0.15)',  color: '#5eead4' },
  manual:     { bg: 'rgba(144,144,168,0.12)', color: '#9090a8' },
};

const STAGE_ICONS: Record<string, any> = {
  lead: Users, trial: ArrowRight, reset_47: DollarSign,
  architecture_997: Star, intensive_1997: Star, client: UserCheck,
};

function getStage(key: string) {
  return STAGES.find(s => s.key === key);
}
function stageBadgeStyle(key: string): React.CSSProperties {
  const s = getStage(key);
  return s
    ? { background: s.iconBg, color: s.accent, border: `1px solid ${s.accent}30` }
    : { background: 'rgba(107,114,128,0.15)', color: '#9090a8' };
}
function stageLabel(key: string) {
  return STAGES.find(s => s.key === key)?.label || key;
}

interface Contact {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  source: string;
  funnel_stage: string;
  quiz_thinking_style: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

interface Summary {
  total: number;
  todayNew: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function PipelinePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', firstName: '', lastName: '', phone: '', source: 'manual', notes: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchSummary = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/pipeline/summary`, { headers: authHeaders() });
      if (r.ok) setSummary(await r.json());
    } catch {}
  }, []);

  const fetchContacts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (stageFilter) params.set('stage', stageFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (search) params.set('search', search);
      const r = await fetch(`${API}/api/admin/pipeline/contacts?${params}`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        setContacts(data.contacts);
        setTotal(data.total);
        setPage(p);
      }
    } catch {}
    setLoading(false);
  }, [stageFilter, sourceFilter, search]);

  useEffect(() => { fetchSummary(); fetchContacts(1); }, [fetchSummary, fetchContacts]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch(`${API}/api/admin/pipeline/sync`, { method: 'POST', headers: authHeaders() });
      if (r.ok) await Promise.all([fetchSummary(), fetchContacts(1)]);
    } catch {}
    setSyncing(false);
  };

  const handleStageChange = async (contactId: number, newStage: string) => {
    setEditingStage(null);
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, funnel_stage: newStage } : c));
    try {
      await fetch(`${API}/api/admin/pipeline/contacts/${contactId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ funnelStage: newStage }),
      });
      fetchSummary();
    } catch {}
  };

  const handleMarkContacted = async (contactId: number) => {
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, last_contacted_at: new Date().toISOString() } : c));
    try {
      await fetch(`${API}/api/admin/pipeline/contacts/${contactId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ lastContactedAt: true }),
      });
    } catch {}
  };

  const handleAddContact = async () => {
    if (!addForm.email) { setAddError('Email is required'); return; }
    setAddLoading(true); setAddError('');
    try {
      const r = await fetch(`${API}/api/admin/pipeline/contacts`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ email: addForm.email, firstName: addForm.firstName, lastName: addForm.lastName, phone: addForm.phone, source: addForm.source, notes: addForm.notes }),
      });
      if (r.ok) {
        setShowAddModal(false);
        setAddForm({ email: '', firstName: '', lastName: '', phone: '', source: 'manual', notes: '' });
        await Promise.all([fetchSummary(), fetchContacts(1)]);
      } else {
        const d = await r.json();
        setAddError(d.error || 'Failed to add');
      }
    } catch { setAddError('Network error'); }
    setAddLoading(false);
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
            <Target className="w-7 h-7" style={{ color: '#818cf8' }} />
            Pipeline
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
            Unified lead view — quiz, lead magnets, and manual contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ background: '#1e1e30', color: '#9090a8', border: '1px solid #1e1e30' }}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync leads
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: '#4f6ef7', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            Add contact
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGES.map(stage => {
            const Icon = STAGE_ICONS[stage.key] || Users;
            const count = summary.byStage[stage.key] || 0;
            const isActive = stageFilter === stage.key;
            return (
              <button
                key={stage.key}
                onClick={() => { setStageFilter(stageFilter === stage.key ? '' : stage.key); }}
                className="p-4 text-left transition-all rounded-xl"
                style={{
                  background: 'rgba(18,18,31,0.7)',
                  border: isActive ? `1px solid ${stage.accent}` : '1px solid #1e1e30',
                  borderRadius: 16,
                  boxShadow: isActive ? `0 0 0 2px ${stage.accent}30` : undefined,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: stage.iconBg }}
                >
                  <Icon className="w-4 h-4" style={{ color: stage.accent }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: '#ededf5' }}>{count}</div>
                <div className="text-xs mt-0.5" style={{ color: '#9090a8' }}>{stage.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {summary && (
        <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: '#9090a8' }}>
          <span><span className="font-semibold" style={{ color: '#ededf5' }}>{summary.total}</span> total</span>
          <span>·</span>
          <span><span className="font-semibold" style={{ color: '#4ade80' }}>{summary.todayNew}</span> new today</span>
          {Object.entries(summary.bySource).map(([src, cnt]) => (
            <span key={src}>· <span className="font-medium" style={{ color: '#ededf5' }}>{cnt}</span> {src}</span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9090a8' }} />
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchContacts(1)}
            className="w-full pl-9 pr-4 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => { setStageFilter(e.target.value); }}
          className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
        >
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); }}
          className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
        >
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(stageFilter || sourceFilter || search) && (
          <button
            onClick={() => { setStageFilter(''); setSourceFilter(''); setSearch(''); }}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl transition-colors"
            style={{ background: '#1e1e30', color: '#9090a8', border: '1px solid #1e1e30' }}
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Contacts Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#4f6ef7' }} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48" style={{ color: '#9090a8' }}>
            <Users className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No contacts yet — hit "Sync leads" to backfill</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e30', background: 'rgba(9,9,15,0.6)' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Contact</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Source</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Stage</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Style</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Last contacted</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#9090a8' }}>Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr
                    key={c.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: '#ededf5' }}>
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </div>
                      <div className="text-xs" style={{ color: '#9090a8' }}>{c.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                        style={SOURCE_COLORS[c.source]
                          ? { background: SOURCE_COLORS[c.source].bg, color: SOURCE_COLORS[c.source].color }
                          : { background: SOURCE_COLORS.manual.bg, color: SOURCE_COLORS.manual.color }
                        }
                      >
                        {c.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingStage === c.id ? (
                        <select
                          autoFocus
                          defaultValue={c.funnel_stage}
                          onBlur={e => handleStageChange(c.id, e.target.value)}
                          onChange={e => handleStageChange(c.id, e.target.value)}
                          className="bg-[#09090f] border border-[#4f6ef7] text-[#ededf5] rounded-xl px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                        >
                          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingStage(c.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                          style={stageBadgeStyle(c.funnel_stage)}
                        >
                          {stageLabel(c.funnel_stage)}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: '#9090a8' }}>
                      {c.quiz_thinking_style || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#9090a8' }}>{fmt(c.last_contacted_at)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#9090a8' }}>{fmt(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleMarkContacted(c.id)}
                        className="text-xs hover:underline"
                        style={{ color: '#818cf8' }}
                      >
                        Contacted ✓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #1e1e30' }}>
            <span className="text-sm" style={{ color: '#9090a8' }}>{total} contacts · page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchContacts(page - 1)} disabled={page <= 1}
                className="px-3 py-1 text-sm rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: '#1e1e30', color: '#9090a8', border: '1px solid #1e1e30' }}
              >Prev</button>
              <button
                onClick={() => fetchContacts(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: '#1e1e30', color: '#9090a8', border: '1px solid #1e1e30' }}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="p-6 w-full max-w-md mx-4 shadow-2xl" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#ededf5' }}>Add Contact</h2>
              <button onClick={() => setShowAddModal(false)} style={{ color: '#9090a8' }} className="hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {addError && <p className="text-sm" style={{ color: '#f87171' }}>{addError}</p>}
              <div className="grid grid-cols-2 gap-3">
                {(['firstName', 'lastName'] as const).map(f => (
                  <div key={f}>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>{f === 'firstName' ? 'First name' : 'Last name'}</label>
                    <input
                      value={addForm[f]}
                      onChange={e => setAddForm(p => ({ ...p, [f]: e.target.value }))}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Email *</label>
                <input
                  value={addForm.email}
                  onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Phone</label>
                <input
                  value={addForm.phone}
                  onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Source</label>
                <select
                  value={addForm.source}
                  onChange={e => setAddForm(p => ({ ...p, source: e.target.value }))}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                style={{ background: '#1e1e30', color: '#9090a8', border: '1px solid #1e1e30' }}
              >Cancel</button>
              <button
                onClick={handleAddContact} disabled={addLoading}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-50 transition-opacity"
                style={{ background: '#4f6ef7', color: '#fff' }}
              >
                {addLoading ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

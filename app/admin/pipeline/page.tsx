'use client';

import { useEffect, useState, useCallback } from 'react';
import { Target, RefreshCw, Plus, Search, X, ChevronDown, Users, UserCheck, ArrowRight, DollarSign, Star } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

const STAGES = [
  { key: 'lead',               label: 'Lead',             color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',             iconColor: 'bg-gray-100 dark:bg-gray-700 text-gray-500' },
  { key: 'trial',              label: 'Trial',            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',           iconColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-500' },
  { key: 'reset_47',          label: '$47 Reset',        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',   iconColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-500' },
  { key: 'architecture_997', label: '$997 Architecture', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',   iconColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' },
  { key: 'intensive_1997',   label: '$1997 Intensive',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',   iconColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' },
  { key: 'client',            label: 'Client',           color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',       iconColor: 'bg-green-100 dark:bg-green-900/30 text-green-500' },
];

const SOURCES = ['quiz', 'scorecard', 'os-audit', '7days', 'manual'];

const SOURCE_COLORS: Record<string, string> = {
  quiz:       'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  scorecard:  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'os-audit': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  '7days':    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  manual:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const STAGE_ICONS: Record<string, any> = {
  lead: Users, trial: ArrowRight, reset_47: DollarSign,
  architecture_997: Star, intensive_1997: Star, client: UserCheck,
};

function stageBadge(key: string) {
  return STAGES.find(s => s.key === key)?.color || 'bg-gray-100 text-gray-700';
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-500" />
            Pipeline
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Unified lead view — quiz, lead magnets, and manual contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync leads
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
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
            return (
              <button
                key={stage.key}
                onClick={() => { setStageFilter(stageFilter === stage.key ? '' : stage.key); }}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-4 text-left transition-all ${
                  stageFilter === stage.key
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stage.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stage.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {summary && (
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
          <span><span className="font-semibold text-gray-900 dark:text-white">{summary.total}</span> total</span>
          <span>·</span>
          <span><span className="font-semibold text-green-600 dark:text-green-400">{summary.todayNew}</span> new today</span>
          {Object.entries(summary.bySource).map(([src, cnt]) => (
            <span key={src}>· <span className="font-medium">{cnt}</span> {src}</span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchContacts(1)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => { setStageFilter(e.target.value); }}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); }}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(stageFilter || sourceFilter || search) && (
          <button
            onClick={() => { setStageFilter(''); setSourceFilter(''); setSearch(''); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <Users className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No contacts yet — hit "Sync leads" to backfill</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Style</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last contacted</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </div>
                      <div className="text-xs text-gray-400">{c.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[c.source] || SOURCE_COLORS.manual}`}>
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
                          className="text-xs border border-indigo-400 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                        >
                          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingStage(c.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${stageBadge(c.funnel_stage)}`}
                        >
                          {stageLabel(c.funnel_stage)}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {c.quiz_thinking_style || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{fmt(c.last_contacted_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{fmt(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleMarkContacted(c.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">{total} contacts · page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => fetchContacts(page - 1)} disabled={page <= 1} className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">Prev</button>
              <button onClick={() => fetchContacts(page + 1)} disabled={page >= totalPages} className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Contact</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <div className="grid grid-cols-2 gap-3">
                {(['firstName', 'lastName'] as const).map(f => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f === 'firstName' ? 'First name' : 'Last name'}</label>
                    <input value={addForm[f]} onChange={e => setAddForm(p => ({ ...p, [f]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email *</label>
                <input value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                <input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
                <select value={addForm.source} onChange={e => setAddForm(p => ({ ...p, source: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleAddContact} disabled={addLoading} className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                {addLoading ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

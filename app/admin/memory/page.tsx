'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  Brain,
  Search,
  Trash2,
  RefreshCw,
  Pin,
  PinOff,
  Edit2,
  Save,
  X,
  Sparkles,
  Filter,
  ChevronDown,
  AlertCircle,
  User,
  Activity,
  Database,
  TrendingUp,
} from 'lucide-react';

// ─── Token palette ────────────────────────────────────────────────────────────
const T = {
  pageBg: '#09090f',
  cardBg: 'rgba(18,18,31,0.8)',
  border: '#1e1e30',
  text: '#ededf5',
  muted: '#9090a8',
  dim: '#5a5a72',
  blue: '#4f6ef7',
  amber: '#fcc824',
  purple: '#7c5bf6',
  green: '#22c55e',
  red: '#f87171',
  orangeAccent: '#f97316',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  importance_score: number;
  created_at: string;
  source?: string;
  pinned?: boolean;
  status?: string;
  agent_id?: string;
}

interface MemoryStats {
  memories: {
    total: number;
    by_category: Array<{ category: string; count: number; avg_importance: string }>;
  };
  conversations: {
    total: number;
    agents_used: number;
    total_messages: number;
  };
  usage: {
    estimated_tokens: number;
    estimated_cost: string;
    total_characters: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function importanceColor(score: number): string {
  if (score >= 0.8) return T.amber;
  if (score >= 0.5) return T.blue;
  return T.muted;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminMemoryPage() {
  const router = useRouter();
  const currentUser = useAppStore((state) => state.user);

  // User search
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Memory data
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'user' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImportance, setEditImportance] = useState(0.5);

  // Optimizing
  const [optimizing, setOptimizing] = useState(false);

  // Error / success banners
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'power_user') {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  // ── User search ─────────────────────────────────────────────────────────────
  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUserResults([]);
      return;
    }
    setUserSearchLoading(true);
    try {
      const res = await fetch(
        `${API}/api/admin/users/search?q=${encodeURIComponent(q)}&limit=8`,
        { headers: authHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setUserResults(Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : []);
      } else {
        setUserResults([]);
      }
    } catch {
      setUserResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userQuery), 300);
    return () => clearTimeout(timer);
  }, [userQuery, searchUsers]);

  // ── Load memory data for selected user ──────────────────────────────────────
  const loadMemoryData = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ctxRes, statsRes] = await Promise.all([
        fetch(`${API}/api/memory/context/${userId}`, { headers: authHeaders() }),
        fetch(`${API}/api/memory/stats/${userId}`, { headers: authHeaders() }),
      ]);

      if (ctxRes.ok) {
        const data = await ctxRes.json();
        setMemories(Array.isArray(data) ? data : []);
      } else {
        setError(`Failed to load memories (${ctxRes.status})`);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMemoryData(selectedUser.id);
    }
  }, [selectedUser, loadMemoryData]);

  // ── Filtered memories ────────────────────────────────────────────────────────
  const filteredMemories = memories.filter((m) => {
    if (typeFilter !== 'all' && m.memory_type !== typeFilter) return false;
    if (sourceFilter !== 'all' && m.source !== sourceFilter) return false;
    if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const memoryTypes = ['all', ...Array.from(new Set(memories.map((m) => m.memory_type).filter(Boolean)))];

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (memoryId: string) => {
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    setError(null);
    try {
      const res = await fetch(`${API}/api/memory/${memoryId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        setSuccess('Memory deleted.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Delete failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // ── Toggle pin ───────────────────────────────────────────────────────────────
  const handleTogglePin = async (memory: Memory) => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/memory/${memory.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ pinned: !memory.pinned }),
      });
      if (res.ok) {
        setMemories((prev) => prev.map((m) => m.id === memory.id ? { ...m, pinned: !m.pinned } : m));
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Pin update failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pin update failed');
    }
  };

  // ── Save edit ────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (memoryId: string) => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/memory/${memoryId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ content: editContent, importance_score: editImportance }),
      });
      if (res.ok) {
        setMemories((prev) =>
          prev.map((m) =>
            m.id === memoryId ? { ...m, content: editContent, importance_score: editImportance } : m
          )
        );
        setEditingId(null);
        setSuccess('Memory updated.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Save failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  // ── Optimize ─────────────────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!selectedUser) return;
    if (!confirm('Run AI optimization? This will archive low-importance memories older than 30 days.')) return;
    setOptimizing(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/memory/optimize/${selectedUser.id}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || 'Optimization complete.');
        setTimeout(() => setSuccess(null), 5000);
        await loadMemoryData(selectedUser.id);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Optimization failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="mb-2">
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: T.muted }}>
          Admin — Memory
        </p>
        <h1 className="text-3xl font-bold" style={{ color: T.text }}>Memory Explorer</h1>
        <p className="text-sm mt-1" style={{ color: T.muted }}>
          View, edit, pin and optimize stored memories for any user.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: T.red }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: T.green }}
        >
          <span>{success}</span>
        </div>
      )}

      {/* User Picker */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 16 }} className="p-6">
        <h2 className="text-base font-semibold mb-3" style={{ color: T.text }}>Select User</h2>
        <div className="relative max-w-md">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(30,30,48,0.6)', border: `1px solid ${T.border}` }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: T.muted }} />
            <input
              type="text"
              placeholder="Search by email or name…"
              value={userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: T.text }}
            />
            {userSearchLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: T.muted }} />}
          </div>

          {/* Dropdown */}
          {showUserDropdown && userResults.length > 0 && (
            <div
              className="absolute z-20 w-full mt-1 rounded-lg overflow-hidden shadow-xl"
              style={{ background: '#12121f', border: `1px solid ${T.border}` }}
            >
              {userResults.map((u) => (
                <button
                  key={u.id}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors"
                  style={{ color: T.text }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(30,30,48,0.8)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  onClick={() => {
                    setSelectedUser(u);
                    setUserQuery(`${u.first_name || ''} ${u.last_name || ''} <${u.email}>`.trim());
                    setShowUserDropdown(false);
                  }}
                >
                  <User className="w-4 h-4 flex-shrink-0" style={{ color: T.muted }} />
                  <div>
                    <div className="font-medium">{u.first_name} {u.last_name}</div>
                    <div className="text-xs" style={{ color: T.muted }}>{u.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm" style={{ color: T.muted }}>Viewing:</span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(79,110,247,0.15)', color: '#7b8ff8' }}
            >
              <User className="w-3 h-3" />
              {selectedUser.email}
            </span>
            <button
              onClick={() => { setSelectedUser(null); setUserQuery(''); setMemories([]); setStats(null); }}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ color: T.muted }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Brain, label: 'Total Memories', value: stats.memories.total, color: T.purple, bg: 'rgba(124,91,246,0.15)' },
            { icon: Activity, label: 'Conversations', value: stats.conversations.total, color: T.blue, bg: 'rgba(79,110,247,0.15)' },
            { icon: Database, label: 'Messages', value: stats.conversations.total_messages, color: T.green, bg: 'rgba(34,197,94,0.15)' },
            { icon: TrendingUp, label: 'Est. Cost', value: stats.usage.estimated_cost, color: T.amber, bg: 'rgba(252,200,36,0.15)' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 16 }} className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: T.muted }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: T.text }}>{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Breakdown */}
      {stats && stats.memories.by_category.length > 0 && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 16 }} className="p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: T.text }}>Memory Breakdown</h2>
          <div className="flex flex-wrap gap-3">
            {stats.memories.by_category.map((cat) => (
              <div
                key={cat.category}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(30,30,48,0.6)', border: `1px solid ${T.border}` }}
              >
                <span className="font-medium capitalize" style={{ color: T.text }}>{cat.category}</span>
                <span className="ml-2" style={{ color: T.muted }}>{cat.count}</span>
                <span className="ml-2 text-xs" style={{ color: T.dim }}>avg {cat.avg_importance}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memories Table */}
      {selectedUser && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 16 }} className="overflow-hidden">
          {/* Table Header / Controls */}
          <div className="p-4 flex flex-wrap items-center gap-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <h2 className="text-base font-semibold" style={{ color: T.text }}>
              Memories
              {loading && <RefreshCw className="inline-block w-3.5 h-3.5 ml-2 animate-spin" style={{ color: T.muted }} />}
            </h2>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(30,30,48,0.6)', border: `1px solid ${T.border}` }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.muted }} />
              <input
                type="text"
                placeholder="Filter content…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs outline-none w-32"
                style={{ color: T.text }}
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg relative" style={{ background: 'rgba(30,30,48,0.6)', border: `1px solid ${T.border}` }}>
              <Filter className="w-3.5 h-3.5" style={{ color: T.muted }} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs outline-none pr-5 appearance-none"
                style={{ color: T.text }}
              >
                {memoryTypes.map((t) => (
                  <option key={t} value={t} style={{ background: '#12121f', color: T.text }}>
                    {t === 'all' ? 'All types' : t}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none" style={{ color: T.muted }} />
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg relative" style={{ background: 'rgba(30,30,48,0.6)', border: `1px solid ${T.border}` }}>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as 'all' | 'user' | 'ai')}
                className="bg-transparent text-xs outline-none pr-5 appearance-none"
                style={{ color: T.text }}
              >
                {(['all', 'user', 'ai'] as const).map((s) => (
                  <option key={s} value={s} style={{ background: '#12121f', color: T.text }}>
                    {s === 'all' ? 'All sources' : `Source: ${s}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none" style={{ color: T.muted }} />
            </div>

            {/* Actions */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => loadMemoryData(selectedUser.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'rgba(30,30,48,0.6)', border: `1px solid ${T.border}`, color: T.muted }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.blue; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: optimizing ? 'rgba(252,200,36,0.05)' : 'rgba(252,200,36,0.1)', border: `1px solid rgba(252,200,36,0.3)`, color: T.amber }}
              >
                {optimizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {optimizing ? 'Optimizing…' : 'Optimize'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(18,18,31,0.5)' }}>
                  {['Content', 'Type', 'Score', 'Source', 'Pinned', 'Created', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                      style={{ color: T.muted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center" style={{ color: T.muted }}>
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading memories…
                    </td>
                  </tr>
                ) : filteredMemories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center" style={{ color: T.muted }}>
                      {memories.length === 0 ? 'No memories found for this user.' : 'No memories match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredMemories.map((memory) => (
                    <tr
                      key={memory.id}
                      style={{ borderBottom: `1px solid ${T.border}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(30,30,48,0.4)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      {/* Content / Edit inline */}
                      <td className="px-4 py-3 max-w-xs">
                        {editingId === memory.id ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full text-sm rounded-lg px-2 py-1.5 outline-none resize-none"
                            style={{ background: 'rgba(30,30,48,0.8)', border: `1px solid ${T.blue}`, color: T.text }}
                          />
                        ) : (
                          <p className="text-sm line-clamp-2" style={{ color: T.text }} title={memory.content}>
                            {memory.content}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{ background: 'rgba(124,91,246,0.15)', color: T.purple }}
                        >
                          {memory.memory_type || '—'}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editingId === memory.id ? (
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            value={editImportance}
                            onChange={(e) => setEditImportance(parseFloat(e.target.value))}
                            className="w-16 text-xs px-2 py-1 rounded outline-none"
                            style={{ background: 'rgba(30,30,48,0.8)', border: `1px solid ${T.blue}`, color: T.text }}
                          />
                        ) : (
                          <span className="text-sm font-medium tabular-nums" style={{ color: importanceColor(memory.importance_score) }}>
                            {memory.importance_score?.toFixed(2) ?? '—'}
                          </span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs capitalize" style={{ color: T.muted }}>{memory.source || '—'}</span>
                      </td>

                      {/* Pinned */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-xs"
                          style={{ color: memory.pinned ? T.amber : T.dim }}
                        >
                          {memory.pinned ? '★ Pinned' : '—'}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: T.muted }}>
                        {formatDate(memory.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editingId === memory.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(memory.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: 'rgba(34,197,94,0.15)', color: T.green }}
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: 'rgba(90,90,114,0.2)', color: T.muted }}
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingId(memory.id);
                                setEditContent(memory.content);
                                setEditImportance(memory.importance_score);
                              }}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: 'rgba(79,110,247,0.1)', color: T.blue }}
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTogglePin(memory)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: 'rgba(252,200,36,0.1)', color: T.amber }}
                              title={memory.pinned ? 'Unpin' : 'Pin'}
                            >
                              {memory.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDelete(memory.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ background: 'rgba(248,113,113,0.1)', color: T.red }}
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {filteredMemories.length > 0 && (
            <div className="px-4 py-3 text-xs" style={{ color: T.dim, borderTop: `1px solid ${T.border}` }}>
              Showing {filteredMemories.length} of {memories.length} memories
            </div>
          )}
        </div>
      )}

      {/* Empty state when no user selected */}
      {!selectedUser && !loading && (
        <div
          className="text-center py-20 rounded-2xl"
          style={{ border: `1px dashed ${T.border}` }}
        >
          <Brain className="w-12 h-12 mx-auto mb-4" style={{ color: T.dim }} />
          <p className="text-base font-medium" style={{ color: T.muted }}>Search for a user above to explore their memory profile.</p>
        </div>
      )}
    </div>
  );
}

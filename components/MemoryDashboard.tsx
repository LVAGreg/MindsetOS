'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Brain, Activity, Database, Clock, TrendingUp, MessageSquare, DollarSign, User, Users, RefreshCw, Trash2, Edit2, Pin, PinOff, Save, X, Sparkles, Filter, Trophy } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';

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

interface Memory {
  id: string;
  content: string;
  memory_type: string;
  importance_score: number;
  created_at: string;
  last_accessed_at: string;
  source?: string; // 'user' or 'ai'
  pinned?: boolean;
}

interface ActivityLog {
  id: string;
  memory_id: string;
  user_id: string;
  action: string;
  old_content?: string;
  new_content?: string;
  old_importance?: number;
  new_importance?: number;
  reason?: string;
  created_at: string;
  current_content?: string;
  status?: string;
}

export default function MemoryDashboard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUserStats, setShowUserStats] = useState(true);
  const [showMemories, setShowMemories] = useState(true);
  const [showConversation, setShowConversation] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  // Memory editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImportance, setEditImportance] = useState(0.5);

  // Filtering state
  const [sourceFilter, setSourceFilter] = useState<'all' | 'user' | 'ai'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { user, currentConversationId, conversations, currentAgent } = useAppStore();

  // Fetch database user ID when component mounts or user changes
  useEffect(() => {
    const fetchDbUserId = async () => {
      if (!user?.email) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/user/by-email/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setDbUserId(data.id);
        } else if (res.status === 404) {
          // User not in database yet - create them
          console.log('Creating database user for:', user.email);
          const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/consultants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              firstName: user.firstName || 'User',
              lastName: user.lastName || ''
            })
          });
          if (createRes.ok) {
            const newUser = await createRes.json();
            setDbUserId(newUser.id);
            console.log('✅ Database user created:', newUser.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch database user ID:', error);
      }
    };

    fetchDbUserId();
  }, [user?.email]);

  // Fetch memory data when dashboard opens and dbUserId is available
  useEffect(() => {
    if (isExpanded && dbUserId) {
      fetchMemoryData();
      fetchActivityLog();
    }
  }, [isExpanded, dbUserId]);

  const fetchMemoryData = async () => {
    if (!dbUserId) return;

    setIsLoading(true);
    try {
      // Fetch user stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/stats/${dbUserId}`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setMemoryStats(stats);
      }

      // Fetch memory context
      const memoryRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/context/${dbUserId}`);
      if (memoryRes.ok) {
        const memoryData = await memoryRes.json();
        setMemories(memoryData);
      }
    } catch (error) {
      console.error('Failed to fetch memory data:', error);
      setError('Failed to load memory data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    if (!dbUserId) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/history/${dbUserId}?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setActivityLog(data);
      }
    } catch (error) {
      console.error('Failed to fetch activity log:', error);
      setError('Failed to load activity log.');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return '🟢';
      case 'updated': return '📝';
      case 'merged': return '🔄';
      case 'archived': return '📦';
      case 'reactivated': return '✨';
      case 'boosted': return '⬆️';
      case 'decayed': return '⬇️';
      default: return '•';
    }
  };

  const getActionStyle = (action: string): { background: string; borderColor: string } => {
    switch (action) {
      case 'created':     return { background: 'rgba(34,197,94,0.1)',   borderColor: 'rgba(34,197,94,0.3)' };
      case 'updated':     return { background: 'rgba(79,110,247,0.1)',  borderColor: 'rgba(79,110,247,0.3)' };
      case 'merged':      return { background: 'rgba(124,91,246,0.1)',  borderColor: 'rgba(124,91,246,0.3)' };
      case 'archived':    return { background: 'rgba(90,90,114,0.15)', borderColor: 'rgba(90,90,114,0.3)' };
      case 'reactivated': return { background: 'rgba(252,200,36,0.1)', borderColor: 'rgba(252,200,36,0.3)' };
      case 'boosted':     return { background: 'rgba(252,200,36,0.12)',borderColor: 'rgba(252,200,36,0.35)' };
      default:            return { background: 'rgba(90,90,114,0.15)', borderColor: 'rgba(90,90,114,0.3)' };
    }
  };

  const currentConv = currentConversationId ? conversations[currentConversationId] : null;
  const messageCount = currentConv?.history?.messages ? Object.keys(currentConv.history.messages).length : 0;

  // Separate user and assistant messages for accurate token/cost calculation
  const allMessages = currentConv?.history?.messages ? Object.values(currentConv.history.messages) : [];
  const userMessages = allMessages.filter(m => m.role === 'user');
  const assistantMessages = allMessages.filter(m => m.role === 'assistant');

  const userChars = userMessages.reduce((sum, msg) => sum + msg.content.length, 0);
  const assistantChars = assistantMessages.reduce((sum, msg) => sum + msg.content.length, 0);

  // Estimate tokens (1 token ≈ 4 characters)
  const inputTokens = Math.ceil(userChars / 4);
  const outputTokens = Math.ceil(assistantChars / 4);
  const totalTokens = inputTokens + outputTokens;

  // Cost calculation (GPT-4o via OpenRouter: $2.50/1M input, $10/1M output)
  const inputCost = (inputTokens * 2.50) / 1000000;
  const outputCost = (outputTokens * 10) / 1000000;
  const totalCost = inputCost + outputCost;

  // Context window (200K for Claude Sonnet 4.5, but show as percentage of active conversation)
  const contextWindowSize = 200000;
  const contextUsage = (totalTokens / contextWindowSize) * 100;

  const formatCost = (cost: number) => {
    if (cost < 0.0001) return `${(cost * 100000).toFixed(3)}µ¢`;
    if (cost < 0.01) return `${(cost * 100).toFixed(3)}¢`;
    return `$${cost.toFixed(4)}`;
  };
  const formatNumber = (num: number) => num >= 1000 ? `${(num / 1000).toFixed(1)}K` : num.toString();

  // Memory CRUD operations
  const handleDelete = async (memoryId: string) => {
    if (!confirm('Delete this memory? This action cannot be undone.')) return;

    setIsDeleting(memoryId);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/${memoryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setMemories(memories.filter(m => m.id !== memoryId));
      fetchMemoryData();
      fetchActivityLog();
    } catch (error) {
      console.error('Failed to delete memory:', error);
      setError('Failed to delete memory. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditStart = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditImportance(memory.importance_score);
  };

  const handleEditSave = async (memoryId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, importance_score: editImportance })
      });
      const data = await res.json();

      if (data.success) {
        setMemories(memories.map(m => m.id === memoryId ? data.memory : m));
        setEditingId(null);
        fetchActivityLog();
      } else {
        setError('Failed to save memory. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update memory:', error);
      setError('Failed to save memory. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePin = async (memory: Memory) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/${memory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !memory.pinned })
      });
      const data = await res.json();

      if (data.success) {
        setMemories(memories.map(m => m.id === memory.id ? data.memory : m));
        fetchActivityLog();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      setError('Failed to update pin. Please try again.');
    }
  };

  const handleOptimizeMemory = async () => {
    if (!dbUserId) return;

    if (!confirm('Optimize memory? This will:\n- Merge duplicate memories\n- Archive low-importance memories (<30%)\n\nThis action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/optimize/${dbUserId}`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchMemoryData();
        fetchActivityLog();
      }
    } catch (error) {
      console.error('Failed to optimize memory:', error);
      setError('Failed to optimize memory. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter memories based on source and type (user or ai)
  const filteredMemories = memories.filter(memory => {
    const sourceMatch = sourceFilter === 'all' || memory.source === sourceFilter;
    const typeMatch = typeFilter === 'all' || memory.memory_type === typeFilter;
    return sourceMatch && typeMatch;
  });

  // Get unique memory types for filter dropdown
  const uniqueTypes = Array.from(new Set(memories.map(m => m.memory_type))).sort();

  // Count memories by source
  const userCount = memories.filter(m => m.source === 'user').length;
  const aiCount = memories.filter(m => m.source === 'ai').length;

  // Shared style helpers
  const sectionHeaderStyle: { background: string; border: string; cursor: string; color: string; width: string } = {
    background: 'rgba(255,255,255,0.03)',
    border: 'none',
    cursor: 'pointer',
    color: '#ededf5',
    width: '100%',
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        background: 'rgba(18,18,31,0.97)',
        borderLeft: '1px solid #1e1e30',
        transition: 'width 0.3s',
        zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        width: isExpanded ? '24rem' : '0',
        overflow: 'hidden',
      }}
    >
      {/* Toggle tab */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? 'Close analytics panel' : 'Open analytics panel'}
        style={{
          position: 'absolute',
          left: 0,
          top: '6rem',
          transform: 'translateX(-100%)',
          background: '#4f6ef7',
          color: '#ededf5',
          borderRadius: '0.5rem 0 0 0.5rem',
          padding: '0.75rem',
          boxShadow: '-2px 2px 8px rgba(0,0,0,0.4)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {isExpanded ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Brain className="w-5 h-5" />
            <span className="text-xs font-medium">Analytics</span>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="h-full flex flex-col overflow-hidden">
          {/* User header */}
          {user && (
            <div
              style={{
                padding: '1rem',
                background: 'linear-gradient(90deg, #4f6ef7 0%, #7c5bf6 100%)',
                color: '#ededf5',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{user.email}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                    {currentAgent && MINDSET_AGENTS[currentAgent]
                      ? MINDSET_AGENTS[currentAgent].icon + ' ' + MINDSET_AGENTS[currentAgent].name
                      : 'No agent'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(239,68,68,0.15)',
                borderBottom: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fca5a5',
                  padding: '0.125rem',
                  flexShrink: 0,
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Controls header */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #1e1e30' }}>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-lg font-semibold flex items-center gap-2"
                style={{ color: '#ededf5' }}
              >
                <Brain className="w-5 h-5" style={{ color: '#4f6ef7' }} />
                Analytics Dashboard
              </h2>
              <button
                onClick={() => { fetchMemoryData(); fetchActivityLog(); }}
                disabled={isLoading || !dbUserId}
                aria-label="Refresh memory data"
                title="Refresh memory data"
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: isLoading || !dbUserId ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !dbUserId ? 0.4 : 1,
                  color: '#9090a8',
                }}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
              onClick={handleOptimizeMemory}
              disabled={!dbUserId || memories.length === 0 || isLoading}
              title="Merge duplicates and archive low-importance memories"
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: '0.5rem 0.75rem',
                background:
                  !dbUserId || memories.length === 0 || isLoading
                    ? '#2a2a3d'
                    : 'linear-gradient(90deg, #4f6ef7 0%, #7c5bf6 100%)',
                color:
                  !dbUserId || memories.length === 0 || isLoading ? '#5a5a72' : '#ededf5',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor:
                  !dbUserId || memories.length === 0 || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Optimize Memory
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── User Stats Panel ── */}
            <div style={{ borderBottom: '1px solid #1e1e30' }}>
              <button
                onClick={() => setShowUserStats(!showUserStats)}
                className="flex items-center justify-between p-3"
                style={sectionHeaderStyle}
              >
                <div className="flex items-center gap-2">
                  {showUserStats ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <TrendingUp className="w-4 h-4" style={{ color: '#4f6ef7' }} />
                  <span className="font-medium text-sm">User Stats</span>
                </div>
              </button>

              {showUserStats && memoryStats && (
                <div className="p-3">
                  <div
                    style={{
                      background: 'rgba(79,110,247,0.08)',
                      border: '1px solid rgba(79,110,247,0.2)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div style={{ color: '#9090a8', marginBottom: '0.25rem' }}>Conversations</div>
                        <div className="text-xl font-bold" style={{ color: '#4f6ef7' }}>
                          {memoryStats.conversations.total}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9090a8', marginBottom: '0.25rem' }}>Agents Used</div>
                        <div className="text-xl font-bold" style={{ color: '#7c5bf6' }}>
                          {memoryStats.conversations.agents_used}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9090a8', marginBottom: '0.25rem' }}>Messages</div>
                        <div className="text-xl font-bold" style={{ color: '#34d399' }}>
                          {memoryStats.conversations.total_messages}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#9090a8', marginBottom: '0.25rem' }}>Memories</div>
                        <div className="text-xl font-bold" style={{ color: '#fcc824' }}>
                          {memoryStats.memories.total}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e1e30' }}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: '#9090a8' }}>Total Tokens:</span>
                        <span className="font-semibold" style={{ color: '#ededf5' }}>
                          {formatNumber(memoryStats.usage.estimated_tokens)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: '#9090a8' }}>Total Cost:</span>
                        <span className="font-semibold" style={{ color: '#34d399' }}>
                          ${memoryStats.usage.estimated_cost}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Memory Context Panel ── */}
            <div style={{ borderBottom: '1px solid #1e1e30' }}>
              <button
                onClick={() => setShowMemories(!showMemories)}
                className="flex items-center justify-between p-3"
                style={sectionHeaderStyle}
              >
                <div className="flex items-center gap-2">
                  {showMemories ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Database className="w-4 h-4" style={{ color: '#7c5bf6' }} />
                  <span className="font-medium text-sm">
                    Memory Context ({filteredMemories.length}/{memories.length})
                  </span>
                </div>
              </button>

              {showMemories && (
                <>
                  {/* Filter Controls */}
                  <div className="p-3 space-y-2" style={{ borderBottom: '1px solid #1e1e30' }}>
                    {/* Source Filter — flex-wrap so buttons don't overflow on narrow panel */}
                    <div className="flex gap-1 flex-wrap">
                      {(['all', 'user', 'ai'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setSourceFilter(f)}
                          style={{
                            flex: 1,
                            padding: '0.375rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            background: sourceFilter === f ? '#fcc824' : 'rgba(255,255,255,0.06)',
                            color: sourceFilter === f ? '#09090f' : '#9090a8',
                            minWidth: '3.5rem',
                          }}
                        >
                          {f === 'all' && `All (${memories.length})`}
                          {f === 'user' && `👤 User (${userCount})`}
                          {f === 'ai' && `🤖 AI (${aiCount})`}
                        </button>
                      ))}
                    </div>

                    {/* Type Filter Dropdown */}
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.375rem 0.5rem',
                        fontSize: '0.75rem',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid #1e1e30',
                        borderRadius: '0.375rem',
                        color: '#9090a8',
                      }}
                    >
                      <option value="all">All Types</option>
                      {uniqueTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    {/* Clear Filters */}
                    {(sourceFilter !== 'all' || typeFilter !== 'all') && (
                      <button
                        onClick={() => { setSourceFilter('all'); setTypeFilter('all'); }}
                        style={{
                          width: '100%',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          color: '#9090a8',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Memory List */}
                  <div
                    className="p-3 space-y-2"
                    style={{ maxHeight: '16rem', overflowY: 'auto' }}
                  >
                    {filteredMemories.length === 0 ? (
                      <div
                        className="text-xs text-center py-4"
                        style={{ color: '#5a5a72' }}
                      >
                        {memories.length === 0
                          ? 'No memories stored yet. Have conversations to build memory.'
                          : 'No memories match the selected filters.'}
                      </div>
                    ) : (
                      filteredMemories.map((memory) => (
                        <div
                          key={memory.id}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid',
                            ...(memory.pinned
                              ? { background: 'rgba(252,200,36,0.08)', borderColor: 'rgba(252,200,36,0.35)' }
                              : { background: 'rgba(124,91,246,0.07)', borderColor: 'rgba(124,91,246,0.25)' }),
                          }}
                        >
                          {editingId === memory.id ? (
                            /* Edit mode */
                            <div className="space-y-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                                style={{
                                  width: '100%',
                                  fontSize: '0.75rem',
                                  padding: '0.5rem',
                                  border: '1px solid #1e1e30',
                                  borderRadius: '0.375rem',
                                  background: 'rgba(255,255,255,0.05)',
                                  color: '#ededf5',
                                  resize: 'vertical',
                                  boxSizing: 'border-box',
                                }}
                              />
                              <div className="flex items-center gap-2">
                                <label style={{ fontSize: '0.75rem', color: '#9090a8', flexShrink: 0 }}>
                                  Importance:
                                </label>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={editImportance}
                                  onChange={(e) => setEditImportance(parseFloat(e.target.value))}
                                  className="flex-1"
                                />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ededf5', flexShrink: 0 }}>
                                  {(editImportance * 100).toFixed(0)}%
                                </span>
                              </div>
                              {/* Edit action buttons — flex-wrap for mobile */}
                              <div className="flex gap-1 flex-wrap">
                                <button
                                  onClick={() => handleEditSave(memory.id)}
                                  disabled={isSaving}
                                  className="flex-1 flex items-center justify-center gap-1"
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: isSaving ? '#2a2a3d' : '#34d399',
                                    color: isSaving ? '#5a5a72' : '#09090f',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    borderRadius: '0.25rem',
                                    border: 'none',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    minWidth: '4rem',
                                  }}
                                >
                                  {isSaving
                                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                                    : <Save className="w-3 h-3" />}
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  disabled={isSaving}
                                  className="flex-1 flex items-center justify-center gap-1"
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: '#9090a8',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    borderRadius: '0.25rem',
                                    border: 'none',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    minWidth: '4rem',
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* View mode */
                            <>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <div
                                  className="flex-1 flex items-start gap-2"
                                  style={{ fontSize: '0.75rem', color: '#ededf5' }}
                                >
                                  {memory.source === 'user' ? (
                                    <span
                                      style={{ color: '#4f6ef7', flexShrink: 0 }}
                                      title="User-provided information"
                                    >
                                      👤
                                    </span>
                                  ) : (
                                    <span
                                      style={{ color: '#7c5bf6', flexShrink: 0 }}
                                      title="AI-extracted insight"
                                    >
                                      🤖
                                    </span>
                                  )}
                                  <span className="flex-1">{memory.content}</span>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleTogglePin(memory)}
                                    aria-label={memory.pinned ? 'Unpin memory' : 'Pin memory (prevent decay)'}
                                    title={memory.pinned ? 'Unpin' : 'Pin (prevent decay)'}
                                    style={{
                                      padding: '0.25rem',
                                      background: 'none',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      cursor: 'pointer',
                                      color: memory.pinned ? '#fcc824' : '#5a5a72',
                                    }}
                                  >
                                    {memory.pinned
                                      ? <Pin className="w-3 h-3" />
                                      : <PinOff className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => handleEditStart(memory)}
                                    aria-label="Edit memory"
                                    title="Edit"
                                    style={{
                                      padding: '0.25rem',
                                      background: 'none',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      cursor: 'pointer',
                                      color: '#9090a8',
                                    }}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(memory.id)}
                                    disabled={isDeleting === memory.id}
                                    aria-label="Delete memory"
                                    title="Delete"
                                    style={{
                                      padding: '0.25rem',
                                      background: 'none',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      cursor: isDeleting === memory.id ? 'not-allowed' : 'pointer',
                                      opacity: isDeleting === memory.id ? 0.5 : 1,
                                      color: '#f87171',
                                    }}
                                  >
                                    {isDeleting === memory.id
                                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                                      : <Trash2 className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span style={{ color: '#7c5bf6', fontWeight: 500 }}>
                                  {memory.memory_type}
                                </span>
                                <span style={{ color: '#5a5a72' }}>
                                  {(memory.importance_score * 100).toFixed(0)}% important
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Current Conversation Stats Panel ── */}
            <div style={{ borderBottom: '1px solid #1e1e30' }}>
              <button
                onClick={() => setShowConversation(!showConversation)}
                className="flex items-center justify-between p-3"
                style={sectionHeaderStyle}
              >
                <div className="flex items-center gap-2">
                  {showConversation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <MessageSquare className="w-4 h-4" style={{ color: '#34d399' }} />
                  <span className="font-medium text-sm">Current Conversation</span>
                </div>
              </button>

              {showConversation && currentConv && (
                <div className="p-3">
                  <div
                    style={{
                      background: 'rgba(52,211,153,0.06)',
                      border: '1px solid rgba(52,211,153,0.2)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                    }}
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: '#9090a8' }}>Messages:</span>
                        <span className="font-semibold" style={{ color: '#ededf5' }}>{messageCount}</span>
                      </div>

                      {/* Token breakdown */}
                      <div className="pt-2" style={{ borderTop: '1px solid #1e1e30' }}>
                        <div className="flex justify-between mb-1">
                          <span style={{ color: '#9090a8' }}>Tokens In:</span>
                          <span className="font-semibold" style={{ color: '#4f6ef7' }}>
                            {formatNumber(inputTokens)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: '#9090a8' }}>Tokens Out:</span>
                          <span className="font-semibold" style={{ color: '#7c5bf6' }}>
                            {formatNumber(outputTokens)}
                          </span>
                        </div>
                      </div>

                      {/* Cost breakdown */}
                      <div className="pt-2" style={{ borderTop: '1px solid #1e1e30' }}>
                        <div className="flex justify-between mb-1">
                          <span style={{ color: '#9090a8' }}>Cost In:</span>
                          <span className="font-semibold" style={{ color: '#4f6ef7' }}>
                            {formatCost(inputCost)}
                          </span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span style={{ color: '#9090a8' }}>Cost Out:</span>
                          <span className="font-semibold" style={{ color: '#7c5bf6' }}>
                            {formatCost(outputCost)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span style={{ color: '#ededf5' }}>Total Cost:</span>
                          <span style={{ color: '#34d399' }}>{formatCost(totalCost)}</span>
                        </div>
                      </div>

                      {/* Context window */}
                      <div className="pt-2" style={{ borderTop: '1px solid #1e1e30' }}>
                        <div className="flex justify-between mb-1">
                          <span style={{ color: '#9090a8' }}>Context Window:</span>
                          <span className="font-semibold" style={{ color: '#ededf5' }}>
                            {contextUsage.toFixed(1)}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.07)',
                            borderRadius: '9999px',
                            height: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              height: '0.5rem',
                              borderRadius: '9999px',
                              width: `${Math.min(100, contextUsage)}%`,
                              background:
                                contextUsage < 50
                                  ? '#34d399'
                                  : contextUsage < 75
                                  ? '#fcc824'
                                  : '#f87171',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#5a5a72', marginTop: '0.25rem' }}>
                          {formatNumber(totalTokens)} / {formatNumber(contextWindowSize)} tokens
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Activity Log Panel ── */}
            <div style={{ borderBottom: '1px solid #1e1e30' }}>
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="flex items-center justify-between p-3"
                style={sectionHeaderStyle}
              >
                <div className="flex items-center gap-2">
                  {showActivity ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Activity className="w-4 h-4" style={{ color: '#fcc824' }} />
                  <span className="font-medium text-sm">Activity Log ({activityLog.length})</span>
                </div>
              </button>

              {showActivity && (
                <div
                  className="p-3 space-y-2"
                  style={{ maxHeight: '16rem', overflowY: 'auto' }}
                >
                  {activityLog.length === 0 ? (
                    <div className="text-xs text-center py-4" style={{ color: '#5a5a72' }}>
                      No activity logged yet.
                    </div>
                  ) : (
                    activityLog.map((activity) => (
                      <div
                        key={activity.id}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid',
                          ...getActionStyle(activity.action),
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{getActionIcon(activity.action)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <span
                                className="text-xs font-medium capitalize"
                                style={{ color: '#ededf5' }}
                              >
                                {activity.action}
                              </span>
                              <span className="text-xs" style={{ color: '#5a5a72' }}>
                                {formatTimestamp(activity.created_at)}
                              </span>
                            </div>
                            {activity.new_content && (
                              <div className="text-xs truncate mb-1" style={{ color: '#9090a8' }}>
                                {activity.new_content.slice(0, 60)}...
                              </div>
                            )}
                            {activity.new_importance !== undefined && activity.old_importance !== undefined && (
                              <div className="text-xs" style={{ color: '#9090a8' }}>
                                Importance: {(activity.old_importance * 100).toFixed(0)}% → {(activity.new_importance * 100).toFixed(0)}%
                              </div>
                            )}
                            {activity.reason && (
                              <div className="text-xs italic mt-1" style={{ color: '#5a5a72' }}>
                                {activity.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

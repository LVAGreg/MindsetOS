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

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'updated': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'merged': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'archived': return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
      case 'reactivated': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'boosted': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
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
  const contextWindowSize = 200000; // Claude Sonnet 4.5 context window
  const contextUsage = (totalTokens / contextWindowSize) * 100;

  const formatCost = (cost: number) => {
    if (cost < 0.0001) return `${(cost * 100000).toFixed(3)}µ¢`; // Micro-cents (very small)
    if (cost < 0.01) return `${(cost * 100).toFixed(3)}¢`; // Cents only
    return `$${cost.toFixed(4)}`; // Dollars
  };
  const formatNumber = (num: number) => num >= 1000 ? `${(num / 1000).toFixed(1)}K` : num.toString();

  // Memory CRUD operations
  const handleDelete = async (memoryId: string) => {
    if (!confirm('Delete this memory? This action cannot be undone.')) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/${memoryId}`, { method: 'DELETE' });
      setMemories(memories.filter(m => m.id !== memoryId));
      fetchMemoryData(); // Refresh stats
      fetchActivityLog(); // Refresh activity log
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const handleEditStart = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditImportance(memory.importance_score);
  };

  const handleEditSave = async (memoryId: string) => {
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
        fetchActivityLog(); // Refresh activity log
      }
    } catch (error) {
      console.error('Failed to update memory:', error);
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
        fetchActivityLog(); // Refresh activity log
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
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
      alert('Failed to optimize memory');
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

  return (
    <div className={`fixed right-0 top-0 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 shadow-xl ${
      isExpanded ? 'w-96' : 'w-0'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute left-0 top-24 -translate-x-full bg-blue-600 hover:bg-blue-700 text-white rounded-l-lg p-3 shadow-lg transition-colors"
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
          {user && (
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{user.email}</div>
                  <div className="text-xs opacity-90">
                    {currentAgent && MINDSET_AGENTS[currentAgent] ? MINDSET_AGENTS[currentAgent].icon + ' ' + MINDSET_AGENTS[currentAgent].name : 'No agent'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                Analytics Dashboard
              </h2>
              <button
                onClick={() => {
                  fetchMemoryData();
                  fetchActivityLog();
                }}
                disabled={isLoading || !dbUserId}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh memory data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
              onClick={handleOptimizeMemory}
              disabled={!dbUserId || memories.length === 0 || isLoading}
              className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              title="Merge duplicates and archive low-importance memories"
            >
              <Sparkles className="w-4 h-4" />
              Optimize Memory
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* User Stats Panel */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowUserStats(!showUserStats)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  {showUserStats ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">User Stats</span>
                </div>
              </button>

              {showUserStats && memoryStats && (
                <div className="p-3 space-y-3">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Conversations</div>
                        <div className="text-xl font-bold text-blue-600">{memoryStats.conversations.total}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Agents Used</div>
                        <div className="text-xl font-bold text-purple-600">{memoryStats.conversations.agents_used}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Messages</div>
                        <div className="text-xl font-bold text-green-600">{memoryStats.conversations.total_messages}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Memories</div>
                        <div className="text-xl font-bold text-orange-600">{memoryStats.memories.total}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Total Tokens:</span>
                        <span className="font-semibold">{formatNumber(memoryStats.usage.estimated_tokens)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                        <span className="font-semibold text-green-600">${memoryStats.usage.estimated_cost}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Memory Context Panel */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowMemories(!showMemories)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  {showMemories ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Database className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-sm">Memory Context ({filteredMemories.length}/{memories.length})</span>
                </div>
              </button>

              {showMemories && (
                <>
                  {/* Filter Controls */}
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
                    {/* Source Filter Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSourceFilter('all')}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                          sourceFilter === 'all'
                            ? 'bg-[#ffc82c] text-black'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        All ({memories.length})
                      </button>
                      <button
                        onClick={() => setSourceFilter('user')}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                          sourceFilter === 'user'
                            ? 'bg-[#ffc82c] text-black'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        👤 User ({userCount})
                      </button>
                      <button
                        onClick={() => setSourceFilter('ai')}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                          sourceFilter === 'ai'
                            ? 'bg-[#ffc82c] text-black'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        🤖 AI ({aiCount})
                      </button>
                    </div>

                    {/* Type Filter Dropdown */}
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                    >
                      <option value="all">All Types</option>
                      {uniqueTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    {/* Clear Filters Button */}
                    {(sourceFilter !== 'all' || typeFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSourceFilter('all');
                          setTypeFilter('all');
                        }}
                        className="w-full px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Memory List */}
                  <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                  {filteredMemories.length === 0 ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                      {memories.length === 0
                        ? 'No memories stored yet. Have conversations to build memory.'
                        : 'No memories match the selected filters.'}
                    </div>
                  ) : (
                    filteredMemories.map((memory) => (
                      <div
                        key={memory.id}
                        className={`p-2 rounded border ${memory.pinned ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'}`}
                      >
                        {editingId === memory.id ? (
                          // Edit mode
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full text-xs p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                              rows={3}
                            />
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400">Importance:</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={editImportance}
                                onChange={(e) => setEditImportance(parseFloat(e.target.value))}
                                className="flex-1"
                              />
                              <span className="text-xs font-medium">{(editImportance * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditSave(memory.id)}
                                className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                <Save className="w-3 h-3 inline mr-1" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="flex-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                              >
                                <X className="w-3 h-3 inline mr-1" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <>
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <div className="text-xs text-gray-900 dark:text-gray-100 flex-1 flex items-start gap-2">
                                {memory.source === 'user' ? (
                                  <span className="text-blue-600 dark:text-blue-400 flex-shrink-0" title="User-provided information">👤</span>
                                ) : (
                                  <span className="text-purple-600 dark:text-purple-400 flex-shrink-0" title="AI-extracted insight">🤖</span>
                                )}
                                <span className="flex-1">{memory.content}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleTogglePin(memory)}
                                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded"
                                  title={memory.pinned ? 'Unpin' : 'Pin (prevent decay)'}
                                >
                                  {memory.pinned ? <Pin className="w-3 h-3 text-yellow-600" /> : <PinOff className="w-3 h-3 text-gray-400" />}
                                </button>
                                <button
                                  onClick={() => handleEditStart(memory)}
                                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(memory.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                {memory.memory_type}
                              </span>
                              <span className="text-gray-500">
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

            {/* Current Conversation Stats Panel */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowConversation(!showConversation)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  {showConversation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <MessageSquare className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">Current Conversation</span>
                </div>
              </button>

              {showConversation && currentConv && (
                <div className="p-3 space-y-3">
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded-lg">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                        <span className="font-semibold">{messageCount}</span>
                      </div>

                      {/* Token breakdown */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Tokens In:</span>
                          <span className="font-semibold text-blue-600">{formatNumber(inputTokens)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Tokens Out:</span>
                          <span className="font-semibold text-purple-600">{formatNumber(outputTokens)}</span>
                        </div>
                      </div>

                      {/* Cost breakdown */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Cost In:</span>
                          <span className="font-semibold text-blue-600">{formatCost(inputCost)}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Cost Out:</span>
                          <span className="font-semibold text-purple-600">{formatCost(outputCost)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-gray-700 dark:text-gray-300">Total Cost:</span>
                          <span className="text-green-600">{formatCost(totalCost)}</span>
                        </div>
                      </div>

                      {/* Context window */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Context Window:</span>
                          <span className="font-semibold">{contextUsage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${contextUsage < 50 ? 'bg-green-500' : contextUsage < 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, contextUsage)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{formatNumber(totalTokens)} / {formatNumber(contextWindowSize)} tokens</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Log Panel */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  {showActivity ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-sm">Activity Log ({activityLog.length})</span>
                </div>
              </button>

              {showActivity && (
                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                  {activityLog.length === 0 ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                      No activity logged yet.
                    </div>
                  ) : (
                    activityLog.map((activity) => (
                      <div
                        key={activity.id}
                        className={`p-2 rounded border ${getActionColor(activity.action)}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{getActionIcon(activity.action)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <span className="text-xs font-medium capitalize">{activity.action}</span>
                              <span className="text-xs text-gray-500">{formatTimestamp(activity.created_at)}</span>
                            </div>
                            {activity.new_content && (
                              <div className="text-xs text-gray-700 dark:text-gray-300 truncate mb-1">
                                {activity.new_content.slice(0, 60)}...
                              </div>
                            )}
                            {activity.new_importance !== undefined && activity.old_importance !== undefined && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Importance: {(activity.old_importance * 100).toFixed(0)}% → {(activity.new_importance * 100).toFixed(0)}%
                              </div>
                            )}
                            {activity.reason && (
                              <div className="text-xs text-gray-500 italic mt-1">
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

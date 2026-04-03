'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Download, Calendar, User as UserIcon, Sparkles, TrendingUp, ArrowLeft, Filter, Copy, MessageSquare, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';

interface Asset {
  id: string;
  content: string;
  source: 'user' | 'ai';
  importance_score: number;
  created_at: string;
  agent_id?: string;
  memory_type: string;
}

export default function AssetsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppStore();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'importance' | 'agent'>('recent');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [continuingId, setContinuingId] = useState<string | null>(null);
  const [continueError, setContinueError] = useState<string | null>(null);

  // Fetch database user ID
  useEffect(() => {
    const fetchDbUserId = async () => {
      if (!user?.email) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/user/by-email/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setDbUserId(data.id);
        } else {
          setFetchError('Failed to load user profile. Please refresh.');
        }
      } catch (error) {
        console.error('Failed to fetch database user ID:', error);
        setFetchError('Could not connect to server. Please check your connection and refresh.');
      }
    };

    fetchDbUserId();
  }, [user?.email]);

  // Fetch assets
  useEffect(() => {
    const fetchAssets = async () => {
      if (!dbUserId) return;

      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memories/assets/${dbUserId}`);
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        } else {
          setFetchError('Failed to load assets. Please try refreshing.');
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error);
        setFetchError('Could not load assets. Please check your connection and refresh.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [dbUserId]);

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => agentFilter === 'all' || asset.agent_id === agentFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'importance':
          return b.importance_score - a.importance_score;
        case 'agent':
          return (a.agent_id || '').localeCompare(b.agent_id || '');
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Get unique agents
  const uniqueAgents = Array.from(new Set(assets.map(o => o.agent_id).filter(Boolean)));

  // Format date
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export assets as JSON
  const handleExportJSON = () => {
    const data = JSON.stringify(filteredAssets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export assets as CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Content', 'Source', 'Importance', 'Agent'];
    const rows = filteredAssets.map(o => [
      formatDate(o.created_at),
      `"${o.content.replace(/"/g, '""')}"`,
      o.source,
      `${(o.importance_score * 100).toFixed(0)}%`,
      o.agent_id || 'N/A'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy asset to clipboard
  const handleCopy = async (asset: Asset) => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(asset.content);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopyError('Failed to copy to clipboard. Please select and copy the text manually.');
      setTimeout(() => setCopyError(null), 4000);
    }
  };

  // Continue working on an asset - create new conversation with context
  const handleContinue = async (asset: Asset) => {
    if (!dbUserId || continuingId) return;

    setContinueError(null);
    setContinuingId(asset.id);
    try {
      // Create new conversation
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: dbUserId,
          agentId: asset.agent_id || 'mindset-score',
          title: `Continue: ${asset.content.substring(0, 50)}...`
        })
      });

      if (!res.ok) throw new Error('Failed to create conversation');

      const { id: conversationId } = await res.json();

      // Add initial message with asset context
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          role: 'user',
          content: `I want to continue working on this asset:\n\n${asset.content}\n\nCan you help me refine or build on this?`
        })
      });

      // Navigate to dashboard with the new conversation
      router.push(`/dashboard?conversation=${conversationId}`);
    } catch (error) {
      console.error('Failed to continue conversation:', error);
      setContinueError('Failed to start conversation. Please try again.');
      setTimeout(() => setContinueError(null), 4000);
    } finally {
      setContinuingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#4f6ef7', borderTopColor: 'transparent' }}></div>
          <p style={{ color: '#9090a8' }}>Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      {/* Copy Error Banner */}
      {copyError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {copyError}
        </div>
      )}

      {/* Continue Error Banner */}
      {continueError && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {continueError}
        </div>
      )}

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'rgba(18,18,31,0.8)', borderBottom: '1px solid #1e1e30' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                aria-label="Back to Dashboard"
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8" style={{ color: '#fcc824' }} />
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Assets &amp; Deliverables</h1>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Track things agents helped you create and generate</p>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 rounded-lg transition-opacity flex items-center gap-2 text-sm font-medium hover:opacity-90"
                style={{ background: '#4f6ef7', color: '#ffffff' }}
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg transition-opacity flex items-center gap-2 text-sm font-medium hover:opacity-90"
                style={{ background: '#7c5bf6', color: '#ffffff' }}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)' }}>
              <div className="text-sm mb-1" style={{ color: '#9090a8' }}>Total Assets</div>
              <div className="text-2xl font-bold" style={{ color: '#4f6ef7' }}>{assets.length}</div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(124,91,246,0.12)', border: '1px solid rgba(124,91,246,0.25)' }}>
              <div className="text-sm mb-1" style={{ color: '#9090a8' }}>User Provided</div>
              <div className="text-2xl font-bold" style={{ color: '#7c5bf6' }}>{assets.filter(o => o.source === 'user').length}</div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(252,200,36,0.10)', border: '1px solid rgba(252,200,36,0.25)' }}>
              <div className="text-sm mb-1" style={{ color: '#9090a8' }}>AI Extracted</div>
              <div className="text-2xl font-bold" style={{ color: '#fcc824' }}>{assets.filter(o => o.source === 'ai').length}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#9090a8' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'importance' | 'agent')}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
              >
                <option value="recent">Most Recent</option>
                <option value="importance">Highest Importance</option>
                <option value="agent">By Agent</option>
              </select>
            </div>

            {/* Agent Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: '#9090a8' }} />
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
              >
                <option value="all">All Agents</option>
                {uniqueAgents.map(agentId => (
                  <option key={agentId} value={agentId}>
                    {MINDSET_AGENTS[agentId as keyof typeof MINDSET_AGENTS]?.name || agentId}
                  </option>
                ))}
              </select>
            </div>

            {/* Showing count */}
            <div className="flex items-center gap-2 text-sm ml-auto" style={{ color: '#9090a8' }}>
              Showing {filteredAssets.length} of {assets.length} assets
            </div>
          </div>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: '#5a5a72' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#ededf5' }}>No Assets Yet</h3>
            <p style={{ color: '#9090a8' }}>
              {assets.length === 0
                ? 'Start conversations to capture assets and deliverables agents help you create.'
                : 'No assets match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
              const agent = asset.agent_id ? MINDSET_AGENTS[asset.agent_id as keyof typeof MINDSET_AGENTS] : null;

              return (
                <div
                  key={asset.id}
                  className="rounded-lg p-6 transition-shadow hover:shadow-xl"
                  style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {asset.source === 'user' ? (
                        <div title="User-provided">
                          <UserIcon className="w-6 h-6" style={{ color: '#9090a8' }} />
                        </div>
                      ) : (
                        <div title="AI-extracted">
                          <Sparkles className="w-6 h-6" style={{ color: '#7c5bf6' }} />
                        </div>
                      )}
                      {agent && (
                        <AgentIcon agentId={agent.id} className="w-5 h-5" style={{ color: '#9090a8' }} />
                      )}
                    </div>

                    {/* Importance Badge */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Sparkles
                          key={i}
                          className="w-3 h-3"
                          style={{
                            color: i < Math.round(asset.importance_score * 5) ? '#fcc824' : '#5a5a72',
                            fill: i < Math.round(asset.importance_score * 5) ? '#fcc824' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="mb-4 leading-relaxed" style={{ color: '#ededf5' }}>
                    {asset.content}
                  </p>

                  {/* Footer with Date/Importance */}
                  <div className="flex items-center justify-between text-xs pt-4 mb-3" style={{ borderTop: '1px solid #1e1e30', color: '#5a5a72' }}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(asset.created_at)}
                    </div>
                    <div className="font-medium" style={{ color: '#fcc824' }}>
                      {(asset.importance_score * 100).toFixed(0)}% important
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCopy(asset)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-opacity text-sm font-medium hover:opacity-80"
                      style={{ background: 'rgba(79,110,247,0.15)', color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.3)' }}
                      aria-label="Copy to clipboard"
                    >
                      {copiedId === asset.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleContinue(asset)}
                      disabled={continuingId === asset.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-opacity text-sm font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(124,91,246,0.15)', color: '#7c5bf6', border: '1px solid rgba(124,91,246,0.3)' }}
                      aria-label="Continue working on this asset"
                    >
                      {continuingId === asset.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          Continue
                        </>
                      )}
                    </button>
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

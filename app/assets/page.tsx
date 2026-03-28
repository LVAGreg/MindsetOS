'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Download, Calendar, User as UserIcon, Sparkles, TrendingUp, ArrowLeft, Filter, Copy, MessageSquare, Check } from 'lucide-react';
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
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'importance' | 'agent'>('recent');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch database user ID
  useEffect(() => {
    const fetchDbUserId = async () => {
      if (!user?.email) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/user/by-email/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setDbUserId(data.id);
        }
      } catch (error) {
        console.error('Failed to fetch database user ID:', error);
      }
    };

    fetchDbUserId();
  }, [user?.email]);

  // Fetch assets
  useEffect(() => {
    const fetchAssets = async () => {
      if (!dbUserId) return;

      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memories/assets/${dbUserId}`);
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error);
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
    try {
      await navigator.clipboard.writeText(asset.content);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Continue working on an asset - create new conversation with context
  const handleContinue = async (asset: Asset) => {
    if (!dbUserId) return;

    try {
      // Create new conversation
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: dbUserId,
          agentId: asset.agent_id || 'money-model-maker',
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
      alert('Failed to start conversation. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-[#ffc82c]" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assets & Deliverables</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Track things agents helped you create and generate</p>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Assets</div>
              <div className="text-2xl font-bold text-blue-600">{assets.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">User Provided</div>
              <div className="text-2xl font-bold text-green-600">{assets.filter(o => o.source === 'user').length}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">AI Extracted</div>
              <div className="text-2xl font-bold text-purple-600">{assets.filter(o => o.source === 'ai').length}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="recent">Most Recent</option>
                <option value="importance">Highest Importance</option>
                <option value="agent">By Agent</option>
              </select>
            </div>

            {/* Agent Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
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
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 ml-auto">
              Showing {filteredAssets.length} of {assets.length} assets
            </div>
          </div>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Assets Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
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
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {asset.source === 'user' ? (
                        <div title="User-provided">
                          <UserIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                      ) : (
                        <div title="AI-extracted">
                          <Sparkles className="w-6 h-6 text-purple-500" />
                        </div>
                      )}
                      {agent && (
                        <AgentIcon agentId={agent.id} className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      )}
                    </div>

                    {/* Importance Badge */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Sparkles
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.round(asset.importance_score * 5)
                              ? 'text-[#ffc82c] fill-[#ffc82c]'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-gray-900 dark:text-white mb-4 leading-relaxed">
                    {asset.content}
                  </p>

                  {/* Footer with Date/Importance */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(asset.created_at)}
                    </div>
                    <div className="font-medium text-[#ffc82c]">
                      {(asset.importance_score * 100).toFixed(0)}% important
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(asset)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors text-sm font-medium"
                      title="Copy to clipboard"
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
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg transition-colors text-sm font-medium"
                      title="Continue working on this asset"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Continue
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

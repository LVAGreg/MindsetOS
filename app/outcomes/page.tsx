'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Download, Calendar, User as UserIcon, Sparkles, TrendingUp, ArrowLeft, Filter } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';

interface Outcome {
  id: string;
  content: string;
  source: 'user' | 'ai';
  importance_score: number;
  created_at: string;
  agent_id?: string;
  memory_type: string;
}

export default function OutcomesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppStore();

  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'importance' | 'agent'>('recent');
  const [agentFilter, setAgentFilter] = useState<string>('all');

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

  // Fetch outcomes
  useEffect(() => {
    const fetchOutcomes = async () => {
      if (!dbUserId) return;

      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memories/outcomes/${dbUserId}`);
        if (res.ok) {
          const data = await res.json();
          setOutcomes(data);
        }
      } catch (error) {
        console.error('Failed to fetch outcomes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutcomes();
  }, [dbUserId]);

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Filter and sort outcomes
  const filteredOutcomes = outcomes
    .filter(outcome => agentFilter === 'all' || outcome.agent_id === agentFilter)
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
  const uniqueAgents = Array.from(new Set(outcomes.map(o => o.agent_id).filter(Boolean)));

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

  // Export outcomes as JSON
  const handleExportJSON = () => {
    const data = JSON.stringify(filteredOutcomes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outcomes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export outcomes as CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Content', 'Source', 'Importance', 'Agent'];
    const rows = filteredOutcomes.map(o => [
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
    a.download = `outcomes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4f6ef7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: '#9090a8' }}>Loading outcomes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      {/* Header */}
      <div style={{ background: 'rgba(18,18,31,0.7)', borderBottom: '1px solid #1e1e30' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-[#ffc82c]" />
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Outcomes & Deliverables</h1>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Track your achievements and deliverables</p>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                style={{ background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.3)', color: '#818cf8' }}
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
              <div className="text-sm mb-1" style={{ color: '#9090a8' }}>Total Outcomes</div>
              <div className="text-2xl font-bold" style={{ color: '#818cf8' }}>{outcomes.length}</div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="text-sm mb-1" style={{ color: '#9090a8' }}>User Provided</div>
              <div className="text-2xl font-bold" style={{ color: '#4ade80' }}>{outcomes.filter(o => o.source === 'user').length}</div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <div className="text-sm mb-1" style={{ color: '#9090a8' }}>AI Extracted</div>
              <div className="text-2xl font-bold" style={{ color: '#c084fc' }}>{outcomes.filter(o => o.source === 'ai').length}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#9090a8' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
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
              Showing {filteredOutcomes.length} of {outcomes.length} outcomes
            </div>
          </div>
        </div>
      </div>

      {/* Outcomes Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredOutcomes.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: '#9090a8' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#ededf5' }}>No Outcomes Yet</h3>
            <p style={{ color: '#9090a8' }}>
              {outcomes.length === 0
                ? 'Start conversations to capture outcomes and deliverables.'
                : 'No outcomes match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutcomes.map((outcome) => {
              const agent = outcome.agent_id ? MINDSET_AGENTS[outcome.agent_id as keyof typeof MINDSET_AGENTS] : null;

              return (
                <div
                  key={outcome.id}
                  className="p-6 transition-shadow"
                  style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {outcome.source === 'user' ? (
                        <div title="User-provided">
                          <UserIcon className="w-6 h-6" style={{ color: '#9090a8' }} />
                        </div>
                      ) : (
                        <div title="AI-extracted">
                          <Sparkles className="w-6 h-6" style={{ color: '#c084fc' }} />
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
                          style={
                            i < Math.round(outcome.importance_score * 5)
                              ? { color: '#ffc82c', fill: '#ffc82c' }
                              : { color: '#1e1e30' }
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="mb-4 leading-relaxed" style={{ color: '#ededf5' }}>
                    {outcome.content}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs pt-4" style={{ color: '#9090a8', borderTop: '1px solid #1e1e30' }}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(outcome.created_at)}
                    </div>
                    <div className="font-medium text-[#ffc82c]">
                      {(outcome.importance_score * 100).toFixed(0)}% important
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Download, Calendar, User as UserIcon, Sparkles, TrendingUp, ArrowLeft, Filter, AlertCircle, MessageSquare, Activity } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';
import { API_URL } from '@/lib/api-client';

// ── Score history types ──────────────────────────────────────────────────────
interface ScoreEntry {
  id: string;
  score: number;
  category: string;
  scored_at: string;
  answers?: { awareness?: number; interruption?: number; architecture?: number } | null;
}

// ── SVG Line Chart — pure, no external deps ──────────────────────────────────
function ScoreLineChart({ entries }: { entries: ScoreEntry[] }) {
  const W = 400;
  const H = 120;
  const PAD_L = 32;
  const PAD_R = 16;
  const PAD_T = 10;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // entries arrive newest-first from backend; reverse to chronological
  const ordered = [...entries].reverse();
  const n = ordered.length;

  // Normalise score (0–100) → SVG y coordinate
  const toY = (score: number) => PAD_T + chartH - (score / 100) * chartH;
  // Spread x evenly
  const toX = (i: number) => PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);

  const points = ordered.map((e, i) => ({ x: toX(i), y: toY(e.score), entry: e }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // X-axis date labels — show abbreviated date
  const fmtDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const gridScores = [0, 25, 50, 75, 100];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Mindset Score history chart"
      role="img"
    >
      {/* Horizontal grid lines */}
      {gridScores.map(s => (
        <line
          key={s}
          x1={PAD_L}
          y1={toY(s)}
          x2={W - PAD_R}
          y2={toY(s)}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {gridScores.filter(s => s > 0).map(s => (
        <text
          key={s}
          x={PAD_L - 4}
          y={toY(s) + 4}
          fontSize="8"
          fill="#5a5a72"
          textAnchor="end"
        >
          {s}
        </text>
      ))}

      {/* Polyline connecting dots (only when 2+ points) */}
      {n >= 2 && (
        <polyline
          points={polyline}
          fill="none"
          stroke="#4f6ef7"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Dots */}
      {points.map((p, i) => {
        const isLatest = i === n - 1;
        return (
          <g key={p.entry.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isLatest ? 6 : 4}
              fill={isLatest ? '#fcc824' : '#4f6ef7'}
            />
            {/* Score tooltip above dot */}
            <text
              x={p.x}
              y={p.y - 10}
              fontSize="9"
              fill={isLatest ? '#fcc824' : '#9090a8'}
              textAnchor="middle"
              fontWeight={isLatest ? '700' : '400'}
            >
              {p.entry.score}
            </text>
          </g>
        );
      })}

      {/* X-axis date labels */}
      {points.map((p, i) => (
        <text
          key={`date-${i}`}
          x={p.x}
          y={H - 4}
          fontSize="8"
          fill="#5a5a72"
          textAnchor="middle"
        >
          {fmtDate(p.entry.scored_at)}
        </text>
      ))}
    </svg>
  );
}

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
  const [error, setError] = useState<string | null>(null);

  // Score history state
  const [scoreHistory, setScoreHistory] = useState<ScoreEntry[]>([]);
  const [scoreError, setScoreError] = useState<string | null>(null);

  // Fetch database user ID
  useEffect(() => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    const fetchDbUserId = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/user/by-email/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setDbUserId(data.id);
        } else {
          setError('Failed to load user data. Please try again.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch database user ID:', err);
        setError('Failed to load user data. Please try again.');
        setIsLoading(false);
      }
    };

    fetchDbUserId();
  }, [user?.email]);

  // Fetch outcomes
  useEffect(() => {
    if (!dbUserId) return;

    const fetchOutcomes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memories/outcomes/${dbUserId}`);
        if (res.ok) {
          const data = await res.json();
          setOutcomes(data);
        } else {
          setError('Failed to load outcomes. Please try again.');
        }
      } catch (err) {
        console.error('Failed to fetch outcomes:', err);
        setError('Failed to load outcomes. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutcomes();
  }, [dbUserId]);

  // Check auth — use token check to avoid premature redirect on store rehydration
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch score history
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const fetchScoreHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/mindset-score/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setScoreError('Could not load score history.');
          return;
        }
        const data: ScoreEntry[] = await res.json();
        setScoreHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Score history fetch failed:', err);
        setScoreError('Could not load score history.');
      }
    };

    fetchScoreHistory();
  }, []);

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
                <Trophy className="w-8 h-8" style={{ color: '#fcc824' }} />
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Outcomes &amp; Deliverables</h1>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Track your achievements and deliverables</p>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium hover:bg-[rgba(79,110,247,0.25)]"
                style={{ background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.3)', color: '#818cf8' }}
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium hover:bg-[rgba(34,197,94,0.2)]"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-xs underline"
                style={{ color: '#f87171' }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Mindset Score Journey Card ─────────────────────────────────── */}
          {(() => {
            // newest-first from backend
            const latest = scoreHistory[0] ?? null;
            const oldest = scoreHistory[scoreHistory.length - 1] ?? null;
            const delta = latest && oldest && scoreHistory.length > 1
              ? latest.score - oldest.score
              : null;

            return (
              <div
                className="mt-6"
                style={{
                  background: 'rgba(18,18,31,0.8)',
                  border: '1px solid #1e1e30',
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                {/* Card header */}
                <div className="flex items-center gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
                  <Activity className="w-5 h-5 flex-shrink-0" style={{ color: '#4f6ef7' }} />
                  <h2 className="text-base font-semibold" style={{ color: '#ededf5' }}>
                    Your Mindset Score Journey
                  </h2>
                  {latest && (
                    <span
                      className="ml-auto text-sm font-medium"
                      style={{ color: '#5a5a72' }}
                    >
                      Last {scoreHistory.length} score{scoreHistory.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {scoreError && (
                  <div
                    className="flex items-center gap-2 text-sm p-3 rounded-lg mb-4"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {scoreError}
                  </div>
                )}

                {!scoreError && scoreHistory.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center py-6 text-center">
                    <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
                      Take your Mindset Score to start tracking progress over time.
                    </p>
                    <Link
                      href="/scorecard"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                      style={{ background: '#fcc824', color: '#09090f' }}
                    >
                      Take the Mindset Score
                    </Link>
                  </div>
                ) : (
                  !scoreError && (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
                        {/* Left: score + delta */}
                        <div style={{ minWidth: 120, flexShrink: 0 }}>
                          <div className="text-xs mb-1" style={{ color: '#5a5a72' }}>Current Score</div>
                          <div
                            className="font-bold leading-none"
                            style={{ fontSize: '2.5rem', color: '#fcc824' }}
                          >
                            {latest?.score ?? '—'}
                          </div>
                          <div className="text-xs mt-1" style={{ color: '#5a5a72' }}>/ 100</div>
                          {delta !== null && (
                            <div
                              className="mt-3 text-sm font-medium"
                              style={{ color: delta >= 0 ? '#4f6ef7' : '#5a5a72' }}
                            >
                              {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{delta} pts since you started
                            </div>
                          )}
                          {latest && (
                            <div className="mt-1 text-xs" style={{ color: '#5a5a72' }}>
                              {latest.category}
                            </div>
                          )}
                        </div>

                        {/* Right: chart */}
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <ScoreLineChart entries={scoreHistory} />
                        </div>
                      </div>

                      {/* Sub-score layer breakdown — show for most recent structured assessment */}
                      {(() => {
                        const latestAssessment = scoreHistory.find(
                          e => e.category === 'structured-assessment' && e.answers
                        );
                        if (!latestAssessment?.answers) return null;
                        const { awareness, interruption, architecture } = latestAssessment.answers;
                        const layers = [
                          { label: 'Awareness', score: awareness, color: '#4f6ef7' },
                          { label: 'Interruption', score: interruption, color: '#7c5bf6' },
                          { label: 'Architecture', score: architecture, color: '#fcc824' },
                        ] as const;
                        return (
                          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e1e30' }}>
                            <div className="text-xs mb-3" style={{ color: '#5a5a72' }}>
                              Layer Breakdown —{' '}
                              {new Date(latestAssessment.scored_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {layers.map(({ label, score, color }) =>
                                score != null ? (
                                  <div key={label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <span className="text-xs" style={{ color: '#9090a8' }}>{label}</span>
                                      <span className="text-xs font-semibold" style={{ color }}>{score}</span>
                                    </div>
                                    <div style={{ background: '#1e1e30', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          width: `${score}%`,
                                          background: color,
                                          height: '100%',
                                          borderRadius: 4,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : null
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )
                )}
              </div>
            );
          })()}

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
              Showing {filteredOutcomes.length} of {outcomes.length} outcomes
            </div>
          </div>
        </div>
      </div>

      {/* Outcomes Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredOutcomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(252,200,36,0.08)', border: '1px solid rgba(252,200,36,0.15)' }}>
              <Trophy className="w-10 h-10 opacity-40" style={{ color: '#fcc824' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#ededf5' }}>
              {outcomes.length === 0 ? 'No outcomes yet' : 'No matches'}
            </h3>
            <p className="text-sm max-w-sm mb-6" style={{ color: '#9090a8' }}>
              {outcomes.length === 0
                ? 'Start conversations with your agents — outcomes and deliverables will be captured and tracked here automatically.'
                : 'Try adjusting your filters to see more outcomes.'}
            </p>
            {outcomes.length === 0 && (
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: '#fcc824', color: '#09090f' }}
              >
                <MessageSquare className="w-4 h-4" />
                Start a Conversation
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutcomes.map((outcome) => {
              const agent = outcome.agent_id ? MINDSET_AGENTS[outcome.agent_id as keyof typeof MINDSET_AGENTS] : null;

              return (
                <div
                  key={outcome.id}
                  className="p-6 transition-all hover:border-[#2a2a45] hover:shadow-lg"
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
                              ? { color: '#fcc824', fill: '#fcc824' }
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
                    <div className="font-medium" style={{ color: '#fcc824' }}>
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

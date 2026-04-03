'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Activity,
  MessageSquare,
  Sparkles,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface AnalyticsOverview {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number;
  avg_latency: number;
  unique_users: number;
  active_agents: number;
}

interface AgentAnalytics {
  agent_id: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  avg_latency: number;
}

interface ModelAnalytics {
  model_id: string;
  operation: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  avg_latency: number;
}

interface TimeSeriesData {
  date: string;
  requests: number;
  cost: number;
  tokens: number;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  byAgent: AgentAnalytics[];
  byModel: ModelAnalytics[];
  timeSeries: TimeSeriesData[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/analytics?days=${days}&v=${timestamp}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
        }
      );

      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
        setFetchError(null);
      } else {
        setFetchError(`Failed to load analytics (${response.status}). Try again.`);
      }
    } catch {
      setFetchError('Network error loading analytics. Please refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  if (loading) {
    return (
      <div style={{ background: '#09090f' }} className="flex items-center justify-center py-20 min-h-screen">
        <div style={{ color: '#9090a8' }}>Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: '#09090f' }} className="flex items-center justify-center py-20 min-h-screen">
        <div style={{ color: '#9090a8' }}>No analytics data available</div>
      </div>
    );
  }

  const { overview, byAgent, byModel, timeSeries } = data;

  return (
    <div style={{ background: '#09090f' }} className="space-y-6 min-h-screen p-6">
      {fetchError && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          <span>{fetchError}</span>
          <button onClick={() => setFetchError(null)} aria-label="Dismiss error">✕</button>
        </div>
      )}
      {/* Header */}
      <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                aria-label="Back to admin dashboard"
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 style={{ color: '#ededf5', fontWeight: 700 }} className="text-3xl">Token Analytics</h1>
                <p style={{ color: '#9090a8' }} className="text-sm mt-1">
                  OpenRouter API usage and cost tracking
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(9,9,15,0.6)', border: '1px solid #1e1e30' }}>
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                    style={
                      days === d
                        ? { background: 'rgba(79,110,247,0.15)', color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.3)' }
                        : { color: '#9090a8', border: '1px solid transparent' }
                    }
                  >
                    {d}d
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchAnalytics}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: '#4f6ef7', color: '#ededf5' }}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Requests */}
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(79,110,247,0.12)' }}>
                <MessageSquare className="w-6 h-6" style={{ color: '#4f6ef7' }} />
              </div>
              <div>
                <p style={{ color: '#9090a8' }} className="text-sm">Total Requests</p>
                <p style={{ color: '#ededf5', fontSize: 32, fontWeight: 700 }} className="leading-tight">
                  {formatNumber(overview.total_requests)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Tokens */}
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(234,179,8,0.12)' }}>
                <Zap className="w-6 h-6" style={{ color: '#fcc824' }} />
              </div>
              <div>
                <p style={{ color: '#9090a8' }} className="text-sm">Total Tokens</p>
                <p style={{ color: '#ededf5', fontSize: 32, fontWeight: 700 }} className="leading-tight">
                  {formatNumber(overview.total_tokens)}
                </p>
                <p style={{ color: '#9090a8' }} className="text-xs mt-1">
                  {formatNumber(overview.total_input_tokens)} in / {formatNumber(overview.total_output_tokens)} out
                </p>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <DollarSign className="w-6 h-6" style={{ color: '#22c55e' }} />
              </div>
              <div>
                <p style={{ color: '#9090a8' }} className="text-sm">Total Cost</p>
                <p style={{ color: '#ededf5', fontSize: 32, fontWeight: 700 }} className="leading-tight">
                  {formatCost(overview.total_cost)}
                </p>
                <p style={{ color: '#9090a8' }} className="text-xs mt-1">
                  {formatCost(overview.total_cost / overview.unique_users)} per user
                </p>
              </div>
            </div>
          </div>

          {/* Avg Latency */}
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(124,91,246,0.12)' }}>
                <Clock className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <div>
                <p style={{ color: '#9090a8' }} className="text-sm">Avg Latency</p>
                <p style={{ color: '#ededf5', fontSize: 32, fontWeight: 700 }} className="leading-tight">
                  {formatLatency(overview.avg_latency)}
                </p>
                <p style={{ color: '#9090a8' }} className="text-xs mt-1">
                  {overview.unique_users} users, {overview.active_agents} agents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Series Chart */}
        <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="mb-8">
          <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
            <h2 style={{ color: '#ededf5', fontWeight: 700 }} className="text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#4f6ef7' }} />
              Usage Trends
            </h2>
            <p style={{ color: '#9090a8' }} className="text-sm mt-1">
              Daily token usage and cost over the last {days} days
            </p>
          </div>
          <div className="p-6">
            {timeSeries.length > 0 ? (
              <div className="space-y-4">
                {timeSeries.map((day, idx) => {
                  const maxTokens = Math.max(...timeSeries.map((d) => Number(d.tokens)));
                  const tokensPercent = (Number(day.tokens) / maxTokens) * 100;
                  const maxCost = Math.max(...timeSeries.map((d) => Number(d.cost)));
                  const costPercent = (Number(day.cost) / maxCost) * 100;

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: '#9090a8' }} className="font-medium">
                          {new Date(day.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4" style={{ color: '#fcc824' }} />
                            <span style={{ color: '#ededf5' }} className="font-medium">
                              {formatNumber(Number(day.tokens))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" style={{ color: '#22c55e' }} />
                            <span style={{ color: '#ededf5' }} className="font-medium">
                              {formatCost(Number(day.cost))}
                            </span>
                          </div>
                          <span style={{ color: '#9090a8' }}>
                            {day.requests} req
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(9,9,15,0.6)', border: '1px solid #1e1e30' }}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${tokensPercent}%`, background: '#fcc824' }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(9,9,15,0.6)', border: '1px solid #1e1e30' }}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${costPercent}%`, background: '#22c55e' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: '#9090a8' }}>
                No time series data available
              </div>
            )}
          </div>
        </div>

        {/* By Agent Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
              <h2 style={{ color: '#ededf5', fontWeight: 700 }} className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: '#818cf8' }} />
                Usage by Agent
              </h2>
              <p style={{ color: '#9090a8' }} className="text-sm mt-1">
                Token usage and cost breakdown per agent
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {byAgent.length > 0 ? (
                  byAgent.map((agent, idx) => {
                    const totalTokens = Number(agent.input_tokens) + Number(agent.output_tokens);
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-lg"
                        style={{ background: 'rgba(9,9,15,0.6)', border: '1px solid #1e1e30' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ color: '#ededf5' }} className="font-medium">
                            {agent.agent_id}
                          </span>
                          <span style={{ color: '#9090a8' }} className="text-sm">
                            {agent.requests} requests
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div style={{ color: '#9090a8' }}>Tokens</div>
                            <div style={{ color: '#ededf5' }} className="font-medium">
                              {formatNumber(totalTokens)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#9090a8' }}>Cost</div>
                            <div style={{ color: '#ededf5' }} className="font-medium">
                              {formatCost(Number(agent.cost))}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#9090a8' }}>Latency</div>
                            <div style={{ color: '#ededf5' }} className="font-medium">
                              {formatLatency(Number(agent.avg_latency))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12" style={{ color: '#9090a8' }}>
                    No agent data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* By Model */}
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
              <h2 style={{ color: '#ededf5', fontWeight: 700 }} className="text-xl flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: '#a855f7' }} />
                Usage by Model
              </h2>
              <p style={{ color: '#9090a8' }} className="text-sm mt-1">
                Token usage and cost breakdown per AI model
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {byModel.length > 0 ? (
                  byModel.slice(0, 10).map((model, idx) => {
                    const totalTokens = Number(model.input_tokens) + Number(model.output_tokens);
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-lg"
                        style={{ background: 'rgba(9,9,15,0.6)', border: '1px solid #1e1e30' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span style={{ color: '#ededf5' }} className="font-medium block">
                              {model.model_id}
                            </span>
                            <span style={{ color: '#9090a8' }} className="text-xs">
                              {model.operation}
                            </span>
                          </div>
                          <span style={{ color: '#9090a8' }} className="text-sm">
                            {model.requests} req
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div style={{ color: '#9090a8' }}>Tokens</div>
                            <div style={{ color: '#ededf5' }} className="font-medium">
                              {formatNumber(totalTokens)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#9090a8' }}>Cost</div>
                            <div style={{ color: '#ededf5' }} className="font-medium">
                              {formatCost(Number(model.cost))}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#9090a8' }}>Latency</div>
                            <div style={{ color: '#ededf5' }} className="font-medium">
                              {formatLatency(Number(model.avg_latency))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12" style={{ color: '#9090a8' }}>
                    No model data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

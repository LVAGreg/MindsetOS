'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

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
        console.log('📊 Analytics data received:', analyticsData);
        setData(analyticsData);
      } else {
        console.error('❌ Analytics fetch failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error);
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
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600 dark:text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600 dark:text-gray-400">No analytics data available</div>
      </div>
    );
  }

  const { overview, byAgent, byModel, timeSeries } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Token Analytics</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  OpenRouter API usage and cost tracking
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      days === d
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchAnalytics}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.total_requests)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Tokens */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tokens</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.total_tokens)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatNumber(overview.total_input_tokens)} in / {formatNumber(overview.total_output_tokens)} out
                </p>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCost(overview.total_cost)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatCost(overview.total_cost / overview.unique_users)} per user
                </p>
              </div>
            </div>
          </div>

          {/* Avg Latency */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Latency</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatLatency(overview.avg_latency)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {overview.unique_users} users, {overview.active_agents} agents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Usage Trends
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                          {new Date(day.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {formatNumber(Number(day.tokens))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {formatCost(Number(day.cost))}
                            </span>
                          </div>
                          <span className="text-gray-500 dark:text-gray-400">
                            {day.requests} req
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                              style={{ width: `${tokensPercent}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-300"
                              style={{ width: `${costPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No time series data available
              </div>
            )}
          </div>
        </div>

      {/* By Agent Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Usage by Agent
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {agent.agent_id}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {agent.requests} requests
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Tokens</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(totalTokens)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Cost</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatCost(Number(agent.cost))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Latency</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatLatency(Number(agent.avg_latency))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No agent data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* By Model */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Usage by Model
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white block">
                          {model.model_id}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {model.operation}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {model.requests} req
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Tokens</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(totalTokens)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Cost</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatCost(Number(model.cost))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Latency</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatLatency(Number(model.avg_latency))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
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

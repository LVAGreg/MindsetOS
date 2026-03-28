'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  RefreshCw,
  Calendar,
  Users,
  Bot,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface ModelUsage {
  model_id: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
}

interface DailyUsage {
  date: string;
  calls: number;
  cost: number;
}

interface UserUsage {
  user_id: string;
  email: string;
  calls: number;
  total_cost: number;
}

interface UsageStats {
  totals: {
    today: number;
    week: number;
    month: number;
    all_time: number;
    total_calls: number;
    total_tokens: number;
  };
  by_model: ModelUsage[];
  by_day: DailyUsage[];
  by_user: UserUsage[];
  recent: Array<{
    created_at: string;
    model_id: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    agent_id: string;
  }>;
}

export default function UsageDashboardPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('accessToken');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
      const response = await fetch(`${API}/api/admin/usage-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch usage stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(cost);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getModelColor = (modelId: string): string => {
    if (modelId.includes('claude')) return 'bg-orange-500';
    if (modelId.includes('perplexity')) return 'bg-blue-500';
    if (modelId.includes('gpt') || modelId.includes('openai')) return 'bg-green-500';
    if (modelId.includes('gemini') || modelId.includes('google')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getModelName = (modelId: string): string => {
    const parts = modelId.split('/');
    return parts[parts.length - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const maxModelCost = Math.max(...stats.by_model.map(m => m.total_cost));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Usage Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Monitor costs, tokens, and model usage</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCost(stats.totals.today)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCost(stats.totals.week)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCost(stats.totals.month)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">All Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCost(stats.totals.all_time)}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total API Calls</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totals.total_calls)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Tokens</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totals.total_tokens)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost by Model */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Cost by Model
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {stats.by_model.map((model) => (
            <div key={model.model_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getModelColor(model.model_id)}`}></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getModelName(model.model_id)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(model.calls)} calls
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCost(model.total_cost)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    ({formatNumber(model.input_tokens + model.output_tokens)} tokens)
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getModelColor(model.model_id)}`}
                  style={{ width: `${(model.total_cost / maxModelCost) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Users by Cost
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats.by_user.slice(0, 10).map((user, index) => (
              <div key={user.user_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.email || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatNumber(user.calls)} calls
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCost(user.total_cost)}
                </span>
              </div>
            ))}
            {stats.by_user.length === 0 && (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No user data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent API Calls
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
            {stats.recent.map((call, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getModelColor(call.model_id)}`}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getModelName(call.model_id)}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCost(call.cost_usd)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {formatNumber(call.input_tokens)} in / {formatNumber(call.output_tokens)} out
                  </span>
                  <span>
                    {new Date(call.created_at).toLocaleTimeString()}
                  </span>
                </div>
                {call.agent_id && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded text-gray-600 dark:text-gray-300">
                    {call.agent_id}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Usage (Last 14 Days)
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between gap-2 h-48">
            {stats.by_day.map((day) => {
              const maxCost = Math.max(...stats.by_day.map(d => d.cost));
              const height = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-40">
                    <span className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                      {formatCost(day.cost)}
                    </span>
                    <div
                      className="w-full bg-indigo-500 rounded-t-lg transition-all duration-300 hover:bg-indigo-600"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

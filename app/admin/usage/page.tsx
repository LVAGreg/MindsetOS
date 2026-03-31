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

const cardStyle = {
  background: 'rgba(18,18,31,0.7)',
  border: '1px solid #1e1e30',
  borderRadius: 16,
};

const getModelAccent = (modelId: string): string => {
  if (modelId.includes('claude')) return '#f97316';
  if (modelId.includes('perplexity')) return '#4f6ef7';
  if (modelId.includes('gpt') || modelId.includes('openai')) return '#22c55e';
  if (modelId.includes('gemini') || modelId.includes('google')) return '#eab308';
  return '#9090a8';
};

const getModelName = (modelId: string): string => {
  const parts = modelId.split('/');
  return parts[parts.length - 1];
};

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
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ background: '#09090f' }}>
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid #4f6ef7' }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12,
        }}
      >
        <p style={{ color: '#f87171' }}>{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const maxModelCost = Math.max(...stats.by_model.map(m => m.total_cost));

  return (
    <div className="space-y-6" style={{ background: '#09090f', minHeight: '100vh', padding: 24 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: '#ededf5', fontSize: 24, fontWeight: 700 }}>API Usage Dashboard</h1>
          <p style={{ color: '#9090a8', marginTop: 4 }}>Monitor costs, tokens, and model usage</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity disabled:opacity-50"
          style={{ background: '#4f6ef7', color: '#ededf5' }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Today', value: formatCost(stats.totals.today), icon: <Clock className="w-6 h-6" />, accent: '#22c55e' },
          { label: 'This Week', value: formatCost(stats.totals.week), icon: <Calendar className="w-6 h-6" />, accent: '#4f6ef7' },
          { label: 'This Month', value: formatCost(stats.totals.month), icon: <TrendingUp className="w-6 h-6" />, accent: '#7c5bf6' },
          { label: 'All Time', value: formatCost(stats.totals.all_time), icon: <DollarSign className="w-6 h-6" />, accent: '#f59e0b' },
        ].map(({ label, value, icon, accent }) => (
          <div key={label} className="p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: '#9090a8', fontSize: 13 }}>{label}</p>
                <p style={{ color: '#ededf5', fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${accent}1a`, color: accent }}
              >
                {icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(79,110,247,0.15)', color: '#4f6ef7' }}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p style={{ color: '#9090a8', fontSize: 13 }}>Total API Calls</p>
              <p style={{ color: '#ededf5', fontSize: 28, fontWeight: 700 }}>{formatNumber(stats.totals.total_calls)}</p>
            </div>
          </div>
        </div>

        <div className="p-6" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,91,246,0.15)', color: '#7c5bf6' }}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p style={{ color: '#9090a8', fontSize: 13 }}>Total Tokens</p>
              <p style={{ color: '#ededf5', fontSize: 28, fontWeight: 700 }}>{formatNumber(stats.totals.total_tokens)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost by Model */}
      <div style={cardStyle}>
        <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
          <h2 className="flex items-center gap-2" style={{ color: '#ededf5', fontSize: 17, fontWeight: 600 }}>
            <Bot className="w-5 h-5" style={{ color: '#9090a8' }} />
            Cost by Model
          </h2>
        </div>
        <div className="p-6 space-y-5">
          {stats.by_model.map((model) => {
            const accent = getModelAccent(model.model_id);
            return (
              <div key={model.model_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: accent }}></div>
                    <span style={{ color: '#ededf5', fontSize: 14, fontWeight: 500 }}>
                      {getModelName(model.model_id)}
                    </span>
                    <span style={{ color: '#9090a8', fontSize: 12 }}>
                      {formatNumber(model.calls)} calls
                    </span>
                  </div>
                  <div className="text-right">
                    <span style={{ color: '#ededf5', fontSize: 14, fontWeight: 700 }}>
                      {formatCost(model.total_cost)}
                    </span>
                    <span style={{ color: '#9090a8', fontSize: 12, marginLeft: 8 }}>
                      ({formatNumber(model.input_tokens + model.output_tokens)} tokens)
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full" style={{ background: 'rgba(30,30,48,0.8)' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(model.total_cost / maxModelCost) * 100}%`,
                      background: 'linear-gradient(90deg, #4f6ef7, #7c5bf6)',
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div style={cardStyle}>
          <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
            <h2 className="flex items-center gap-2" style={{ color: '#ededf5', fontSize: 17, fontWeight: 600 }}>
              <Users className="w-5 h-5" style={{ color: '#9090a8' }} />
              Top Users by Cost
            </h2>
          </div>
          <div>
            {stats.by_user.slice(0, 10).map((user, index) => (
              <div
                key={user.user_id}
                className="p-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(30,30,48,0.5)', color: '#ededf5' }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: '#9090a8', fontSize: 13, width: 24 }}>#{index + 1}</span>
                  <div>
                    <p style={{ color: '#ededf5', fontSize: 14, fontWeight: 500 }}>
                      {user.email || 'Unknown User'}
                    </p>
                    <p style={{ color: '#9090a8', fontSize: 12 }}>{formatNumber(user.calls)} calls</p>
                  </div>
                </div>
                <span style={{ color: '#ededf5', fontSize: 14, fontWeight: 700 }}>
                  {formatCost(user.total_cost)}
                </span>
              </div>
            ))}
            {stats.by_user.length === 0 && (
              <div className="p-6 text-center" style={{ color: '#9090a8' }}>
                No user data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Calls */}
        <div style={cardStyle}>
          <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
            <h2 className="flex items-center gap-2" style={{ color: '#ededf5', fontSize: 17, fontWeight: 600 }}>
              <Clock className="w-5 h-5" style={{ color: '#9090a8' }} />
              Recent API Calls
            </h2>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {stats.recent.map((call, index) => {
              const accent = getModelAccent(call.model_id);
              return (
                <div
                  key={index}
                  className="p-4"
                  style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: accent }}></div>
                      <span style={{ color: '#ededf5', fontSize: 14, fontWeight: 500 }}>
                        {getModelName(call.model_id)}
                      </span>
                    </div>
                    <span style={{ color: '#ededf5', fontSize: 14, fontWeight: 700 }}>
                      {formatCost(call.cost_usd)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between" style={{ fontSize: 12, color: '#9090a8' }}>
                    <span>
                      {formatNumber(call.input_tokens)} in / {formatNumber(call.output_tokens)} out
                    </span>
                    <span>{new Date(call.created_at).toLocaleTimeString()}</span>
                  </div>
                  {call.agent_id && (
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded text-xs"
                      style={{ background: 'rgba(79,110,247,0.15)', color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.2)' }}
                    >
                      {call.agent_id}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Usage Chart */}
      <div style={cardStyle}>
        <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
          <h2 className="flex items-center gap-2" style={{ color: '#ededf5', fontSize: 17, fontWeight: 600 }}>
            <TrendingUp className="w-5 h-5" style={{ color: '#9090a8' }} />
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
                    <span style={{ color: '#ededf5', fontSize: 11, fontWeight: 500, marginBottom: 4 }}>
                      {formatCost(day.cost)}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-300"
                      style={{
                        height: `${Math.max(height, 2)}%`,
                        background: 'linear-gradient(180deg, #4f6ef7, #7c5bf6)',
                      }}
                    ></div>
                  </div>
                  <span style={{ color: '#9090a8', fontSize: 11 }}>
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

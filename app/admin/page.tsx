'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, MessageSquare, TrendingUp, Clock, BarChart3, Activity, DollarSign, Zap } from 'lucide-react';

interface UserStats {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  messageCount: number;
  conversationCount: number;
  lastActive: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface SystemStats {
  totalUsers: number;
  totalMessages: number;
  totalConversations: number;
  activeToday: number;
  averageMessagesPerUser: number;
  mostPopularAgent: string;
  totalTokens: number;
  totalCost: number;
  averageCostPerUser: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<UserStats[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token found, redirecting to login');
      router.push('/login');
      return;
    }
    fetchAdminData(token);
  }, [router]);

  const fetchAdminData = async (token: string) => {
    try {
      const timestamp = new Date().getTime();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
      console.log('Fetching admin stats from:', `${apiUrl}/api/admin/stats`);

      const response = await fetch(`${apiUrl}/api/admin/stats?v=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      console.log('Admin stats response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setSystemStats(data.systemStats || null);
      } else if (response.status === 401) {
        console.warn('Unauthorized - token may be expired');
        localStorage.removeItem('accessToken');
        router.push('/login');
      } else {
        console.error('Admin stats error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div style={{ color: '#9090a8' }}>Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-2">
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>
          Admin — Dashboard
        </p>
        <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>Overview</h1>
      </div>

      {/* System Stats Cards */}
      {systemStats && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Users */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(79,110,247,0.15)' }}>
                  <Users className="w-6 h-6" style={{ color: '#4f6ef7' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Total Users</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{systemStats.totalUsers}</p>
                </div>
              </div>
            </div>

            {/* Total Messages */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)' }}>
                  <MessageSquare className="w-6 h-6" style={{ color: '#22c55e' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Total Messages</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{systemStats.totalMessages}</p>
                </div>
              </div>
            </div>

            {/* Total Conversations */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(168,85,247,0.15)' }}>
                  <BarChart3 className="w-6 h-6" style={{ color: '#a855f7' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Total Conversations</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{systemStats.totalConversations}</p>
                </div>
              </div>
            </div>

            {/* Active Today */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(249,115,22,0.15)' }}>
                  <Activity className="w-6 h-6" style={{ color: '#f97316' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Active Today</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{systemStats.activeToday}</p>
                </div>
              </div>
            </div>

            {/* Avg Messages/User */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(20,184,166,0.15)' }}>
                  <TrendingUp className="w-6 h-6" style={{ color: '#14b8a6' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Avg Messages/User</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{Number(systemStats.averageMessagesPerUser || 0).toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Most Popular Agent */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(236,72,153,0.15)' }}>
                  <Clock className="w-6 h-6" style={{ color: '#ec4899' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Most Popular Agent</p>
                  <p className="text-lg font-bold" style={{ color: '#ededf5' }}>{systemStats.mostPopularAgent}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage & Cost Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Tokens */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(234,179,8,0.15)' }}>
                  <Zap className="w-6 h-6" style={{ color: '#eab308' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#9090a8' }}>Total Tokens Used</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>
                    {systemStats.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                    ~{((systemStats.totalTokens || 0) / 1000).toFixed(1)}K tokens
                  </p>
                </div>
              </div>
            </div>

            {/* Total API Cost */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)' }}>
                  <DollarSign className="w-6 h-6" style={{ color: '#22c55e' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#9090a8' }}>Total API Cost</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>
                    ${(systemStats.totalCost || 0).toFixed(4)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                    Live from OpenRouter usage
                  </p>
                </div>
              </div>
            </div>

            {/* Avg Cost Per User */}
            <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'rgba(79,110,247,0.15)' }}>
                  <Users className="w-6 h-6" style={{ color: '#4f6ef7' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#9090a8' }}>Avg Cost Per User</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>
                    ${(systemStats.averageCostPerUser || 0).toFixed(4)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                    Per active user
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="overflow-hidden">
        <div className="p-6 border-b border-[#1e1e30]">
          <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>User Activity</h2>
          <p className="text-sm mt-1" style={{ color: '#9090a8' }}>Detailed usage statistics per user</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(18,18,31,0.5)' }}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Conversations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center" style={{ color: '#9090a8' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #1e1e30' }} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#ededf5' }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm" style={{ color: '#9090a8' }}>{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" style={{ color: '#9090a8' }} />
                        <span className="text-sm font-medium" style={{ color: '#ededf5' }}>{user.messageCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" style={{ color: '#9090a8' }} />
                        <span className="text-sm font-medium" style={{ color: '#ededf5' }}>{user.conversationCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium" style={{ color: '#ededf5' }}>
                          {((user.totalTokens || 0) / 1000).toFixed(1)}K
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium" style={{ color: '#ededf5' }}>
                          ${(user.estimatedCost || 0).toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#9090a8' }}>
                      {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#9090a8' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

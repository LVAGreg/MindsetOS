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
    // Check for token before fetching
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
      // Add cache-busting timestamp to force fresh data
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
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Stats Cards */}
      {systemStats && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totalMessages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Conversations</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.totalConversations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{systemStats.activeToday}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Messages/User</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(systemStats.averageMessagesPerUser || 0).toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Most Popular Agent</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{systemStats.mostPopularAgent}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage & Cost Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-200 dark:bg-yellow-900/50 rounded-lg">
                  <Zap className="w-6 h-6 text-yellow-700 dark:text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Total Tokens Used</p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                    {systemStats.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ~{((systemStats.totalTokens || 0) / 1000).toFixed(1)}K tokens
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-200 dark:bg-green-900/50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-700 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">Total API Cost</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    ${(systemStats.totalCost || 0).toFixed(4)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Live from OpenRouter usage
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-200 dark:bg-blue-900/50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-700 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Avg Cost Per User</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ${(systemStats.averageCostPerUser || 0).toFixed(4)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Per active user
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

      {/* User List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Activity</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detailed usage statistics per user</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Conversations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{user.messageCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{user.conversationCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {((user.totalTokens || 0) / 1000).toFixed(1)}K
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          ${(user.estimatedCost || 0).toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  RefreshCw,
  Plus,
  ArrowLeft,
} from 'lucide-react';

interface CreditStats {
  user_count: string;
  total_balance: string;
  total_earned: string;
  total_spent: string;
  avg_balance: string;
  total_balance_usd: string;
  total_earned_usd: string;
  total_spent_usd: string;
}

interface TopUser {
  email: string;
  first_name: string;
  last_name: string;
  balance: number;
  balance_usd: string;
}

interface TopSpender {
  email: string;
  first_name: string;
  last_name: string;
  total_spent: number;
  total_spent_usd: string;
}

interface RecentTransaction {
  id: number;
  email: string;
  amount: number;
  transaction_type: string;
  description: string;
  amount_usd: string;
  created_at: string;
}

interface CreditOverview {
  stats: CreditStats;
  topUsers: TopUser[];
  topSpenders: TopSpender[];
  recentTransactions: RecentTransaction[];
}

export default function AdminCreditsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<CreditOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantDescription, setGrantDescription] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
      const response = await fetch(`${API}/api/admin/credits/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 403) {
        setError('Admin access required');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch credit overview');
      }

      const data = await response.json();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching credit overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();

    setGrantError(null);
    setGrantSuccess(null);

    if (!grantEmail || !grantAmount) {
      setGrantError('Email and amount are required');
      return;
    }

    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount <= 0) {
      setGrantError('Amount must be a positive number');
      return;
    }

    try {
      setGrantLoading(true);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

      // First, find the user by email
      const usersResponse = await fetch(`${API}/api/admin/users?email=${encodeURIComponent(grantEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!usersResponse.ok) {
        throw new Error('Failed to find user');
      }

      const usersData = await usersResponse.json();
      if (!usersData.users || usersData.users.length === 0) {
        setGrantError('User not found with that email');
        return;
      }

      const userId = usersData.users[0].id;

      // Grant credits
      const grantResponse = await fetch(`${API}/api/admin/credits/grant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          amount,
          description: grantDescription || 'Admin credit grant'
        })
      });

      if (!grantResponse.ok) {
        throw new Error('Failed to grant credits');
      }

      const result = await grantResponse.json();
      setGrantSuccess(`Successfully granted ${result.amount} credits ($${result.amountUsd.toFixed(2)}) to ${grantEmail}`);

      // Reset form and refresh
      setGrantEmail('');
      setGrantAmount('');
      setGrantDescription('');
      setShowGrantModal(false);
      fetchOverview();
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Failed to grant credits');
      console.error('Error granting credits:', err);
    } finally {
      setGrantLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading credit overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 p-4">
        <div className="text-center max-w-md">
          <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const stats = overview.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-7 h-7 text-blue-600" />
                  Credit System Overview
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage MindsetOS credit system and user balances
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchOverview}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowGrantModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Grant Credits
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.user_count}
            </div>
          </div>

          {/* Total Balance */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Balance</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {parseInt(stats.total_balance).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ${parseFloat(stats.total_balance_usd).toFixed(2)} USD
            </div>
          </div>

          {/* Total Earned */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earned</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {parseInt(stats.total_earned).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ${parseFloat(stats.total_earned_usd).toFixed(2)} USD
            </div>
          </div>

          {/* Total Spent */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {parseInt(stats.total_spent).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ${parseFloat(stats.total_spent_usd).toFixed(2)} USD
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Users by Balance */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Users by Balance
            </h3>
            <div className="space-y-3">
              {overview.topUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {user.balance.toLocaleString()} credits
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ${parseFloat(user.balance_usd).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Spenders */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Top Spenders
            </h3>
            <div className="space-y-3">
              {overview.topSpenders.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {user.total_spent.toLocaleString()} credits
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ${parseFloat(user.total_spent_usd).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Recent Transactions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Description</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{tx.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        tx.transaction_type === 'admin_grant'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : tx.transaction_type === 'usage_deduction'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      <span className="text-xs ml-1">(${parseFloat(tx.amount_usd).toFixed(2)})</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{tx.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grant Credits Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Grant Credits</h2>
            {grantError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {grantError}
              </div>
            )}
            {grantSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
                {grantSuccess}
              </div>
            )}
            <form onSubmit={handleGrantCredits} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Email
                </label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (credits)
                </label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="1000"
                  min="1"
                  required
                />
                {grantAmount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ≈ ${(parseInt(grantAmount) / 1000).toFixed(2)} USD
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={grantDescription}
                  onChange={(e) => setGrantDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Admin credit grant"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={grantLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={grantLoading}
                >
                  {grantLoading ? 'Granting...' : 'Grant Credits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

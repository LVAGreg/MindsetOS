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
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#4f6ef7' }} />
          <p style={{ color: '#9090a8' }}>Loading credit overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 p-4" style={{ background: '#09090f' }}>
        <div className="text-center max-w-md">
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <p className="mb-4" style={{ color: '#ff6b6b' }}>{error}</p>
            <button
              onClick={() => router.push('/admin')}
              className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
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
    <div className="space-y-6" style={{ background: '#09090f' }}>
      {/* Header */}
      <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
                  <Coins className="w-7 h-7" style={{ color: '#4f6ef7' }} />
                  Credit System Overview
                </h1>
                <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
                  Manage MindsetOS credit system and user balances
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchOverview}
                className="px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
                style={{ color: '#9090a8', border: '1px solid #1e1e30' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowGrantModal(true)}
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Grant Credits
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5" style={{ color: '#4f6ef7' }} />
              <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Total Users</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#ededf5' }}>
              {stats.user_count}
            </div>
          </div>

          {/* Total Balance */}
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5" style={{ color: '#22c55e' }} />
              <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Total Balance</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#fcc824', fontWeight: 700 }}>
              {parseInt(stats.total_balance).toLocaleString()}
            </div>
            <div className="text-sm" style={{ color: '#9090a8' }}>
              ${parseFloat(stats.total_balance_usd).toFixed(2)} USD
            </div>
          </div>

          {/* Total Earned */}
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#a855f7' }} />
              <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Total Earned</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#fcc824', fontWeight: 700 }}>
              {parseInt(stats.total_earned).toLocaleString()}
            </div>
            <div className="text-sm" style={{ color: '#9090a8' }}>
              ${parseFloat(stats.total_earned_usd).toFixed(2)} USD
            </div>
          </div>

          {/* Total Spent */}
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5" style={{ color: '#ef4444' }} />
              <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Total Spent</span>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#fcc824', fontWeight: 700 }}>
              {parseInt(stats.total_spent).toLocaleString()}
            </div>
            <div className="text-sm" style={{ color: '#9090a8' }}>
              ${parseFloat(stats.total_spent_usd).toFixed(2)} USD
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Users by Balance */}
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#ededf5' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#22c55e' }} />
              Top Users by Balance
            </h3>
            <div className="space-y-3">
              {overview.topUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(30,30,48,0.5)', borderBottom: '1px solid rgba(30,30,48,0.5)' }}>
                  <div>
                    <div className="font-medium" style={{ color: '#ededf5' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm" style={{ color: '#9090a8' }}>{user.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: '#fcc824', fontWeight: 700 }}>
                      {user.balance.toLocaleString()} credits
                    </div>
                    <div className="text-sm" style={{ color: '#9090a8' }}>
                      ${parseFloat(user.balance_usd).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Spenders */}
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#ededf5' }}>
              <TrendingDown className="w-5 h-5" style={{ color: '#ef4444' }} />
              Top Spenders
            </h3>
            <div className="space-y-3">
              {overview.topSpenders.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(30,30,48,0.5)', borderBottom: '1px solid rgba(30,30,48,0.5)' }}>
                  <div>
                    <div className="font-medium" style={{ color: '#ededf5' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm" style={{ color: '#9090a8' }}>{user.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: '#fcc824', fontWeight: 700 }}>
                      {user.total_spent.toLocaleString()} credits
                    </div>
                    <div className="text-sm" style={{ color: '#9090a8' }}>
                      ${parseFloat(user.total_spent_usd).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#ededf5' }}>
            <DollarSign className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            Recent Transactions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}>
                  <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: '#9090a8' }}>User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: '#9090a8' }}>Type</th>
                  <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: '#9090a8' }}>Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: '#9090a8' }}>Description</th>
                  <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: '#9090a8' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentTransactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}>
                    <td className="py-3 px-4 text-sm" style={{ color: '#ededf5' }}>{tx.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        style={
                          tx.transaction_type === 'admin_grant'
                            ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80' }
                            : tx.transaction_type === 'usage_deduction'
                            ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                            : { background: 'rgba(144,144,168,0.15)', color: '#9090a8' }
                        }
                      >
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: tx.amount > 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      <span className="text-xs ml-1" style={{ color: '#9090a8' }}>(${parseFloat(tx.amount_usd).toFixed(2)})</span>
                    </td>
                    <td className="py-3 px-4 text-sm" style={{ color: '#9090a8' }}>{tx.description}</td>
                    <td className="py-3 px-4 text-sm text-right" style={{ color: '#9090a8' }}>
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="max-w-md w-full p-6" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#ededf5' }}>Grant Credits</h2>
            {grantError && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                {grantError}
              </div>
            )}
            {grantSuccess && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                {grantSuccess}
              </div>
            )}
            <form onSubmit={handleGrantCredits} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  User Email
                </label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Amount (credits)
                </label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  placeholder="1000"
                  min="1"
                  required
                />
                {grantAmount && (
                  <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                    ≈ ${(parseInt(grantAmount) / 1000).toFixed(2)} USD
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={grantDescription}
                  onChange={(e) => setGrantDescription(e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  placeholder="Admin credit grant"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ border: '1px solid #1e1e30', color: '#9090a8' }}
                  disabled={grantLoading}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
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

'use client';

import { useState, useEffect } from 'react';
import { Coins, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';

interface CreditBalanceProps {
  userId?: string;
  compact?: boolean;
}

interface CreditData {
  balance: number;
  total_earned: number;
  total_spent: number;
  balance_usd: string;
  total_earned_usd: string;
  total_spent_usd: string;
}

export function CreditBalance({ userId, compact = false }: CreditBalanceProps) {
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Silently skip if not authenticated yet
        setLoading(false);
        return;
      }

      const response = await fetch('/api/credits/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credit balance');
      }

      const data = await response.json();
      setCredits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching credit balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Small delay to ensure auth token is set after login
    const timer = setTimeout(() => {
      fetchBalance();
    }, 100);

    return () => clearTimeout(timer);
  }, [userId]);

  // Don't show anything if still loading or no credits available
  if (loading || !credits) {
    return null;
  }

  // Only show error if we had a real fetch error (not just missing auth)
  if (error && error !== 'Not authenticated') {
    return (
      <div className="p-2 text-xs text-red-600 dark:text-red-400">
        Failed to load credits
      </div>
    );
  }

  const balance = credits.balance;
  const balanceUsd = parseFloat(credits.balance_usd);
  const totalSpent = credits.total_spent;
  const totalSpentUsd = parseFloat(credits.total_spent_usd);

  // Calculate percentage of credits remaining
  const totalEarned = credits.total_earned;
  const percentageRemaining = totalEarned > 0 ? (balance / totalEarned) * 100 : 100;

  // Determine color based on balance
  const getBalanceColor = () => {
    if (percentageRemaining > 50) return 'text-green-600 dark:text-green-400';
    if (percentageRemaining > 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = () => {
    if (percentageRemaining > 50) return 'bg-green-500';
    if (percentageRemaining > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <Coins className={`w-5 h-5 ${getBalanceColor()}`} />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold ${getBalanceColor()}`}>
              {balance.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">credits</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            ${balanceUsd.toFixed(2)} remaining
          </div>
        </div>
        <button
          onClick={fetchBalance}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh balance"
        >
          <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-gray-700 rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Credit Balance
          </h3>
        </div>
        <button
          onClick={fetchBalance}
          className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          title="Refresh balance"
        >
          <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Main Balance */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 mb-1">
          <span className={`text-4xl font-bold ${getBalanceColor()}`}>
            {balance.toLocaleString()}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">credits</span>
        </div>
        <div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
          ${balanceUsd.toFixed(2)} USD
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Balance</span>
          <span>{percentageRemaining.toFixed(0)}% remaining</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${percentageRemaining}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Spent */}
        <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Spent</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {totalSpent.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ${totalSpentUsd.toFixed(2)}
          </div>
        </div>

        {/* Total Earned */}
        <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Earned</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {totalEarned.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ${parseFloat(credits.total_earned_usd).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Info Text */}
      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          1 credit = $0.001 USD • Credits deducted automatically on AI usage
        </p>
      </div>
    </div>
  );
}

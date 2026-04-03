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
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
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
      <div
        style={{ padding: '8px', fontSize: '12px', color: '#f87171' }}
      >
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

  // Determine color based on balance — using design tokens
  const getBalanceColor = (): string => {
    if (percentageRemaining > 50) return '#4ade80'; // green
    if (percentageRemaining > 25) return '#fcc824'; // amber token
    return '#f87171'; // red
  };

  const getProgressColor = (): string => {
    if (percentageRemaining > 50) return '#4ade80';
    if (percentageRemaining > 25) return '#fcc824'; // amber token
    return '#f87171';
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px',
          background: 'rgba(18,18,31,0.8)',
          border: '1px solid #1e1e30',
          borderRadius: '8px',
        }}
      >
        <Coins style={{ width: '20px', height: '20px', color: getBalanceColor(), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: getBalanceColor() }}>
              {balance.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#9090a8' }}>credits</span>
          </div>
          <div style={{ fontSize: '12px', color: '#9090a8' }}>
            ${balanceUsd.toFixed(2)} remaining
          </div>
        </div>
        <button
          onClick={fetchBalance}
          aria-label="Refresh balance"
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <RefreshCw style={{ width: '16px', height: '16px', color: '#9090a8' }} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        background: 'rgba(18,18,31,0.8)',
        border: '1px solid #1e1e30',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Coins style={{ width: '24px', height: '24px', color: '#4f6ef7' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ededf5', margin: 0 }}>
            Credit Balance
          </h3>
        </div>
        <button
          onClick={fetchBalance}
          aria-label="Refresh balance"
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <RefreshCw style={{ width: '16px', height: '16px', color: '#9090a8' }} />
        </button>
      </div>

      {/* Main Balance */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
          <span style={{ fontSize: '36px', fontWeight: 700, color: getBalanceColor() }}>
            {balance.toLocaleString()}
          </span>
          <span style={{ fontSize: '14px', color: '#9090a8' }}>credits</span>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 600, color: '#9090a8' }}>
          ${balanceUsd.toFixed(2)} USD
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9090a8', marginBottom: '4px' }}>
          <span>Balance</span>
          <span>{percentageRemaining.toFixed(0)}% remaining</span>
        </div>
        <div
          style={{
            height: '8px',
            background: '#1e1e30',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentageRemaining}%`,
              background: getProgressColor(),
              transition: 'width 500ms ease',
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Total Spent */}
        <div
          style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid #1e1e30',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <TrendingDown style={{ width: '16px', height: '16px', color: '#f87171' }} />
            <span style={{ fontSize: '12px', color: '#9090a8' }}>Spent</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#ededf5' }}>
            {totalSpent.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#5a5a72' }}>
            ${totalSpentUsd.toFixed(2)}
          </div>
        </div>

        {/* Total Earned */}
        <div
          style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid #1e1e30',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <TrendingUp style={{ width: '16px', height: '16px', color: '#4ade80' }} />
            <span style={{ fontSize: '12px', color: '#9090a8' }}>Earned</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#ededf5' }}>
            {totalEarned.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#5a5a72' }}>
            ${parseFloat(credits.total_earned_usd).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Info Text */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #1e1e30',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '12px', color: '#5a5a72', margin: 0 }}>
          1 credit = $0.001 USD • Credits deducted automatically on AI usage
        </p>
      </div>
    </div>
  );
}

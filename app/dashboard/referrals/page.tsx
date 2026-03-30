'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Users, DollarSign, Gift, ArrowLeft } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

interface ReferralStats {
  referralCode: string;
  referralUrl: string;
  totalReferrals: number;
  paidReferrals: number;
  totalEarnedCents: number;
  paidOutCents: number;
}

interface Commission {
  id: number;
  commission_amount_cents: number;
  payment_amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  referee_email: string;
}

export default function ReferralsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [statsRes, histRes] = await Promise.all([
          fetch(`${API}/api/referral/stats`, { headers: authHeaders() }),
          fetch(`${API}/api/referral/history`, { headers: authHeaders() }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (histRes.ok) setHistory(await histRes.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const copyLink = () => {
    if (!stats?.referralUrl) return;
    navigator.clipboard.writeText(stats.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <Gift className="w-6 h-6 text-indigo-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Refer &amp; Earn</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Earn 10% commission on every paying user you refer — forever.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Referral link card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Your Referral Link</h2>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
              {stats?.referralUrl || 'Loading...'}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Share this link with entrepreneurs you know. When they subscribe, you earn 10% of their first payment automatically.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Referrals', value: stats?.totalReferrals ?? 0, icon: Users, color: 'text-blue-500' },
            { label: 'Converted', value: stats?.paidReferrals ?? 0, icon: Check, color: 'text-green-500' },
            { label: 'Total Earned', value: `$${((stats?.totalEarnedCents ?? 0) / 100).toFixed(2)}`, icon: DollarSign, color: 'text-indigo-500' },
            { label: 'Paid Out', value: `$${((stats?.paidOutCents ?? 0) / 100).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-3">How it works</h3>
          <ol className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
            <li>1. Share your referral link with an entrepreneur you know</li>
            <li>2. They sign up and subscribe to any paid plan</li>
            <li>3. You earn 10% of their first payment (credited to your account)</li>
            <li>4. Commissions are paid out monthly via bank transfer or PayPal</li>
          </ol>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Commission History</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {history.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {c.referee_email.replace(/(.{2}).+@/, '$1***@')}
                    </div>
                    <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      +${(c.commission_amount_cents / 100).toFixed(2)}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      c.status === 'paid'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center h-28 text-gray-400">
            <Gift className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-sm">No referrals yet — share your link to start earning</p>
          </div>
        )}
      </div>
    </div>
  );
}

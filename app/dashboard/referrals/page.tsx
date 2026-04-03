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
  const [loadError, setLoadError] = useState<string | null>(null);

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
      } catch {
        setLoadError('Failed to load referral data.');
      }
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

  return (
    <div className="min-h-screen bg-[#09090f]">
      {/* Header */}
      <div className="bg-[#12121f] border-b border-[#1e1e30]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: '#9090a8' }} />
            </button>
            <Gift className="w-6 h-6 text-[#fcc824]" />
            <div>
              <h1 className="text-xl font-bold text-[#ededf5]">Refer &amp; Earn</h1>
              <p className="text-sm" style={{ color: '#9090a8' }}>
                Earn 10% per referral — paid monthly to your account.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loadError && (
          <p className="text-xs text-red-400 px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            {loadError}
          </p>
        )}
        {/* Referral link — always visible, even while loading */}
        <div className="bg-[#12121f] rounded-xl border border-[#1e1e30] p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-base font-semibold text-[#ededf5]">Your Referral Link</h2>
              <p className="text-xs mt-0.5" style={{ color: '#9090a8' }}>
                You earn <span className="text-[#fcc824] font-semibold">10% of each referred user&apos;s first payment</span> — automatically credited monthly.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono truncate" style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#7b8ff8' }}>
              {loading ? (
                <span style={{ color: '#9090a8' }}>Loading your link...</span>
              ) : (
                stats?.referralUrl || '—'
              )}
            </div>
            <button
              onClick={copyLink}
              disabled={loading || !stats?.referralUrl}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#fcc824] hover:bg-[#f0be1e] disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Referrals', value: stats?.totalReferrals ?? 0, icon: Users, iconColor: '#4f6ef7' },
              { label: 'Converted', value: stats?.paidReferrals ?? 0, icon: Check, iconColor: '#fcc824' },
              { label: 'Total Earned', value: `$${((stats?.totalEarnedCents ?? 0) / 100).toFixed(2)}`, icon: DollarSign, iconColor: '#fcc824' },
              { label: 'Paid Out', value: `$${((stats?.paidOutCents ?? 0) / 100).toFixed(2)}`, icon: DollarSign, iconColor: '#fcc824' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
                <s.icon className="w-5 h-5 mb-2" style={{ color: s.iconColor }} />
                <div className="text-xl font-bold" style={{ color: '#ededf5' }}>{s.value}</div>
                <div className="text-xs" style={{ color: '#9090a8' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div className="bg-[#fcc824]/[0.05] border border-[#fcc824]/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#fcc824] mb-3">How it works</h3>
          <ol className="space-y-2 text-sm" style={{ color: '#9090a8' }}>
            <li>1. Share your referral link with an entrepreneur you know</li>
            <li>2. They sign up and subscribe to any paid plan</li>
            <li>3. You earn 10% of their first payment (credited to your account)</li>
            <li>4. Commissions are paid out monthly via bank transfer or PayPal</li>
          </ol>
        </div>

        {/* History */}
        {!loading && history.length > 0 && (
          <div className="bg-[#12121f] rounded-xl border border-[#1e1e30] overflow-hidden">
            <div className="p-4 border-b border-[#1e1e30]">
              <h2 className="text-base font-semibold text-[#ededf5]">Commission History</h2>
            </div>
            <div className="divide-y divide-[#1e1e30]">
              {history.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#ededf5' }}>
                      {c.referee_email.replace(/(.{2}).+@/, '$1***@')}
                    </div>
                    <div className="text-xs" style={{ color: '#9090a8' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: '#fcc824', fontWeight: 700 }}>
                      +${(c.commission_amount_cents / 100).toFixed(2)}
                    </div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={
                        c.status === 'paid'
                          ? { background: 'rgba(79,110,247,0.12)', color: '#4f6ef7' }
                          : { background: 'rgba(252,200,36,0.12)', color: '#fcc824' }
                      }
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state — motivating, with big CTA */}
        {!loading && history.length === 0 && (
          <div className="bg-[#12121f] rounded-xl border border-[#1e1e30] p-8 text-center">
            <div className="w-12 h-12 bg-[#fcc824]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-6 h-6 text-[#fcc824]" />
            </div>
            <h3 className="text-base font-semibold text-[#ededf5] mb-1">Your first referral is one share away</h3>
            <p className="text-sm mb-1" style={{ color: '#9090a8' }}>
              Every entrepreneur you send earns you <span className="text-[#fcc824] font-semibold">10% of their first payment</span>.
            </p>
            <p className="text-xs mb-5" style={{ color: '#9090a8' }}>Earn 10% per referral — paid monthly</p>
            <button
              onClick={copyLink}
              disabled={!stats?.referralUrl}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#fcc824] hover:bg-[#f0be1e] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Copy My Referral Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

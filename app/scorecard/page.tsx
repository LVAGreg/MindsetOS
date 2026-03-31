'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Brain, Target, Zap } from 'lucide-react';
import posthog from 'posthog-js';

export default function ScorecardPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    try { posthog.capture('lead_magnet_viewed', { source: 'scorecard' }); } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          magnetType: 'scorecard',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      try { posthog.capture('lead_magnet_submitted', { source: 'scorecard' }); } catch {}
      setSubmitted(true);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-f1 { animation: fadeUp 0.5s 0.0s ease-out both; }
        .anim-f2 { animation: fadeUp 0.5s 0.1s ease-out both; }
        .anim-f3 { animation: fadeUp 0.5s 0.2s ease-out both; }
        .anim-f4 { animation: fadeUp 0.5s 0.3s ease-out both; }
        .anim-f5 { animation: fadeUp 0.5s 0.4s ease-out both; }
        @keyframes pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .anim-pop { animation: pop 0.5s 0.1s ease-out both; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: '#09090f' }}>

        {/* Ambient atmosphere */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.05) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(124,91,246,0.035) 0%, transparent 70%)' }} />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5">
          <Link href="/" className="text-base font-bold" style={{ color: '#ededf5' }}>
            Mindset<span style={{ color: '#4f6ef7' }}>OS</span>
          </Link>
          <span className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ color: '#9090a8', background: '#12121f', border: '1px solid #1e1e30' }}>
            Free · 20 Questions · Instant Score
          </span>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-10">
          <div className="w-full max-w-xl">

            {!submitted ? (
              <>
                {/* Eyebrow */}
                <p className="anim-f1 text-xs font-bold tracking-widest uppercase text-center mb-5"
                  style={{ color: '#fcc824' }}>
                  The Entrepreneur's Thinking Scorecard
                </p>

                {/* H1 */}
                <h1 className="anim-f2 text-3xl md:text-4xl font-bold text-[#ededf5] text-center leading-tight mb-4">
                  Find out exactly where your mind is helping — and where it's getting in the way.
                </h1>

                {/* Subhead */}
                <p className="anim-f3 text-[#9090a8] text-center text-base leading-relaxed mb-10">
                  Score yourself across 4 thinking domains. Get a precise diagnosis of the pattern dragging down your business.
                </p>

                {/* Benefit cards */}
                <div className="anim-f4 space-y-3 mb-10">
                  {[
                    {
                      Icon: Brain,
                      color: '#4f6ef7',
                      title: 'Score yourself across 4 domains',
                      desc: 'Clarity, Resilience, Decision Quality, Identity Stability. Rated 1–25 each.',
                    },
                    {
                      Icon: Target,
                      color: '#7c5bf6',
                      title: 'See exactly which domain is your bottleneck',
                      desc: 'Not vague advice. A precise score that tells you where the money is leaking.',
                    },
                    {
                      Icon: Zap,
                      color: '#fcc824',
                      title: 'Get a smart recommendation',
                      desc: "Based on your lowest score, you'll know exactly what to work on first.",
                    },
                  ].map(({ Icon, color, title, desc }, i) => (
                    <div key={i} className="rounded-xl p-5 flex gap-4 items-start"
                      style={{ background: '#12121f', border: '1px solid #1e1e30' }}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1" style={{ color: '#ededf5' }}>{title}</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form card */}
                <div className="anim-f5 bg-[#12121f] border border-[#1e1e30] rounded-2xl p-6">
                  <p className="text-[#9090a8] text-sm mb-5">
                    Enter your name and email. We'll send your scorecard immediately.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] rounded-xl px-4 py-3 text-[#ededf5] placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#fcc824]/50 focus:border-[#fcc824] text-sm transition-colors"
                    />

                    <div>
                      <input
                        type="email"
                        placeholder="Your email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full bg-[#09090f] border border-[#1e1e30] rounded-xl px-4 py-3 text-[#ededf5] placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#fcc824]/50 focus:border-[#fcc824] text-sm transition-colors"
                      />
                      <p className="text-[#9090a8]/60 text-xs mt-1.5 pl-1">
                        We'll send your score here
                      </p>
                    </div>

                    {formError && (
                      <p className="text-red-400 text-xs">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !email.trim()}
                      className="w-full bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold py-3.5 px-6 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send My Scorecard →'
                      )}
                    </button>
                  </form>

                  <p className="text-[#9090a8]/50 text-xs text-center mt-3">
                    No spam. Unsubscribe anytime.
                  </p>
                </div>
              </>
            ) : (
              /* Thank-you state */
              <div className="anim-f1 text-center">
                {/* Animated gold checkmark */}
                <div className="anim-pop w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(252,200,36,0.15)', border: '2px solid rgba(252,200,36,0.5)', boxShadow: '0 0 32px rgba(252,200,36,0.15)' }}>
                  <span className="text-3xl font-bold" style={{ color: '#fcc824' }}>✓</span>
                </div>

                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#fcc824' }}>
                  You're in
                </p>

                <h2 className="text-2xl md:text-3xl font-bold text-[#ededf5] mb-3">
                  Your Scorecard is on its way.
                </h2>

                <p className="text-[#9090a8] text-base leading-relaxed mb-3 max-w-sm mx-auto">
                  Check your inbox — it should be there in under a minute. Pay close attention to your lowest domain. That's your leverage point.
                </p>

                <p className="text-[#9090a8]/60 text-sm mb-8 max-w-sm mx-auto">
                  While you wait — go deeper with MindsetOS.
                </p>

                {/* Primary CTA */}
                <Link
                  href="/trial-v3b"
                  className="inline-flex items-center gap-2 font-semibold py-3.5 px-8 rounded-xl text-sm transition-all hover:scale-[1.02]"
                  style={{ background: '#fcc824', color: '#09090f' }}
                >
                  Start Free Trial →
                </Link>

                {/* Secondary CTA */}
                <p className="mt-4">
                  <Link
                    href="/quiz"
                    className="text-[#4f6ef7] text-sm hover:text-[#6b84f9] transition-colors"
                  >
                    → Take the Thinking Style Quiz first
                  </Link>
                </p>

                <p className="mt-3">
                  <Link href="/" className="text-[#9090a8]/50 text-sm hover:text-[#9090a8] transition-colors">
                    or explore MindsetOS →
                  </Link>
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </>
  );
}

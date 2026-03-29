'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ScorecardPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
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
      `}</style>

      <div className="min-h-screen bg-[#09090f] flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="text-base font-bold text-[#ededf5]">
            Mindset<span className="text-[#4f6ef7]">OS</span>
          </Link>
          <span className="text-xs font-medium text-[#9090a8] bg-[#12121f] border border-[#1e1e30] px-3 py-1.5 rounded-full">
            Free · 20 Questions · Instant Score
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
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
                  <div className="bg-[#12121f] border border-[#1e1e30] rounded-xl p-5 flex gap-4 items-start">
                    <span className="text-xl leading-none mt-0.5">🧠</span>
                    <div>
                      <p className="text-[#ededf5] font-semibold text-sm mb-1">
                        Score yourself across 4 domains
                      </p>
                      <p className="text-[#9090a8] text-sm leading-relaxed">
                        Clarity, Resilience, Decision Quality, Identity Stability. Rated 1–25 each.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#12121f] border border-[#1e1e30] rounded-xl p-5 flex gap-4 items-start">
                    <span className="text-xl leading-none mt-0.5">🎯</span>
                    <div>
                      <p className="text-[#ededf5] font-semibold text-sm mb-1">
                        See exactly which domain is your bottleneck
                      </p>
                      <p className="text-[#9090a8] text-sm leading-relaxed">
                        Not vague advice. A precise score that tells you where the money is leaking.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#12121f] border border-[#1e1e30] rounded-xl p-5 flex gap-4 items-start">
                    <span className="text-xl leading-none mt-0.5">⚡</span>
                    <div>
                      <p className="text-[#ededf5] font-semibold text-sm mb-1">
                        Get a smart recommendation
                      </p>
                      <p className="text-[#9090a8] text-sm leading-relaxed">
                        Based on your lowest score, you'll know exactly what to work on first.
                      </p>
                    </div>
                  </div>
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
                      className="w-full bg-[#12121f] border border-[#1e1e30] rounded-xl px-4 py-3 text-[#ededf5] placeholder:text-[#9090a8]/60 focus:outline-none focus:border-[#4f6ef7]/60 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Work email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full bg-[#12121f] border border-[#1e1e30] rounded-xl px-4 py-3 text-[#ededf5] placeholder:text-[#9090a8]/60 focus:outline-none focus:border-[#4f6ef7]/60 text-sm"
                    />

                    {formError && (
                      <p className="text-red-400 text-xs">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !email.trim()}
                      className="w-full bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold py-3.5 px-6 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Sending...' : 'Send My Scorecard →'}
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
                {/* Gold checkmark */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(252,200,36,0.12)', border: '1px solid rgba(252,200,36,0.3)' }}>
                  <span className="text-2xl font-bold" style={{ color: '#fcc824' }}>✓</span>
                </div>

                <h2 className="text-2xl font-bold text-[#ededf5] mb-3">
                  It's on its way.
                </h2>

                <p className="text-[#9090a8] text-base leading-relaxed mb-8 max-w-sm mx-auto">
                  Your Thinking Scorecard is on its way. Check your inbox — it should be there in under a minute.
                </p>

                <Link
                  href="/quiz"
                  className="inline-block bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold py-3 px-7 rounded-xl text-sm transition-colors"
                >
                  → Take the Thinking Style Quiz
                </Link>

                <p className="mt-4">
                  <Link href="/" className="text-[#9090a8]/60 text-sm hover:text-[#9090a8] transition-colors">
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

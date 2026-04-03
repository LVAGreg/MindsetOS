'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import posthog from 'posthog-js';

export default function SevenDaysPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    try { posthog.capture('lead_magnet_viewed', { source: '7days' }); } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || submitting) return;

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          firstName: firstName.trim(),
          magnetType: '7days',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      try { posthog.capture('lead_magnet_submitted', { source: '7days' }); } catch {}
      setSubmitted(true);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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

      <div className="min-h-screen bg-[#09090f] flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="text-base font-bold text-[#ededf5]">
            Mindset<span className="text-[#4f6ef7]">OS</span>
          </Link>
          <span className="text-xs font-medium text-[#9090a8] bg-[#12121f] border border-[#1e1e30] px-3 py-1.5 rounded-full">
            Free · 7 Emails · One Per Morning
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
          <div className="w-full max-w-xl">

            {!submitted ? (
              <>
                {/* Eyebrow */}
                <p className="anim-f1 text-xs font-bold tracking-widest uppercase text-center mb-5"
                  style={{ color: '#fcc824' }}>
                  7 Days to a Clearer Head
                </p>

                {/* H1 */}
                <h1 className="anim-f2 text-3xl md:text-4xl font-bold text-[#ededf5] text-center leading-tight mb-4">
                  Stop thinking in circles. One short email per morning for 7 days.
                </h1>

                {/* Subhead */}
                <p className="anim-f3 text-[#9090a8] text-center text-base leading-relaxed mb-10">
                  Each email gives you a single idea about how your mind actually works — plus one small thing to notice before the next one arrives. No homework. No worksheets.
                </p>

                {/* Benefit cards */}
                <div className="anim-f4 space-y-3 mb-10">
                  <div className="bg-[#12121f] border border-[#1e1e30] rounded-xl p-5 flex gap-4 items-start">
                    <span className="text-xl leading-none mt-0.5">🧠</span>
                    <div>
                      <p className="text-[#ededf5] font-semibold text-sm mb-1">
                        Name the 3 thoughts running your business
                      </p>
                      <p className="text-[#9090a8] text-sm leading-relaxed">
                        Identity, Control, and Scarcity. You'll spot yours by Day 3.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#12121f] border border-[#1e1e30] rounded-xl p-5 flex gap-4 items-start">
                    <span className="text-xl leading-none mt-0.5">⚡</span>
                    <div>
                      <p className="text-[#ededf5] font-semibold text-sm mb-1">
                        Find The Gap
                      </p>
                      <p className="text-[#9090a8] text-sm leading-relaxed">
                        The 2-second window between trigger and reaction. Where every deliberate decision lives.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#12121f] border border-[#1e1e30] rounded-xl p-5 flex gap-4 items-start">
                    <span className="text-xl leading-none mt-0.5">🎯</span>
                    <div>
                      <p className="text-[#ededf5] font-semibold text-sm mb-1">
                        The one question that clears any fog
                      </p>
                      <p className="text-[#9090a8] text-sm leading-relaxed">
                        Day 6. Embarrassingly simple. Works almost every time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form card */}
                <div className="anim-f5 bg-[#12121f] border border-[#1e1e30] rounded-2xl p-6">
                  <p className="text-[#9090a8] text-sm mb-5">
                    Enter your email. Day 1 lands in your inbox immediately.
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
                        Day 1 goes here
                      </p>
                    </div>

                    {formError && (
                      <p className="text-red-400 text-xs">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !email.trim()}
                      className="w-full bg-[#4f6ef7] hover:bg-[#3d5ce0] text-[#ededf5] font-semibold py-3.5 px-6 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Me Day 1 →'
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
                  Day 1 is on its way
                </p>

                <h2 className="text-2xl md:text-3xl font-bold text-[#ededf5] mb-3">
                  See you every morning for 7 days.
                </h2>

                <p className="text-[#9090a8] text-base leading-relaxed mb-3 max-w-sm mx-auto">
                  Subject line: "You're not undisciplined. You're just stuck in a loop." Check your inbox — it should be there in under a minute.
                </p>

                <p className="text-[#9090a8]/60 text-sm mb-8 max-w-sm mx-auto">
                  Want to go further while you wait?
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

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { CheckCircle, Lock, ArrowRight, Zap, Brain, Clock, Star, Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mindset-os-backend-production.up.railway.app';

const WHAT_YOU_GET = [
  { icon: Brain, title: '48-Hour Mindset Reset Challenge', desc: '6 AI-guided exercises to interrupt reactive patterns — done in under 10 min/day' },
  { icon: Zap, title: 'Full Access to 10 AI Coaches', desc: 'Mindset Score, Architecture Coach, Decision Framework, Accountability Partner, and more' },
  { icon: Star, title: 'Personalized Practice Builder', desc: 'AI creates a 5-10 minute daily practice specific to your growth edge' },
  { icon: Clock, title: 'Story Excavator + Inner World Mapper', desc: 'Surface the narratives running your decisions and design better ones' },
];

const TESTIMONIALS = [
  { name: 'Jason M.', role: 'Founder, SaaS company', quote: 'Within 48 hours I had clarity on a decision I\'d been avoiding for 6 months. This thing is sharp.' },
  { name: 'Sarah K.', role: 'Executive Coach', quote: 'The Reset challenge alone was worth 10x what I paid. The guided exercises hit differently when they\'re personalized.' },
  { name: 'Marcus T.', role: 'Entrepreneur', quote: 'I was skeptical. I\'m not skeptical anymore. My operating system actually changed.' },
];

export default function BuyResetPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/api/checkout/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan: 'reset_47' }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <MindsetOSLogo className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <Lock className="w-3 h-3" /> Secure checkout · Stripe
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-5">
            <Zap className="w-3 h-3" /> 48-HOUR RESET · ONE-TIME $47
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
            Stop reacting.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Start designing.
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            The 48-Hour Mindset Reset gives you a personal AI mindset coach, 6 guided exercises, and full access to 10 specialized agents — for less than dinner out.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Left: What you get */}
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-white mb-4">What&apos;s included</h2>
              <div className="space-y-4">
                {WHAT_YOU_GET.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-sm text-white/50 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">What people say</h3>
              {TESTIMONIALS.map(t => (
                <div key={t.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-white/70 italic mb-2">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-xs text-white/40">— {t.name}, {t.role}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-white/40">
              <Shield className="w-4 h-4" />
              <span>30-day money-back guarantee. No questions asked.</span>
            </div>
          </div>

          {/* Right: Checkout form */}
          <div className="sticky top-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              {/* Price */}
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-white">$47</p>
                <p className="text-sm text-white/40 mt-1">One-time payment · Instant access</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">First name</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      required
                      placeholder="Greg"
                      className="w-full px-3 py-2.5 text-sm bg-white/10 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Last name</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      required
                      placeholder="Smith"
                      className="w-full px-3 py-2.5 text-sm bg-white/10 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    required
                    placeholder="greg@mindset.show"
                    className="w-full px-3 py-2.5 text-sm bg-white/10 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all disabled:opacity-60 text-sm"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Get Instant Access — $47 <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 pt-1">
                  {['Secure payment', 'Instant access', '30-day guarantee'].map(l => (
                    <div key={l} className="flex items-center gap-1 text-xs text-white/30">
                      <CheckCircle className="w-3 h-3" /> {l}
                    </div>
                  ))}
                </div>
              </form>
            </div>

            <p className="text-center text-xs text-white/30 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

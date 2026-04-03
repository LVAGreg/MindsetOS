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

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

function validateForm(form: { firstName: string; lastName: string; email: string }): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = 'First name is required';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required';
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }
  return errors;
}

export default function BuyResetPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const update = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    // Clear field error on change
    if (fieldErrors[k]) setFieldErrors(p => ({ ...p, [k]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/checkout/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan: 'reset_47' }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#ededf5]" style={{ background: '#09090f' }}>
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e30]">
        <Link href="/" className="flex items-center gap-2">
          <MindsetOSLogo className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5a5a72' }}>
          <Lock className="w-3 h-3" /> Secure checkout · Stripe
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
            style={{
              background: 'rgba(79,110,247,0.12)',
              border: '1px solid rgba(79,110,247,0.25)',
              color: '#4f6ef7',
            }}
          >
            <Zap className="w-3 h-3" /> 48-HOUR RESET · ONE-TIME $47
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
            Stop reacting.<br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(to right, #4f6ef7, #7c5bf6)' }}
            >
              Start designing.
            </span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#9090a8' }}>
            The 48-Hour Mindset Reset gives you a personal AI mindset coach, 6 guided exercises, and full access to 10 specialized agents — for less than dinner out.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Left: What you get */}
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold mb-4" style={{ color: '#ededf5' }}>What&apos;s included</h2>
              <div className="space-y-4">
                {WHAT_YOU_GET.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: 'rgba(79,110,247,0.12)',
                        border: '1px solid rgba(79,110,247,0.25)',
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: '#4f6ef7' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#ededf5' }}>{title}</p>
                      <p className="text-sm mt-0.5" style={{ color: '#9090a8' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#5a5a72' }}>What people say</h3>
              {TESTIMONIALS.map(t => (
                <div
                  key={t.name}
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
                >
                  <p className="text-sm italic mb-2" style={{ color: '#9090a8' }}>&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-xs" style={{ color: '#5a5a72' }}>— {t.name}, {t.role}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: '#5a5a72' }}>
              <Shield className="w-4 h-4" />
              <span>30-day money-back guarantee. No questions asked.</span>
            </div>
          </div>

          {/* Right: Checkout form */}
          <div className="sticky top-8">
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
            >
              {/* Price */}
              <div className="text-center mb-6">
                <p className="text-4xl font-bold" style={{ color: '#ededf5' }}>$47</p>
                <p className="text-sm mt-1" style={{ color: '#5a5a72' }}>One-time payment · Instant access</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>First name</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      placeholder="Greg"
                      className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] focus:border-transparent transition-colors"
                      style={{
                        background: 'rgba(30,30,48,0.8)',
                        border: fieldErrors.firstName ? '1px solid #ef4444' : '1px solid #1e1e30',
                        color: '#ededf5',
                      }}
                    />
                    {fieldErrors.firstName && (
                      <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Last name</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      placeholder="Smith"
                      className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] focus:border-transparent transition-colors"
                      style={{
                        background: 'rgba(30,30,48,0.8)',
                        border: fieldErrors.lastName ? '1px solid #ef4444' : '1px solid #1e1e30',
                        color: '#ededf5',
                      }}
                    />
                    {fieldErrors.lastName && (
                      <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="greg@mindset.show"
                    className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] focus:border-transparent transition-colors"
                    style={{
                      background: 'rgba(30,30,48,0.8)',
                      border: fieldErrors.email ? '1px solid #ef4444' : '1px solid #1e1e30',
                      color: '#ededf5',
                    }}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{fieldErrors.email}</p>
                  )}
                </div>

                {error && (
                  <p
                    className="text-sm rounded-lg px-3 py-2"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 font-semibold rounded-xl transition-all text-sm"
                  style={{
                    background: loading ? 'rgba(79,110,247,0.5)' : '#4f6ef7',
                    color: '#ededf5',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        className="w-4 h-4 rounded-full animate-spin"
                        style={{ border: '2px solid rgba(237,237,245,0.25)', borderTopColor: '#ededf5' }}
                      />
                      <span>Redirecting to checkout…</span>
                    </>
                  ) : (
                    <>
                      Get Instant Access — $47 <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 pt-1">
                  {['Secure payment', 'Instant access', '30-day guarantee'].map(l => (
                    <div key={l} className="flex items-center gap-1 text-xs" style={{ color: '#5a5a72' }}>
                      <CheckCircle className="w-3 h-3" /> {l}
                    </div>
                  ))}
                </div>
              </form>
            </div>

            <p className="text-center text-xs mt-4" style={{ color: '#5a5a72' }}>
              Already have an account?{' '}
              <Link href="/login" className="underline hover:opacity-80 transition-opacity" style={{ color: '#4f6ef7' }}>Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

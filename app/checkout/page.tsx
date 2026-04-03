'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle,
  Shield,
  Lock,
  CreditCard,
  Loader2,
  Sparkles,
  ArrowRight,
  Gift,
  Star,
  Zap,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mindset-os-backend-production.up.railway.app';

const SENJA_WIDGET_ID = '274fb8ab-554d-41c6-b72e-c83e0b527376';

function SenjaTestimonials() {
  useEffect(() => {
    const existing = document.querySelector(`script[src*="${SENJA_WIDGET_ID}"]`);
    if (existing) return;
    const script = document.createElement('script');
    script.src = `https://widget.senja.io/widget/${SENJA_WIDGET_ID}/platform.js`;
    script.async = true;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return (
    <div>
      <h3 className="text-sm font-bold text-white/90 mb-4 tracking-wide uppercase">What MindsetOS Clients Say</h3>
      <div
        className="senja-embed"
        data-id={SENJA_WIDGET_ID}
        data-mode="shadow"
        data-lazyload="false"
      />
    </div>
  );
}

const WHAT_YOU_GET = [
  {
    title: 'Full Access to 10 AI Mindset Coaching Agents',
    desc: 'Mindset Score, Reset Guide, Architecture Coach, Practice Builder, and 6 more \u2014 all fully unlocked',
  },
  {
    title: 'The 48-Hour Mindset Reset Challenge',
    desc: '6 guided exercises to interrupt reactive patterns and design your operating system',
  },
  {
    title: 'Personalized Daily Mindset Practice',
    desc: 'AI-built 5-10 minute routines tailored to your specific growth edge',
  },
  {
    title: '90-Day Architecture Program Access',
    desc: 'Group cohort companion with accountability tracking and milestone celebrations',
  },
  {
    title: 'A Clear Path From Reactive \u2192 Intentional \u2192 Designed',
    desc: 'Awareness, interruption, and architecture \u2014 the 3-layer system that changes everything',
  },
];

const BONUSES = [
  { name: 'Access to the MindsetOS Community', value: '$500' },
  { name: 'Personalized Mindset Score Report', value: '$200' },
  { name: 'Story Excavator Deep-Dive Session', value: '$300' },
  { name: 'Decision Framework Toolkit', value: '$250' },
  { name: 'Accountability Partner \u2014 Daily Check-in System', value: '$400' },
];

type PricingPlan = 'weekly' | 'upfront' | 'architecture_997' | 'individual_annual' | 'intensive_1997';

/* ------------------------------------------------------------------ */
/*  Checkout Steps Indicator                                          */
/* ------------------------------------------------------------------ */
function StepsIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-3">
      {/* Step 1 - Active */}
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-full bg-[#fcc824] text-black text-xs font-bold flex items-center justify-center">1</span>
        <span className="text-xs font-medium text-[#fcc824] hidden sm:inline">Your Details</span>
      </div>
      <div className="w-6 sm:w-10 h-px bg-white/20" />
      {/* Step 2 */}
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-full border border-white/20 text-white/40 text-xs font-bold flex items-center justify-center">2</span>
        <span className="text-xs font-medium text-white/40 hidden sm:inline">Payment</span>
      </div>
      <div className="w-6 sm:w-10 h-px bg-white/20" />
      {/* Step 3 */}
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-full border border-white/20 text-white/40 text-xs font-bold flex items-center justify-center">3</span>
        <span className="text-xs font-medium text-white/40 hidden sm:inline">Access</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Checkout Page                                                */
/* ------------------------------------------------------------------ */
function CheckoutPageInner() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') as PricingPlan | null;
  const validPlans: PricingPlan[] = ['weekly', 'upfront', 'architecture_997', 'individual_annual', 'intensive_1997'];
  const initialPlan: PricingPlan = planParam && validPlans.includes(planParam) ? planParam : 'weekly';

  const [plan, setPlan] = useState<PricingPlan>(initialPlan);
  const [addons, setAddons] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const priceMap: Record<PricingPlan, number> = { weekly: 47, upfront: 397, architecture_997: 997, individual_annual: 1997, intensive_1997: 1997 };
  const price = priceMap[plan];
  const addonPrice = (plan === 'architecture_997' && addons.has('1on1_intensive')) ? 1000 : 0;
  const totalDue = price + addonPrice;

  function toggleAddon(key: string) {
    setAddons(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handlePlanChange(p: PricingPlan) {
    setPlan(p);
    // Clear addons that are incompatible with new plan
    if (p !== 'architecture_997') setAddons(new Set());
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !email) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch(`${API_URL}/api/checkout/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          addons: Array.from(addons),
          firstName,
          lastName,
          email,
          phone,
        }),
      });

      let data: { error?: string; url?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response body is not JSON — surface status
      }

      if (!res.ok) {
        const statusContext = (() => {
          if (res.status === 402) return 'Payment declined — please check your card details.';
          if (res.status === 409) return 'An account with this email already exists. Try logging in.';
          if (res.status === 422) return 'Invalid details — please review your information and try again.';
          if (res.status >= 500) return `Server error (${res.status}) — please try again in a moment.`;
          return `Something went wrong (${res.status}).`;
        })();
        throw new Error(data.error || statusContext);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f] text-white relative overflow-hidden">

      {/* ===== Atmospheric background ===== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Primary warm orb top-left */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[160px]" style={{ background: 'rgba(252,200,36,0.06)' }} />
        {/* Secondary cool orb bottom-right */}
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[180px]" style={{ background: 'rgba(79,110,247,0.04)' }} />
        {/* Center subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-[200px]" style={{ background: 'rgba(124,91,246,0.02)' }} />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ===== Top bar ===== */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#09090f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MindsetOSLogo size="md" variant="light" />
            <span className="text-base font-semibold text-white/60 hidden sm:inline">
              <span className="text-white/20 font-normal mx-1.5">|</span>
              Mindset Architecture
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Checkout</span>
          </div>
        </div>
        <StepsIndicator />
      </header>

      {/* ===== Main content ===== */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">

          {/* =========================================================
              LEFT COLUMN: Form (7 cols on lg)
              ========================================================= */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* --- Contact Details --- */}
              <section className="checkout-section-animate" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#fcc824]/10 flex items-center justify-center text-[#fcc824] text-xs font-bold">1</span>
                  Contact Details
                </h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative group">
                      <label htmlFor="firstName" className="sr-only">First name</label>
                      <input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#fcc824]/50 focus:border-[#fcc824]/40 focus:bg-white/[0.06] transition-all duration-300"
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="relative group">
                      <label htmlFor="lastName" className="sr-only">Last name</label>
                      <input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#fcc824]/50 focus:border-[#fcc824]/40 focus:bg-white/[0.06] transition-all duration-300"
                        required
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="sr-only">Email address</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#fcc824]/50 focus:border-[#fcc824]/40 focus:bg-white/[0.06] transition-all duration-300"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="sr-only">Phone number (optional)</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="Phone (optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#fcc824]/50 focus:border-[#fcc824]/40 focus:bg-white/[0.06] transition-all duration-300"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </section>

              {/* --- Pricing Plan Toggle --- */}
              <section className="checkout-section-animate" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#fcc824]/10 flex items-center justify-center text-[#fcc824] text-xs font-bold">2</span>
                  Choose Your Plan
                </h2>
                <div className="space-y-3">
                  {/* Weekly option */}
                  <label
                    className={`group flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      plan === 'weekly'
                        ? 'border-[#fcc824]/60 bg-[#fcc824]/[0.06]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="weekly"
                      checked={plan === 'weekly'}
                      onChange={() => handlePlanChange('weekly')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      plan === 'weekly' ? 'border-[#fcc824]' : 'border-white/20'
                    }`}>
                      {plan === 'weekly' && <div className="w-2.5 h-2.5 rounded-full bg-[#fcc824]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-extrabold text-white tracking-tight">$47</span>
                        <span className="text-sm text-white/40 font-medium">/week</span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">$47 USD today, then $47/wk billed weekly</div>
                    </div>
                  </label>

                  {/* Upfront option */}
                  <label
                    className={`group relative flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      plan === 'upfront'
                        ? 'border-[#fcc824]/60 bg-[#fcc824]/[0.06]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="upfront"
                      checked={plan === 'upfront'}
                      onChange={() => handlePlanChange('upfront')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      plan === 'upfront' ? 'border-[#fcc824]' : 'border-white/20'
                    }`}>
                      {plan === 'upfront' && <div className="w-2.5 h-2.5 rounded-full bg-[#fcc824]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-extrabold text-white tracking-tight">$397</span>
                        <span className="text-sm text-white/40 font-medium">one-time</span>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full"
                          style={{ background: 'rgba(79,110,247,0.12)', color: '#7c9fff', border: '1px solid rgba(79,110,247,0.25)' }}
                        >
                          <Zap className="w-3 h-3" />
                          SAVE $167
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">12 weeks of full access for $397 USD</div>
                    </div>
                    {/* Best value badge */}
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-[#fcc824] text-black text-[10px] font-bold rounded-full tracking-wide">
                      BEST VALUE
                    </span>
                  </label>

                  {/* 90-Day Architecture — $997 */}
                  <label
                    className="group relative flex items-start gap-4 p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all duration-300"
                    style={plan === 'architecture_997'
                      ? { borderColor: 'rgba(124,91,246,0.6)', background: 'rgba(124,91,246,0.06)' }
                      : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                    onMouseEnter={e => { if (plan !== 'architecture_997') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,91,246,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,91,246,0.03)'; } }}
                    onMouseLeave={e => { if (plan !== 'architecture_997') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; } }}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="architecture_997"
                      checked={plan === 'architecture_997'}
                      onChange={() => handlePlanChange('architecture_997')}
                      className="sr-only"
                    />
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300"
                      style={{ borderColor: plan === 'architecture_997' ? '#7c5bf6' : 'rgba(255,255,255,0.2)' }}>
                      {plan === 'architecture_997' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#7c5bf6' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <span className="text-xl font-extrabold text-white tracking-tight">$997</span>
                        <span className="text-sm text-white/40 font-medium">one-time</span>
                      </div>
                      <div className="text-sm font-semibold text-white/80 mb-1">90-Day Mindset Architecture</div>
                      <div className="text-xs text-white/35 mb-2 leading-relaxed">
                        The full 90-day group cohort. 10 participants max. Daily agent access + weekly Architecture Coach sessions.
                      </div>
                      <ul className="space-y-1">
                        {['90 days of full agent access', 'Group cohort (10 people max)', 'Architecture Coach agent', 'Weekly group sessions', 'Memory across all agents'].map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-white/45">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#7c5bf6' }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 text-white text-[10px] font-bold rounded-full tracking-wide" style={{ background: '#7c5bf6' }}>
                      MOST POPULAR
                    </span>
                  </label>

                  {/* ── ADD-ON: 1:1 Intensive (only shown when Architecture is selected) ── */}
                  {plan === 'architecture_997' && (
                    <div className="mt-1 ml-2">
                      <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold mb-2">Optional Add-On</p>
                      <label
                        className="group flex items-start gap-4 p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all duration-300"
                        style={addons.has('1on1_intensive')
                          ? { borderColor: 'rgba(79,110,247,0.6)', background: 'rgba(79,110,247,0.06)' }
                          : { borderColor: 'rgba(255,255,255,0.10)', borderStyle: 'dashed', background: 'rgba(255,255,255,0.01)' }}
                        onMouseEnter={e => { if (!addons.has('1on1_intensive')) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,110,247,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.03)'; } }}
                        onMouseLeave={e => { if (!addons.has('1on1_intensive')) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.01)'; } }}
                      >
                        <input
                          id="addon-1on1-intensive"
                          type="checkbox"
                          checked={addons.has('1on1_intensive')}
                          onChange={() => toggleAddon('1on1_intensive')}
                          className="sr-only"
                          aria-label="Add 1:1 Architecture Intensive for $1,000"
                        />
                        <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200"
                          style={addons.has('1on1_intensive')
                            ? { borderColor: '#4f6ef7', background: '#4f6ef7' }
                            : { borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}>
                          {addons.has('1on1_intensive') && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap mb-1">
                            <span className="text-base font-bold text-white tracking-tight">+ $1,000</span>
                            <span className="text-xs text-white/40 font-medium">one-time</span>
                          </div>
                          <div className="text-sm font-semibold text-white/80 mb-1">1:1 Architecture Intensive</div>
                          <div className="text-xs text-white/35 mb-2 leading-relaxed">
                            Add 3 private coaching sessions with a certified Mindset Architecture coach. Personalized blueprint + priority support.
                          </div>
                          <ul className="space-y-1">
                            {['3 private 1:1 coaching sessions', 'Personalized mindset blueprint', 'Priority support access'].map((f) => (
                              <li key={f} className="flex items-center gap-1.5 text-[11px] text-white/45">
                                <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#4f6ef7' }} />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* MindsetOS Annual — $1,997/year */}
                  <label
                    className="group relative flex items-start gap-4 p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all duration-300"
                    style={plan === 'individual_annual'
                      ? { borderColor: 'rgba(79,110,247,0.6)', background: 'rgba(79,110,247,0.06)' }
                      : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                    onMouseEnter={e => { if (plan !== 'individual_annual') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,110,247,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.03)'; } }}
                    onMouseLeave={e => { if (plan !== 'individual_annual') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; } }}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="individual_annual"
                      checked={plan === 'individual_annual'}
                      onChange={() => handlePlanChange('individual_annual')}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300"
                      style={{ borderColor: plan === 'individual_annual' ? '#4f6ef7' : 'rgba(255,255,255,0.2)' }}
                    >
                      {plan === 'individual_annual' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#4f6ef7' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <span className="text-xl font-extrabold text-white tracking-tight">$1,997</span>
                        <span className="text-sm text-white/40 font-medium">/year</span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded tracking-wide"
                          style={{ background: 'rgba(79,110,247,0.1)', color: '#7c9fff', border: '1px solid rgba(79,110,247,0.2)' }}
                        >ANNUAL SUBSCRIPTION</span>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full"
                          style={{ background: 'rgba(79,110,247,0.1)', color: '#7c9fff', border: '1px solid rgba(79,110,247,0.2)' }}
                        >
                          <Zap className="w-3 h-3" />
                          SAVE $440
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white/80 mb-2">MindsetOS Annual</div>
                      <div className="text-xs text-white/35 mb-2 leading-relaxed">
                        Full platform access for a full year. Lock in your rate and commit to the long game.
                      </div>
                      <ul className="space-y-1">
                        {['365 days of full access', 'All 10 agents', 'Unlimited conversations', 'Save $440 vs weekly'].map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-white/45">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#4f6ef7' }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 text-white text-[10px] font-bold rounded-full tracking-wide" style={{ background: '#4f6ef7' }}>
                      BEST VALUE
                    </span>
                  </label>

                  {/* Architecture Intensive (1:1) — $1,997 one-time */}
                  <label
                    className="group relative flex items-start gap-4 p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all duration-300"
                    style={plan === 'intensive_1997'
                      ? { borderColor: 'rgba(124,91,246,0.6)', background: 'rgba(124,91,246,0.06)' }
                      : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                    onMouseEnter={e => { if (plan !== 'intensive_1997') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,91,246,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,91,246,0.03)'; } }}
                    onMouseLeave={e => { if (plan !== 'intensive_1997') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; } }}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="intensive_1997"
                      checked={plan === 'intensive_1997'}
                      onChange={() => handlePlanChange('intensive_1997')}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300"
                      style={{ borderColor: plan === 'intensive_1997' ? '#7c5bf6' : 'rgba(255,255,255,0.2)' }}
                    >
                      {plan === 'intensive_1997' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#7c5bf6' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <span className="text-xl font-extrabold text-white tracking-tight">$1,997</span>
                        <span className="text-sm text-white/40 font-medium">one-time</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white/80">Architecture Intensive (1:1)</span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded tracking-wide"
                          style={{ background: 'rgba(124,91,246,0.1)', color: '#b59fff', border: '1px solid rgba(124,91,246,0.2)' }}
                        >ONE-TIME PAYMENT</span>
                      </div>
                      <div className="text-xs text-white/35 mb-2 leading-relaxed">
                        Greg&apos;s flagship 1:1 program. Full 90-Day Architecture access plus 3 private coaching sessions, a personalized mindset blueprint, and priority support.
                      </div>
                      <ul className="space-y-1">
                        {['Full 90-Day Architecture program', '3 private 1:1 coaching sessions', 'Personalized mindset blueprint', 'Priority support & direct access'].map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-white/45">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#7c5bf6' }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 text-white text-[10px] font-bold rounded-full tracking-wide" style={{ background: '#7c5bf6' }}>
                      PREMIUM
                    </span>
                  </label>
                </div>
                <p className="text-[11px] text-white/20 text-right mt-2">All prices in USD</p>
              </section>

              {/* --- Order Summary Card --- */}
              <section className="checkout-section-animate" style={{ animationDelay: '0.35s' }}>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                    <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">Order Summary</h3>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-white/80">
                          {plan === 'architecture_997' ? '90-Day Mindset Architecture'
                            : plan === 'individual_annual' ? 'MindsetOS Annual'
                            : plan === 'intensive_1997' ? 'Architecture Intensive (1:1)'
                            : 'Mindset Architecture'}
                        </span>
                        <span className="text-xs text-white/30 ml-2">
                          ({plan === 'weekly' ? 'Weekly'
                            : plan === 'individual_annual' ? '1 Year'
                            : plan === 'architecture_997' ? '90-Day Cohort'
                            : plan === 'intensive_1997' ? 'One-Time'
                            : '12-Week Access'})
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white">${price.toLocaleString()}</span>
                    </div>
                    {addons.has('1on1_intensive') && plan === 'architecture_997' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4f6ef7' }} />
                          <span className="text-sm text-white/70">1:1 Architecture Intensive</span>
                        </div>
                        <span className="text-sm font-semibold text-white">+$1,000</span>
                      </div>
                    )}
                    {plan === 'weekly' && (
                      <p className="text-xs text-white/30">Renews at $47/wk. Cancel anytime.</p>
                    )}
                    {plan === 'individual_annual' && (
                      <p className="text-xs text-white/30">Renews annually at $1,997/yr. Cancel anytime.</p>
                    )}
                    <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Due Today</span>
                      <span className="text-2xl font-extrabold text-[#fcc824] tracking-tight">${totalDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* --- Secure payment note --- */}
              <div
                className="checkout-section-animate flex items-center gap-3 text-sm rounded-xl p-4"
                style={{ animationDelay: '0.4s', background: 'rgba(79,110,247,0.04)', border: '1px solid rgba(79,110,247,0.12)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(79,110,247,0.1)' }}>
                  <Lock className="w-4 h-4" style={{ color: '#4f6ef7' }} />
                </div>
                <span className="text-xs leading-relaxed text-white/50">
                  You&apos;ll enter your payment details securely on the next page via <strong className="text-white/70">Stripe</strong> &mdash; the world&apos;s most trusted payment processor.
                </span>
              </div>

              {/* --- Error --- */}
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="border text-sm p-4 rounded-xl flex items-start gap-3"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {/* --- Submit CTA --- */}
              <div className="checkout-section-animate" style={{ animationDelay: '0.45s' }}>
                <button
                  type="submit"
                  disabled={isProcessing}
                  aria-disabled={isProcessing}
                  aria-busy={isProcessing}
                  className="checkout-cta-btn group w-full py-4 sm:py-5 bg-[#fcc824] hover:bg-[#ffe066] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none text-black font-extrabold text-base sm:text-lg tracking-tight rounded-xl transition-all duration-300 shadow-[0_0_40px_rgba(252,200,36,0.15)] hover:shadow-[0_0_60px_rgba(252,200,36,0.3)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 relative overflow-hidden"
                >
                  {/* Shimmer sweep on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                  <span className="relative flex items-center gap-2.5">
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {plan === 'architecture_997' && addons.has('1on1_intensive') ? 'Enroll in Architecture + Intensive'
                          : plan === 'architecture_997' ? 'Enroll in Architecture'
                          : plan === 'individual_annual' ? 'Start Annual Plan'
                          : plan === 'intensive_1997' ? 'Enroll in Architecture Intensive'
                          : 'PROCEED TO PAY'}
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-white/20 text-center leading-relaxed">
                By proceeding, you authorize MindsetOS to charge you according to the plan terms until you cancel.
              </p>

              {/* --- Trust badges --- */}
              <div className="flex items-center justify-center gap-5 sm:gap-8 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/40 transition-colors">
                  <Shield className="w-4 h-4" />
                  <span>Secure</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/40 transition-colors">
                  <Lock className="w-4 h-4" />
                  <span>256-bit SSL</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/40 transition-colors">
                  <CreditCard className="w-4 h-4" />
                  <span>Stripe</span>
                </div>
              </div>
            </form>
          </div>

          {/* =========================================================
              RIGHT COLUMN: What You Get (5 cols on lg)
              ========================================================= */}
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div className="lg:sticky lg:top-8">

              {/* Hero intro */}
              <div className="checkout-section-animate mb-8" style={{ animationDelay: '0.05s' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fcc824]/[0.08] border border-[#fcc824]/20 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-[#fcc824]" />
                  <span className="text-xs font-semibold text-[#fcc824]">Limited Enrollment</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
                  Transform how you <span className="text-[#fcc824]">think</span>, decide, and perform.
                </h1>
                <p className="text-sm text-white/50 leading-relaxed">
                  Join <strong className="text-white/80">Mindset Architecture</strong> today &mdash; your 10 AI coaches + the frameworks, coaching, and bonuses that make your transformation unstoppable.
                </p>
              </div>

              {/* What you get */}
              <div className="checkout-section-animate mb-8" style={{ animationDelay: '0.15s' }}>
                <h3 className="text-sm font-bold text-white/90 mb-4 tracking-wide uppercase flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#fcc824]" />
                  Exactly What You Get
                </h3>
                <div className="space-y-3">
                  {WHAT_YOU_GET.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.04] transition-all duration-300"
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#fcc824]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#fcc824]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-white/90 leading-tight">{item.title}</span>
                        <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 ml-9">
                  <p className="text-xs text-white/40 leading-relaxed">
                    <strong className="text-white/60">Included:</strong> Implementation workbook with templates, exercises, frameworks, and real examples to start rewiring your mindset immediately.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.06] my-6" />

              {/* Bonuses */}
              <div className="checkout-section-animate mb-8" style={{ animationDelay: '0.25s' }}>
                <h3 className="text-sm font-bold text-white/90 mb-1 tracking-wide uppercase flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#fcc824]" />
                  Plus Bonuses
                </h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-xs text-white/35">Total bonus value:</span>
                  <span className="text-sm font-extrabold text-[#fcc824]">$1,650</span>
                </div>
                <div className="space-y-2">
                  {BONUSES.map((bonus, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#fcc824]/[0.03] border border-[#fcc824]/[0.08] hover:border-[#fcc824]/20 transition-all duration-300"
                    >
                      <div className="w-5 h-5 rounded-md bg-[#fcc824]/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-[#fcc824]" />
                      </div>
                      <span className="text-sm text-white/70 flex-1 min-w-0">{bonus.name}</span>
                      <span className="text-xs font-bold text-white/30 line-through flex-shrink-0">{bonus.value}</span>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: '#4f6ef7' }}>FREE</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.06] my-6" />

              {/* Testimonials */}
              <div className="checkout-section-animate" style={{ animationDelay: '0.35s' }}>
                <SenjaTestimonials />
              </div>

              {/* Support */}
              <div className="mt-8 text-center">
                <p className="text-xs text-white/25">
                  Need help? Contact us at{' '}
                  <a href="mailto:hello@mindset.show" className="text-[#fcc824]/70 hover:text-[#fcc824] transition-colors underline underline-offset-2 decoration-[#fcc824]/30">
                    hello@mindset.show
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="relative z-10 border-t border-white/[0.06] py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/20">
          <span>&copy; 2026 MindsetOS. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white/40 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/40 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

      {/* Animations are defined in globals.css under .checkout-section-animate */}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090f]" />}>
      <CheckoutPageInner />
    </Suspense>
  );
}

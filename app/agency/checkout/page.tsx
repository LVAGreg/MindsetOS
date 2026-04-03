'use client';

import { useState, Suspense, FormEvent } from 'react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Shield,
  Lock,
  CreditCard,
  Loader2,
  Users,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mindset-os-backend-production.up.railway.app';

type PracticePlan = 'practice5' | 'practice10';

const PLAN_DETAILS: Record<PracticePlan, { name: string; price: number; accounts: number; desc: string }> = {
  practice5: {
    name: 'Practice 5',
    price: 297,
    accounts: 5,
    desc: '5 coaching clients + custom agents + all AI agents',
  },
  practice10: {
    name: 'Practice 10',
    price: 397,
    accounts: 10,
    desc: '10 coaching clients + custom agents + all AI agents',
  },
};

const INCLUDED = [
  'All 10+ MindsetOS AI coaching agents',
  'Multi-client management with instant switching',
  'Per-client AI memory, coaching notes & exercises',
  'Custom Agent Creator \u2014 build your own coaching agents',
  'Granular memory controls (4 categories)',
  'Per-client knowledge base uploads',
  'Agent activation controls per client',
  'Mindset Architecture training + coaching included',
  'Fair-use monthly token allowance',
];

function CoachingPracticeCheckoutInner() {
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PracticePlan) || 'practice5';

  const [plan, setPlan] = useState<PracticePlan>(
    initialPlan === 'practice10' ? 'practice10' : 'practice5'
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const details = PLAN_DETAILS[plan];

  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponApplied(false);
    if (!coupon.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    // Server validates the coupon at checkout session creation
    setCouponApplied(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch(`${API_URL}/api/checkout/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          firstName,
          lastName,
          email,
          phone,
          coupon: couponApplied ? coupon : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Checkout session error. Please contact support.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090f', color: '#ededf5' }}>
      {/* Top bar */}
      <div className="backdrop-blur-xl" style={{ borderBottom: '1px solid #1e1e30', backgroundColor: 'rgba(9,9,15,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agency" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <MindsetOSLogo size="md" variant="light" />
              <span className="text-lg font-bold" style={{ color: '#ededf5' }}>
                <span className="font-normal mx-1.5" style={{ color: '#5a5a72' }}>/</span>
                <span style={{ color: '#9090a8' }}>Coaching Practice</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#5a5a72' }}>
            <Lock className="w-4 h-4" style={{ color: 'rgba(52,211,153,0.6)' }} />
            <span>Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20">

          {/* LEFT: Form */}
          <div className="order-2 lg:order-1">
            <form onSubmit={handleSubmit} className="space-y-7">

              {/* Contact Details */}
              <div>
                <h2 className="text-lg font-bold mb-1" style={{ color: '#ededf5' }}>Contact Details</h2>
                <p className="text-xs mb-5" style={{ color: '#5a5a72' }}>We&apos;ll use this to set up your account.</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 ml-1" style={{ color: '#9090a8' }}>First name *</label>
                      <input
                        type="text"
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none focus:ring-2 focus:ring-[#fcc824]/40"
                        style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 ml-1" style={{ color: '#9090a8' }}>Last name *</label>
                      <input
                        type="text"
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none focus:ring-2 focus:ring-[#fcc824]/40"
                        style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 ml-1" style={{ color: '#9090a8' }}>Email address *</label>
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none focus:ring-2 focus:ring-[#fcc824]/40"
                      style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 ml-1" style={{ color: '#9090a8' }}>Phone <span style={{ color: '#5a5a72' }}>(optional)</span></label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none focus:ring-2 focus:ring-[#fcc824]/40"
                      style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, #1e1e30, transparent)' }} />

              {/* Plan Toggle */}
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#ededf5' }}>Choose your plan</h3>
                <p className="text-xs mb-4" style={{ color: '#5a5a72' }}>You can upgrade anytime from the dashboard.</p>
                <div className="space-y-3">
                  <label
                    className="group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300"
                    style={plan === 'practice5'
                      ? { borderColor: 'rgba(252,200,36,0.5)', backgroundColor: 'rgba(252,200,36,0.04)', boxShadow: '0 0 25px rgba(252,200,36,0.06)' }
                      : { borderColor: '#1e1e30', backgroundColor: 'rgba(18,18,31,0.5)' }
                    }
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="practice5"
                      checked={plan === 'practice5'}
                      onChange={() => setPlan('practice5')}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{ borderColor: plan === 'practice5' ? '#fcc824' : '#5a5a72' }}
                    >
                      {plan === 'practice5' && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#fcc824' }} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
                        $297/mo
                        <span className="text-xs font-normal" style={{ color: '#5a5a72' }}>Practice 5</span>
                      </div>
                      <div className="text-xs" style={{ color: '#5a5a72' }}>5 coaching clients &middot; Billed monthly</div>
                    </div>
                    <Users className="w-5 h-5" style={{ color: '#5a5a72' }} />
                  </label>

                  <label
                    className="group relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300"
                    style={plan === 'practice10'
                      ? { borderColor: 'rgba(252,200,36,0.5)', backgroundColor: 'rgba(252,200,36,0.04)', boxShadow: '0 0 25px rgba(252,200,36,0.06)' }
                      : { borderColor: '#1e1e30', backgroundColor: 'rgba(18,18,31,0.5)' }
                    }
                  >
                    <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide" style={{ backgroundColor: '#10b981', color: '#ededf5' }}>
                      Best Value
                    </div>
                    <input
                      type="radio"
                      name="plan"
                      value="practice10"
                      checked={plan === 'practice10'}
                      onChange={() => setPlan('practice10')}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{ borderColor: plan === 'practice10' ? '#fcc824' : '#5a5a72' }}
                    >
                      {plan === 'practice10' && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#fcc824' }} />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
                        $397/mo
                        <span className="text-xs font-normal" style={{ color: '#5a5a72' }}>Practice 10</span>
                      </div>
                      <div className="text-xs" style={{ color: '#5a5a72' }}>10 coaching clients &middot; Billed monthly</div>
                    </div>
                    <Users className="w-5 h-5" style={{ color: '#5a5a72' }} />
                  </label>
                </div>
                <p className="text-[11px] text-right mt-2" style={{ color: '#5a5a72' }}>All prices in USD</p>
              </div>

              {/* Coupon */}
              <div>
                <label className="block text-xs font-medium mb-2 ml-1" style={{ color: '#9090a8' }}>Coupon code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={coupon}
                    onChange={(e) => { setCoupon(e.target.value); setCouponError(''); setCouponApplied(false); }}
                    className="flex-1 px-4 py-3 rounded-xl transition-all duration-300 outline-none focus:ring-2 focus:ring-[#fcc824]/40"
                    style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-5 py-3 font-semibold rounded-xl transition-all duration-300 text-sm hover:opacity-80"
                    style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#ededf5' }}
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-red-400 text-xs mt-1.5 ml-1">{couponError}</p>}
                {couponApplied && <p className="text-xs mt-1.5 ml-1" style={{ color: '#4ade80' }}>Coupon applied!</p>}
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, #1e1e30, transparent)' }} />

              {/* Order Summary */}
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#9090a8' }}>Order Summary</h3>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: '#9090a8' }}>{details.name} &mdash; {details.accounts} clients</span>
                  <span className="font-bold text-lg" style={{ color: '#ededf5' }}>${details.price}<span className="text-sm font-normal" style={{ color: '#5a5a72' }}>/mo</span></span>
                </div>
                <p className="text-xs" style={{ color: '#5a5a72' }}>{details.desc}</p>
                <div className="h-px my-3" style={{ backgroundColor: '#1e1e30' }} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: '#9090a8' }}>Due today</span>
                  <span className="text-lg font-black" style={{ color: '#fcc824' }}>${details.price}</span>
                </div>
              </div>

              {/* Secure payment note */}
              <div className="flex items-center gap-3 text-sm rounded-xl p-4" style={{ backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', color: '#9090a8' }}>
                <Lock className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                <span>You&apos;ll enter your payment details securely on the next page via Stripe.</span>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isProcessing}
                className="group w-full py-4 bg-[#fcc824] hover:bg-[#fdd84a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-lg rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.15)] hover:shadow-[0_0_50px_rgba(252,200,36,0.3)] transform hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    PROCEED TO PAY &mdash; ${details.price}/mo
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center" style={{ color: '#5a5a72' }}>
                By proceeding, you authorize MindsetOS to charge ${details.price}/mo until you cancel.
              </p>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-8 pt-2">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5a5a72' }}>
                  <Shield className="w-4 h-4" />
                  Secure
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5a5a72' }}>
                  <Lock className="w-4 h-4" />
                  256-bit SSL
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#5a5a72' }}>
                  <CreditCard className="w-4 h-4" />
                  Stripe
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT: What you get */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-5" style={{ backgroundColor: 'rgba(252,200,36,0.08)', border: '1px solid rgba(252,200,36,0.2)', color: '#fcc824' }}>
                <GraduationCap className="w-3.5 h-3.5" />
                Coaching Practice
              </div>

              <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight" style={{ color: '#ededf5' }}>
                Scale your coaching practice with AI-powered client workspaces.
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: '#9090a8' }}>
                Every client gets their own AI memory, coaching notes, exercises, and knowledge base.
                Plus the power to create custom coaching agents around your methodologies.
              </p>

              {/* What's included */}
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: '#9090a8' }}>Everything included</h3>
                <div className="space-y-3">
                  {INCLUDED.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(252,200,36,0.1)' }}>
                        <CheckCircle className="w-3 h-3" style={{ color: '#fcc824' }} />
                      </div>
                      <span className="text-sm" style={{ color: '#9090a8' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px my-6" style={{ background: 'linear-gradient(to right, #1e1e30, transparent)' }} />

              {/* Quick comparison */}
              <div className="relative overflow-hidden rounded-xl p-5" style={{ backgroundColor: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(252,200,36,0.03)' }} />
                <h3 className="relative text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#9090a8' }}>Cost per client</h3>
                <div className="relative grid grid-cols-2 gap-3">
                  <div
                    className="p-4 rounded-xl text-center transition-all duration-300"
                    style={plan === 'practice5'
                      ? { border: '1px solid rgba(252,200,36,0.3)', backgroundColor: 'rgba(252,200,36,0.04)' }
                      : { border: '1px solid #1e1e30', backgroundColor: 'rgba(18,18,31,0.5)' }
                    }
                  >
                    <div className="text-xl font-black" style={{ color: '#ededf5' }}>$297</div>
                    <div className="text-xs mt-0.5" style={{ color: '#9090a8' }}>5 clients /mo</div>
                    <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(252,200,36,0.6)' }}>$59.40/client</div>
                  </div>
                  <div
                    className="p-4 rounded-xl text-center transition-all duration-300"
                    style={plan === 'practice10'
                      ? { border: '1px solid rgba(252,200,36,0.3)', backgroundColor: 'rgba(252,200,36,0.04)' }
                      : { border: '1px solid #1e1e30', backgroundColor: 'rgba(18,18,31,0.5)' }
                    }
                  >
                    <div className="text-xl font-black" style={{ color: '#ededf5' }}>$397</div>
                    <div className="text-xs mt-0.5" style={{ color: '#9090a8' }}>10 clients /mo</div>
                    <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(52,211,153,0.6)' }}>$39.70/client</div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="mt-8 text-center">
                <p className="text-xs" style={{ color: '#5a5a72' }}>
                  Need Help? Contact us at{' '}
                  <a href="mailto:hello@mindset.show" className="hover:opacity-100 transition-colors duration-300" style={{ color: 'rgba(252,200,36,0.6)' }}>
                    hello@mindset.show
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="py-4" style={{ borderTop: '1px solid #1e1e30' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs" style={{ color: '#5a5a72' }}>
          <span>&copy; 2026 MindsetOS | All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="transition-colors duration-300 hover:opacity-80">Terms</Link>
            <Link href="/privacy" className="transition-colors duration-300 hover:opacity-80">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoachingPracticeCheckoutPage() {
  return (
    <Suspense>
      <CoachingPracticeCheckoutInner />
    </Suspense>
  );
}

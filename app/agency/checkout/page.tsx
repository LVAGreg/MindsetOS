'use client';

import { useState, Suspense, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Shield,
  Lock,
  CreditCard,
  Loader2,
  Users,
  Building2,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-f747.up.railway.app';

type AgencyPlan = 'agency5' | 'agency10';

const PLAN_DETAILS: Record<AgencyPlan, { name: string; price: number; accounts: number; desc: string }> = {
  agency5: {
    name: 'Agency 5',
    price: 297,
    accounts: 5,
    desc: '5 client sub-accounts + custom agents + all AI agents',
  },
  agency10: {
    name: 'Agency 10',
    price: 397,
    accounts: 10,
    desc: '10 client sub-accounts + custom agents + all AI agents',
  },
};

const INCLUDED = [
  'All 14+ MindsetOS AI agents',
  'Multi-client management with instant switching',
  'Per-client AI memory, brand voice & playbooks',
  'Custom Agent Creator \u2014 build your own agents',
  'Granular memory controls (4 categories)',
  'Per-client knowledge base uploads',
  'Agent activation controls per client',
  'Client Fast Start training + coaching included',
  'Fair-use monthly token allowance',
];

function AgencyCheckoutInner() {
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as AgencyPlan) || 'agency5';

  const [plan, setPlan] = useState<AgencyPlan>(
    initialPlan === 'agency10' ? 'agency10' : 'agency5'
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
    setCouponError('Invalid coupon code');
  };

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
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/mindset-os-logo.png"
              alt="MindsetOS"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-lg font-bold text-gray-900">
              Mindset<span style={{ color: '#fcc824' }}>OS</span>
              <span className="text-gray-400 font-normal mx-1.5">/</span>
              Agency
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock className="w-4 h-4" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

          {/* LEFT: Form */}
          <div className="order-2 lg:order-1">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Contact Details */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Details</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                      required
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone no."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>

              {/* Coupon */}
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={coupon}
                    onChange={(e) => { setCoupon(e.target.value); setCouponError(''); setCouponApplied(false); }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                {couponApplied && <p className="text-green-600 text-xs mt-1">Coupon applied!</p>}
              </div>

              {/* Plan Toggle */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Choose your Agency plan</h3>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      plan === 'agency5'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="agency5"
                      checked={plan === 'agency5'}
                      onChange={() => setPlan('agency5')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      plan === 'agency5' ? 'border-indigo-500' : 'border-gray-300'
                    }`}>
                      {plan === 'agency5' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        $297/mo
                        <span className="text-xs font-normal text-gray-500">Agency 5</span>
                      </div>
                      <div className="text-xs text-gray-500">5 client sub-accounts &middot; Billed monthly</div>
                    </div>
                    <Users className="w-5 h-5 text-gray-400" />
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      plan === 'agency10'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="agency10"
                      checked={plan === 'agency10'}
                      onChange={() => setPlan('agency10')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      plan === 'agency10' ? 'border-indigo-500' : 'border-gray-300'
                    }`}>
                      {plan === 'agency10' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        $397/mo
                        <span className="ml-1 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">BEST VALUE</span>
                        <span className="text-xs font-normal text-gray-500">Agency 10</span>
                      </div>
                      <div className="text-xs text-gray-500">10 client sub-accounts &middot; Billed monthly</div>
                    </div>
                    <Users className="w-5 h-5 text-gray-400" />
                  </label>
                </div>
                <p className="text-[11px] text-gray-400 text-right mt-1">All prices in USD</p>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Today&apos;s payment:</h3>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700">{details.name} &mdash; {details.accounts} clients</span>
                  <span className="font-bold text-gray-900">${details.price}/mo</span>
                </div>
                <p className="text-xs text-gray-500">{details.desc}</p>
              </div>

              {/* Secure payment note */}
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Lock className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>You&apos;ll enter your payment details securely on the next page via Stripe.</span>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-[#fcc824] hover:bg-[#f0be1e] disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `PROCEED TO PAY \u2014 $${details.price}/mo`
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                By proceeding, you authorize MindsetOS to charge ${details.price}/mo until you cancel.
              </p>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Shield className="w-4 h-4" />
                  Secure
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Lock className="w-4 h-4" />
                  Encrypted
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <CreditCard className="w-4 h-4" />
                  Stripe
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT: What you get */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs text-indigo-700 font-bold uppercase tracking-wide mb-4">
                <Building2 className="w-3.5 h-3.5" />
                Agency Tier
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Scale your consulting with AI-powered client workspaces.
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Every client gets their own AI memory, brand voice, playbooks, and knowledge base.
                Plus the power to create custom agents around your frameworks.
              </p>

              {/* What's included */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-4">Everything included:</h3>
                <div className="space-y-2.5">
                  {INCLUDED.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fcc824' }} />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 my-6" />

              {/* Quick comparison */}
              <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                <h3 className="text-sm font-bold text-indigo-900 mb-3">Quick plan comparison:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border text-center ${plan === 'agency5' ? 'border-indigo-400 bg-white' : 'border-indigo-200 bg-indigo-50/50'}`}>
                    <div className="text-lg font-bold text-gray-900">$297</div>
                    <div className="text-xs text-gray-600">5 clients /mo</div>
                    <div className="text-[10px] text-gray-400">$59.40/client</div>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${plan === 'agency10' ? 'border-indigo-400 bg-white' : 'border-indigo-200 bg-indigo-50/50'}`}>
                    <div className="text-lg font-bold text-gray-900">$397</div>
                    <div className="text-xs text-gray-600">10 clients /mo</div>
                    <div className="text-[10px] text-gray-400">$39.70/client</div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-400">
                  Need Help? Contact us at{' '}
                  <a href="mailto:hello@mindset.show" className="text-indigo-600 hover:underline">
                    hello@mindset.show
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-gray-400">
          <span>&copy; 2026 MindsetOS | All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgencyCheckoutPage() {
  return (
    <Suspense>
      <AgencyCheckoutInner />
    </Suspense>
  );
}

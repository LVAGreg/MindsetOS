'use client';

import { useState, useEffect, FormEvent } from 'react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import Link from 'next/link';
import {
  CheckCircle,
  Shield,
  Lock,
  CreditCard,
  Loader2,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-f747.up.railway.app';

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
      <h3 className="text-base font-bold text-gray-900 mb-4">Here&apos;s what MindsetOS Clients have to say:</h3>
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

type PricingPlan = 'weekly' | 'upfront';

export default function CheckoutPage() {
  const [plan, setPlan] = useState<PricingPlan>('weekly');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  // Card fields removed — payment is handled by Stripe Checkout redirect

  const price = plan === 'weekly' ? 47 : 397;

  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponApplied(false);
    if (!coupon.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    // Coupon validation will go through the backend
    // For now show feedback
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
      // Create Stripe checkout session via backend
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

      // Redirect to Stripe Checkout
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
            <MindsetOSLogo size="md" variant="dark" />
            <span className="text-lg font-bold text-gray-900">
              <span className="text-gray-400 font-normal mx-1.5">+</span>
              Mindset Architecture
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
                    <div>
                      <input
                        type="text"
                        placeholder="Your first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Your last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone no."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors"
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
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-5 py-3 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-semibold rounded-lg transition-colors text-sm"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                {couponApplied && <p className="text-green-600 text-xs mt-1">Coupon applied!</p>}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Today&apos;s payment:</h3>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700">Mindset Architecture</span>
                  <span className="font-bold text-gray-900">${price}</span>
                </div>
                {plan === 'weekly' && (
                  <p className="text-xs text-gray-500">Then $47/wk billed weekly</p>
                )}
              </div>

              {/* Pricing Plan Toggle */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Choose a pricing option</h3>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      plan === 'weekly'
                        ? 'border-[#fcc824] bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="weekly"
                      checked={plan === 'weekly'}
                      onChange={() => setPlan('weekly')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      plan === 'weekly' ? 'border-[#fcc824]' : 'border-gray-300'
                    }`}>
                      {plan === 'weekly' && <div className="w-2.5 h-2.5 rounded-full bg-[#fcc824]" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">$47.00/wk</div>
                      <div className="text-xs text-gray-500">$47.00 USD today, then $47.00 USD weekly</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      plan === 'upfront'
                        ? 'border-[#fcc824] bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value="upfront"
                      checked={plan === 'upfront'}
                      onChange={() => setPlan('upfront')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      plan === 'upfront' ? 'border-[#fcc824]' : 'border-gray-300'
                    }`}>
                      {plan === 'upfront' && <div className="w-2.5 h-2.5 rounded-full bg-[#fcc824]" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">
                        $397.00
                        <span className="ml-2 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">SAVE $167</span>
                      </div>
                      <div className="text-xs text-gray-500">Upfront Payment of $397 USD = 12 Weeks (Save $167)</div>
                    </div>
                  </label>
                </div>
                <p className="text-[11px] text-gray-400 text-right mt-1">All prices in USD</p>
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
                  'PROCEED TO PAY'
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                By proceeding, you authorize MindsetOS to charge you according to the plan terms until you cancel.
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
              <p className="text-gray-700 mb-6 leading-relaxed">
                Join the <strong>Client Fast Start</strong> today &mdash; your MindsetOS agents + the training, coaching, and bonuses that make them unstoppable.
              </p>

              {/* What you get */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-4">Exactly what you get:</h3>
                <div className="space-y-3">
                  {WHAT_YOU_GET.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#fcc824]" />
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{item.title}</span>{' '}
                        <span className="text-sm text-gray-500">({item.desc})</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pl-7">
                  <p className="text-sm text-gray-600">
                    <strong>Built:</strong> Implementation workbook with templates, scripts, frameworks, and real examples to get you started and winning clients immediately.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6" />

              {/* Bonuses */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-1">Plus Bonuses (Total Value: $7,250)</h3>
                <p className="text-xs text-gray-500 mb-4">
                  You Also Get Access To Our MindsetOS Arena, Implementation Support and Actionable Resources, Which Includes:
                </p>
                <div className="space-y-2.5">
                  {BONUSES.map((bonus, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#fcc824]" />
                      <span className="text-sm text-gray-700">
                        {bonus.name} <span className="text-gray-400">(Valued at {bonus.value})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6" />

              {/* Testimonials — Senja embed (same widget as ThriveCart checkout) */}
              <SenjaTestimonials />

              {/* Support */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-400">
                  Need Help? Contact us at{' '}
                  <a href="mailto:hello@mindset.show" className="text-[#fcc824] hover:underline">
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

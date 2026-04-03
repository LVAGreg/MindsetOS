'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { CheckCircle, ArrowRight, Sparkles, Users, Video, ExternalLink } from 'lucide-react';
import { trackCheckoutCompleted } from '@/lib/analytics';

// Plan → price map (mirrors checkout/page.tsx priceMap)
const PLAN_AMOUNTS: Record<string, number> = {
  weekly: 47,
  upfront: 397,
  architecture_997: 997,
  individual_annual: 1997,
  intensive_1997: 1997,
};

const CIRCLE_URL = 'https://www.mindset.show/'; // TODO: Update with actual invite link

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();

  const plan = searchParams.get('plan') || 'unknown';
  const amount = PLAN_AMOUNTS[plan] ?? 0;

  useEffect(() => {
    trackCheckoutCompleted(plan, amount);
  }, [plan, amount]);

  return (
    <div className="min-h-screen bg-[#09090f]">
      {/* Header */}
      <div className="border-b border-[#1e1e30]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
          <MindsetOSLogo size="md" variant="light" />
          <span className="text-lg font-bold text-[#ededf5]">
            <span style={{ color: '#9090a8' }} className="font-normal mx-1.5">+</span>
            Mindset Architecture
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Confirmation */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#ededf5] mb-3">
            You&apos;re In!
          </h1>
          <p className="text-lg" style={{ color: '#9090a8' }}>
            Welcome to Mindset Architecture. Let&apos;s get you set up.
          </p>
        </div>

        {/* Step 1: AI is unlocked */}
        <div className="bg-[#12121f] rounded-xl p-6 border border-[#1e1e30] mb-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Step 1 — Done</span>
              </div>
              <h3 className="font-bold text-[#ededf5] mb-1">Your AI Agents Are Unlocked</h3>
              <p className="text-sm mb-3" style={{ color: '#9090a8' }}>
                All 10 AI mindset coaching agents are now fully accessible — Mindset Score, Reset Guide, Architecture Coach,
                Practice Builder, Accountability Partner, and more. They&apos;re trained on the 3-layer mindset architecture framework.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#fcc824] hover:text-[#f0be1e] transition-colors"
              >
                Open MindsetOS Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Step 2: Community — THE KEY CTA */}
        <div className="bg-[#fcc824]/[0.06] rounded-xl p-6 border-2 border-[#fcc824] mb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#fcc824]/10 rounded-full blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-10 h-10 bg-[#fcc824] rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#fcc824] uppercase tracking-wide">Step 2 — Action Required</span>
              </div>
              <h3 className="font-bold text-[#ededf5] text-lg mb-1">Get Your Community &amp; Content Access</h3>
              <p className="text-sm mb-2" style={{ color: '#9090a8' }}>
                Your training modules, coaching calls, implementation support, and the MindsetOS community all live here.
                This is where you&apos;ll access:
              </p>
              <div className="space-y-1.5 mb-4">
                {[
                  '10 AI mindset coaching agents — fully unlocked',
                  '48-Hour Mindset Reset challenge',
                  'MindsetOS community & peer support',
                  'Daily practice routines & accountability tracking',
                  '90-Day Architecture program access',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-[#fcc824]" />
                    <span className="text-sm" style={{ color: '#9090a8' }}>{item}</span>
                  </div>
                ))}
              </div>
              <a
                href={CIRCLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Join the Community &amp; Access Content
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Step 3: First coaching call */}
        <div className="bg-[#12121f] rounded-xl p-6 border border-[#1e1e30] mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(124,91,246,0.1)' }}>
              <Video className="w-5 h-5" style={{ color: '#7c5bf6' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7c5bf6' }}>Step 3 — This Week</span>
              </div>
              <h3 className="font-bold text-[#ededf5] mb-1">Join Your First Live Coaching Call</h3>
              <p className="text-sm" style={{ color: '#9090a8' }}>
                Once you&apos;re in the community, check the schedule for the next live coaching session.
                Bring your Mindset Score or practice plan — coaches give direct, actionable feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Quick start reminder */}
        <div className="bg-[#12121f] rounded-xl p-6 text-center mb-8 border border-[#1e1e30]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#fcc824]" />
            <h3 className="font-bold text-[#ededf5] text-sm">Recommended First Move</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
            Open MindsetOS → Start a conversation with the <strong className="text-[#ededf5]">Mindset Score Agent</strong> →
            Get your baseline assessment in minutes. Then take it to coaching for feedback.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 text-[#ededf5] font-semibold rounded-lg transition-colors text-sm border border-[#1e1e30]"
            style={{ backgroundColor: 'rgba(30,30,48,0.6)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(30,30,48,0.9)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(30,30,48,0.6)'; }}
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Support */}
        <p className="text-center text-xs" style={{ color: '#9090a8' }}>
          Questions? Email{' '}
          <a href="mailto:hello@mindset.show" className="text-[#fcc824] hover:underline">
            hello@mindset.show
          </a>
        </p>
      </div>
    </div>
  );
}

import { Suspense } from 'react';

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

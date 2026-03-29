'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import {
  ArrowRight,
  CheckCircle,
  Target,
  Sparkles,
  BookOpen,
  Video,
  Gift,
  FileText,
} from 'lucide-react';

const CHECKOUT_URL = '/checkout';

const WHAT_YOU_GET = [
  {
    icon: BookOpen,
    title: '12 AI-Powered Implementation Modules',
    desc: 'Built for easy execution, fast outcomes. Not theory — action.',
  },
  {
    icon: FileText,
    title: 'Plug-and-Play Offer Frameworks & Templates',
    desc: 'Never guess or start from scratch. Proven templates that convert.',
  },
  {
    icon: Sparkles,
    title: 'AI Agents Trained on Offers That Actually Convert',
    desc: 'Speed up clarity, messaging, and implementation with AI that understands mindset coaching.',
  },
  {
    icon: Video,
    title: 'Weekly LIVE Coaching with Experienced Coaches',
    desc: 'No help desks. No generic answers. Real coaching, real feedback.',
  },
  {
    icon: Target,
    title: 'A Clear Path From Idea to Offer to Income',
    desc: 'A clear plan, a repeatable process, and 5-figure opportunities.',
  },
  {
    icon: FileText,
    title: 'Implementation Workbook',
    desc: 'Templates, scripts, frameworks, and real examples to get you winning clients immediately.',
  },
];

const BONUSES = [
  { name: 'Access to the MindsetOS Community', value: '$1,000' },
  { name: 'Access to MindsetOS Coaching', value: '$2,000' },
  { name: 'Access to Private Implementation Support', value: '$2,250' },
  { name: '2-Day LIVE MindsetOS Intensive Ticket', value: '$500' },
  { name: 'Arena Pass — MindsetOS Advantage Workshops & Resources', value: '$1,500' },
];

const SENJA_WIDGET_ID = '274fb8ab-554d-41c6-b72e-c83e0b527376';

function SenjaTestimonials() {
  useEffect(() => {
    const existing = document.querySelector(`script[src*="${SENJA_WIDGET_ID}"]`);
    if (existing) return;
    const script = document.createElement('script');
    script.src = `https://widget.senja.io/widget/${SENJA_WIDGET_ID}/platform.js`;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <div
      className="senja-embed"
      data-id={SENJA_WIDGET_ID}
      data-mode="shadow"
      data-lazyload="false"
    />
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MindsetOSLogo size="md" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Client Fast Start</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <a
              href={CHECKOUT_URL}
              className="px-4 py-2 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-semibold rounded-lg transition-colors text-sm"
            >
              Get Started &mdash; $87/wk
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-sm text-amber-700 dark:text-amber-400 font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered &middot; Coach-Supported &middot; Built for Consultants
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              Go From Idea to{' '}
              <span style={{ color: '#fcc824' }}>Paying Clients</span>{' '}
              — Faster Than You Thought Possible
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              The Client Fast Start gives you AI agents that do the heavy lifting, proven frameworks that
              remove the guesswork, and live coaching that keeps you on track. Everything you need
              to build your offer and start signing clients.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <a
                href={CHECKOUT_URL}
                className="px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-lg transform hover:scale-105"
              >
                Join Client Fast Start &mdash; $87/wk
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              or save with the $750 upfront option (12 weeks)
            </span>
          </div>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-amber-100/30 to-transparent dark:from-amber-900/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* You've seen what the AI can do — Hero bridge for trial users */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <p className="text-lg sm:text-xl font-medium text-gray-800 dark:text-gray-200">
            You've already seen what the AI agents can do.{' '}
            <span style={{ color: '#b8860b' }}>Now imagine them backed by live coaching, proven modules, and a community pushing you forward.</span>
          </p>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Exactly What You Get
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              AI does the heavy lifting. Coaching fills the gaps. Frameworks keep you on track.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHAT_YOU_GET.map((item, i) => (
              <div
                key={i}
                className="relative p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-600 transition-all hover:shadow-lg group"
              >
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5" style={{ color: '#fcc824' }} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-amber-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents Section — the lead benefit */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full text-xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wide mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Included: Full AI Agent Access
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                12+ AI Agents That{' '}
                <span style={{ color: '#fcc824' }}>Build It For You</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                These aren't generic chatbots. Each agent is trained on the exact frameworks inside the Client Fast Start
                — so they build your offer, write your promos, plan your campaigns, and script your sales calls
                while you focus on delivery.
              </p>
              <div className="space-y-3">
                {[
                  'Money Model Mapper — Build your offer foundation',
                  'Offer Invitation Architect — Write promos that convert',
                  'Presentation Printer — Design expert presentations',
                  'Qualification Call Builder — Sales scripts that close',
                  'LinkedIn Events Builder — Fill your event pipeline',
                  'MindsetAI Super Agent — On-demand mindset coaching guidance',
                  '+ 8 more specialist agents',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fcc824' }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                How AI + Coaching Works Together
              </h3>
              <div className="space-y-4">
                {[
                  { step: '1', text: 'AI agents build your offer, promos, and scripts in minutes' },
                  { step: '2', text: 'Implementation modules show you exactly how to deploy them' },
                  { step: '3', text: 'Live coaches review your work and sharpen your strategy' },
                  { step: '4', text: 'You launch, get feedback, and iterate to paying clients' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-[#fcc824] rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-black">
                      {item.step}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 pt-1">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bonuses */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-full text-sm text-purple-700 dark:text-purple-400 font-medium mb-4">
              <Gift className="w-4 h-4" />
              Plus Bonuses &mdash; Total Value: $7,250
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              You Also Get Access To
            </h2>
          </div>

          <div className="space-y-3">
            {BONUSES.map((bonus, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#fcc824' }} />
                  <span className="text-gray-900 dark:text-white font-medium">{bonus.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Valued at {bonus.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — Senja embed */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              What MindsetOS Clients Have to Say
            </h2>
          </div>
          <SenjaTestimonials />
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Join the Client Fast Start
              </h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Training course + AI agents + live coaching + bonuses worth $7,250. Everything you need to go from idea to income.
              </p>

              {/* Pricing options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                <div className="bg-white/10 border-2 border-amber-400/50 rounded-xl p-4 text-center">
                  <div className="text-xs text-amber-400 font-bold uppercase tracking-wide mb-1">Weekly</div>
                  <div className="text-3xl font-bold text-white">$87<span className="text-lg text-gray-400">/wk</span></div>
                  <div className="text-xs text-gray-400 mt-1">Billed weekly</div>
                </div>
                <div className="bg-white/10 border border-gray-600 rounded-xl p-4 text-center relative">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                    SAVE $294
                  </div>
                  <div className="text-xs text-gray-300 font-bold uppercase tracking-wide mb-1">12-Week Upfront</div>
                  <div className="text-3xl font-bold text-white">$750</div>
                  <div className="text-xs text-gray-400 mt-1">One payment</div>
                </div>
              </div>

              <div className="space-y-2.5 text-left max-w-sm mx-auto mb-8">
                {[
                  '12 AI-powered implementation modules',
                  'All 12+ expert AI agents — fully unlocked',
                  'Weekly live coaching sessions',
                  'Plug-and-play templates & frameworks',
                  'MindsetOS community + implementation support',
                  'Bonuses worth $7,250',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#fcc824' }} />
                    {item}
                  </div>
                ))}
              </div>

              <a
                href={CHECKOUT_URL}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-lg transform hover:scale-105"
              >
                Join Client Fast Start &mdash; $87/wk
                <ArrowRight className="w-5 h-5" />
              </a>

              <p className="text-xs text-gray-500 mt-4">
                Secure payment &middot; Cancel anytime &middot; Instant access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Common Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'What happens after I join?',
                a: 'You get instant access to the training modules, AI agents, templates, and community. Your first live coaching session is that same week.',
              },
              {
                q: 'I already tried the AI agents — why do I need the full program?',
                a: 'The agents are powerful on their own, but they\'re built on the frameworks inside the course. With the modules, coaching, and community, you\'ll know exactly how to deploy what the AI builds for you — and get feedback on it.',
              },
              {
                q: 'Is the coaching live or pre-recorded?',
                a: 'Live. Every week with experienced coaches who review your work and give you direct, actionable feedback. No help desks, no generic answers.',
              },
              {
                q: 'Can I cancel?',
                a: 'Yes. Cancel anytime if you\'re on the weekly plan. Or lock in the best price with the $750 upfront option.',
              },
              {
                q: 'How is this different from other coaching programs?',
                a: 'Most programs give you theory and leave you to figure out implementation. Client Fast Start gives you AI agents that do the implementation, coaches who review it, and a community that keeps you accountable.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 bg-gray-900 dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Stop Figuring It Out Alone.
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            AI builds it. Coaches sharpen it. You launch it. That's the Client Fast Start.
          </p>
          <a
            href={CHECKOUT_URL}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-lg transform hover:scale-105"
          >
            Join Now &mdash; $87/wk
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Cancel anytime &middot; Or save with $750 upfront
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MindsetOSLogo size="xs" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Client Fast Start &mdash; powered by{' '}
                <a
                  href="https://mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80"
                  style={{ color: '#fcc824' }}
                >
                  MindsetOS
                </a>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/agency" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Coaching Practice
              </Link>
              <Link href="/trial" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Free Trial
              </Link>
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy
              </Link>
              <a
                href="mailto:hello@mindset.show"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Support
              </a>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Copyright &copy; 2026 MindsetOS | All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

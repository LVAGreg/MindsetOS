'use client';

import { useEffect, useState } from 'react';
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
  ChevronDown,
  Users,
  Shield,
  Clock,
} from 'lucide-react';

const CHECKOUT_URL = '/checkout';

const WHAT_YOU_GET = [
  {
    icon: BookOpen,
    title: '10 AI-Powered Mindset Coaches',
    desc: 'Built for entrepreneurs. Not theory — practice, patterns, and daily transformation.',
  },
  {
    icon: FileText,
    title: 'Proven Mindset Frameworks & Templates',
    desc: 'Never guess or start from scratch. The 3-Layer Architecture that actually works.',
  },
  {
    icon: Sparkles,
    title: 'AI Coaches Trained on Real Mindset Science',
    desc: 'Speed up self-awareness, pattern interruption, and daily practice with AI that gets it.',
  },
  {
    icon: Video,
    title: 'Weekly LIVE Coaching with Experienced Coaches',
    desc: 'No help desks. No generic answers. Real coaching, real feedback.',
  },
  {
    icon: Target,
    title: 'A Clear Path From Reactive to Designed',
    desc: 'A clear plan, a repeatable practice, and a mind that works for you — not against you.',
  },
  {
    icon: FileText,
    title: 'Implementation Workbook',
    desc: 'Templates, exercises, frameworks, and real examples to start transforming immediately.',
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

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="group border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#fcc824]/40 dark:hover:border-[#fcc824]/30"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left bg-white dark:bg-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
      >
        <h3 className="font-bold text-gray-900 dark:text-white pr-4 text-base sm:text-lg">{q}</h3>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-[#fcc824]' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          {a}
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a1a] overflow-x-hidden">
      {/* ============ INLINE KEYFRAMES ============ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes join-float-up {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes join-float-up-slow {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes join-scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes join-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes join-pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(252, 200, 36, 0.15); }
          50% { box-shadow: 0 0 40px rgba(252, 200, 36, 0.3); }
        }
        @keyframes join-drift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, -15px); }
          50% { transform: translate(-5px, -25px); }
          75% { transform: translate(-15px, -10px); }
        }
        @keyframes join-count-bar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .join-anim-1 { animation: join-float-up 0.7s 0.1s ease-out both; }
        .join-anim-2 { animation: join-float-up 0.7s 0.2s ease-out both; }
        .join-anim-3 { animation: join-float-up 0.7s 0.3s ease-out both; }
        .join-anim-4 { animation: join-float-up 0.7s 0.4s ease-out both; }
        .join-anim-5 { animation: join-float-up 0.7s 0.5s ease-out both; }
        .join-shimmer-text {
          background: linear-gradient(90deg, #fcc824, #fff 40%, #fcc824 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: join-shimmer 4s linear infinite;
        }
        .join-card-hover {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .join-card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px -12px rgba(252, 200, 36, 0.12), 0 8px 20px -8px rgba(0,0,0,0.1);
        }
        .join-cta-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .join-cta-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        .join-cta-btn:hover::before {
          left: 100%;
        }
        .join-cta-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 35px -8px rgba(252, 200, 36, 0.5);
        }
        .join-section-dot-grid {
          background-image: radial-gradient(circle at 1px 1px, rgba(252,200,36,0.07) 1px, transparent 0);
          background-size: 28px 28px;
        }
        .dark .join-section-dot-grid {
          background-image: radial-gradient(circle at 1px 1px, rgba(252,200,36,0.04) 1px, transparent 0);
        }
      ` }} />

      {/* ============ NAVIGATION ============ */}
      <nav className="border-b border-gray-100 dark:border-gray-800/50 sticky top-0 bg-white/90 dark:bg-[#0a0a1a]/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MindsetOSLogo size="md" />
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Mindset Architecture</span>
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
              className="join-cta-btn px-5 py-2.5 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-semibold rounded-lg text-sm"
            >
              Get Started &mdash; $47/wk
            </a>
          </div>
        </div>
      </nav>

      {/* ============ HERO SECTION ============ */}
      <section className="relative overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 -z-10">
          {/* Primary gradient orb */}
          <div
            className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full blur-[120px] opacity-30 dark:opacity-15"
            style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 70%)' }}
          />
          {/* Secondary accent orbs */}
          <div
            className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 dark:opacity-8"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)', animation: 'join-drift 20s ease-in-out infinite' }}
          />
          <div
            className="absolute top-[50%] left-[-8%] w-[350px] h-[350px] rounded-full blur-[100px] opacity-10 dark:opacity-5"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', animation: 'join-drift 25s ease-in-out infinite reverse' }}
          />
          {/* Subtle dot grid */}
          <div className="absolute inset-0 join-section-dot-grid" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-24 sm:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="join-anim-1 inline-flex items-center gap-2 px-4 py-2 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-full text-sm text-amber-700 dark:text-amber-400 font-medium mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              AI-Powered &middot; Coach-Supported &middot; Built for Entrepreneurs
            </div>

            <h1 className="join-anim-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-[1.08] tracking-tight mb-8">
              Stop Reacting. Start{' '}
              <span
                className="relative inline-block"
                style={{ color: '#fcc824' }}
              >
                Designing
                <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-[#fcc824]/30" />
              </span>{' '}
              <span className="block sm:inline">— Your Mind Is The Operating System</span>
            </h1>

            <p className="join-anim-3 text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed max-w-3xl mx-auto">
              The Mindset Architecture gives you 10 AI mindset coaches, proven frameworks that
              remove the guesswork, and live coaching that keeps you on track. Everything you need
              to rewire reactive patterns and design a mind that works for you.
            </p>

            <div className="join-anim-4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
              <a
                href={CHECKOUT_URL}
                className="join-cta-btn px-10 py-4 bg-[#fcc824] text-black font-bold rounded-xl shadow-lg flex items-center gap-3 text-lg"
              >
                Join Mindset Architecture &mdash; $47/wk
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
            <span className="join-anim-5 text-sm text-gray-500 dark:text-gray-400">
              or save with the $397 upfront option
            </span>

            {/* Trust indicators */}
            <div className="join-anim-5 mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure checkout</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Instant access</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Section transition gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-amber-50/50 dark:to-[#0a0a1a] pointer-events-none" />
      </section>

      {/* ============ HERO BRIDGE ============ */}
      <section className="relative border-y border-amber-200/30 dark:border-amber-800/20 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-amber-50/80 dark:from-amber-900/10 dark:via-orange-900/8 dark:to-amber-900/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-lg sm:text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
            You've already seen what the AI agents can do.{' '}
            <span className="font-bold" style={{ color: '#b8860b' }}>Now imagine them backed by live coaching, proven modules, and a community pushing you forward.</span>
          </p>
        </div>
      </section>

      {/* ============ WHAT YOU GET ============ */}
      <section className="relative py-20 sm:py-28">
        {/* Background texture */}
        <div className="absolute inset-0 -z-10 join-section-dot-grid opacity-50" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-5 tracking-tight">
              Exactly What You Get
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              AI does the heavy lifting. Coaching fills the gaps. Frameworks keep you on track.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {WHAT_YOU_GET.map((item, i) => (
              <div
                key={i}
                className="join-card-hover relative p-7 rounded-2xl border border-gray-200/80 dark:border-gray-700/40 bg-white dark:bg-gray-800/40 group backdrop-blur-sm"
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#fcc824]/0 to-[#fcc824]/0 group-hover:from-[#fcc824]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/10 rounded-xl flex items-center justify-center mb-5 ring-1 ring-amber-200/40 dark:ring-amber-700/20 group-hover:ring-[#fcc824]/50 transition-all duration-300 group-hover:scale-110">
                    <item.icon className="w-5 h-5" style={{ color: '#fcc824' }} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2.5 group-hover:text-[#b8860b] dark:group-hover:text-[#fcc824] transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section transition */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/50 pointer-events-none" />
      </section>

      {/* ============ AI AGENTS SECTION ============ */}
      <section className="relative py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-10 dark:opacity-5 pointer-events-none" style={{ background: '#fcc824' }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/40 rounded-full text-xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                Included: Full AI Agent Access
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-5 tracking-tight leading-[1.1]">
                10 AI Coaches That{' '}
                <span style={{ color: '#fcc824' }}>Build It For You</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                These aren't generic chatbots. Each coach is trained on proven mindset frameworks
                — so they assess your patterns, build daily practices, map your inner world, and design
                your operating system while you focus on showing up.
              </p>
              <div className="space-y-3.5">
                {[
                  'Mindset Score Agent — Assess your baseline across 3 pillars',
                  'Reset Guide — 48-hour weekend challenge with 6 exercises',
                  'Architecture Coach — 90-day transformation companion',
                  'Practice Builder — Personalized daily mindset routines',
                  'Accountability Partner — Daily check-ins and streak tracking',
                  'Inner World Mapper — Map beliefs, stories, and self-talk',
                  '+ 4 more specialist coaches',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <CheckCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" style={{ color: '#fcc824' }} />
                    <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How AI + Coaching card with step connectors */}
            <div className="join-card-hover bg-white dark:bg-gray-800/60 rounded-2xl p-8 sm:p-10 border border-gray-200/80 dark:border-gray-700/40 shadow-xl dark:shadow-2xl relative">
              {/* Card glow */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#fcc824]/10 via-transparent to-transparent pointer-events-none" />

              <div className="relative">
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
                  How AI + Coaching Works Together
                </h3>
                <div className="space-y-0">
                  {[
                    { step: '1', text: 'AI coaches assess your mindset patterns and build your baseline score' },
                    { step: '2', text: 'The 48-Hour Reset rewires your reactive triggers in one weekend' },
                    { step: '3', text: 'Daily practice routines + accountability keep you building' },
                    { step: '4', text: 'The 90-Day Architecture designs your complete operating system' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      {/* Connector line */}
                      {i < 3 && (
                        <div className="absolute left-[14px] top-[36px] w-px h-[calc(100%-8px)] bg-gradient-to-b from-[#fcc824]/40 to-[#fcc824]/10" />
                      )}
                      <div className="w-7 h-7 bg-[#fcc824] rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-black shadow-sm relative z-10">
                        {item.step}
                      </div>
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 pt-0.5 pb-6">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section transition */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-white dark:to-[#0a0a1a] pointer-events-none" />
      </section>

      {/* ============ BONUSES ============ */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50/80 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40 rounded-full text-sm text-purple-700 dark:text-purple-400 font-medium mb-5">
              <Gift className="w-4 h-4" />
              Plus Bonuses &mdash; Total Value: $7,250
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              You Also Get Access To
            </h2>
          </div>

          <div className="space-y-3">
            {BONUSES.map((bonus, i) => (
              <div
                key={i}
                className="join-card-hover flex items-center justify-between p-5 rounded-xl border border-gray-200/80 dark:border-gray-700/40 bg-white dark:bg-gray-800/40 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#fcc824]/20 transition-colors duration-300">
                    <CheckCircle className="w-4.5 h-4.5 flex-shrink-0" style={{ color: '#fcc824' }} />
                  </div>
                  <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base">{bonus.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500 flex-shrink-0 ml-4">
                  Valued at {bonus.value}
                </span>
              </div>
            ))}
          </div>

          {/* Total value summary */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total bonus value: <span className="font-bold text-gray-700 dark:text-gray-300">$7,250</span> — included when you join
            </p>
          </div>
        </div>

        {/* Section transition */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/50 pointer-events-none" />
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="relative py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#fcc824]/20 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              What MindsetOS Clients Have to Say
            </h2>
          </div>
          <SenjaTestimonials />
        </div>

        {/* Section transition */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-white dark:to-[#0a0a1a] pointer-events-none" />
      </section>

      {/* ============ PRICING CTA ============ */}
      <section className="relative py-20 sm:py-28">
        {/* Ambient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[160px] opacity-8 dark:opacity-5" style={{ background: '#fcc824' }} />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Card background with gradient mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#fcc824]/8 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#fcc824]/5 rounded-full blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#fcc824]/3 rounded-full blur-[120px]" />
            {/* Subtle dot grid inside card */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #fcc824 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }} />

            <div className="relative p-8 sm:p-12 md:p-16 text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
                Join the Mindset Architecture
              </h2>
              <p className="text-gray-400 mb-10 max-w-lg mx-auto text-base sm:text-lg leading-relaxed">
                Training course + AI agents + live coaching + bonuses worth $7,250. Everything you need to go from idea to income.
              </p>

              {/* Pricing options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-10">
                {/* Weekly option */}
                <div className="group relative bg-white/[0.08] border-2 border-[#fcc824]/50 rounded-2xl p-6 text-center transition-all duration-300 hover:border-[#fcc824] hover:bg-white/[0.12]" style={{ animation: 'join-pulse-glow 3s ease-in-out infinite' }}>
                  <div className="text-xs text-[#fcc824] font-bold uppercase tracking-widest mb-2">Weekly</div>
                  <div className="text-4xl font-extrabold text-white tracking-tight">$47<span className="text-lg font-medium text-gray-400">/wk</span></div>
                  <div className="text-xs text-gray-400 mt-2">Billed weekly</div>
                </div>
                {/* Full access option */}
                <div className="group relative bg-white/[0.06] border border-gray-600/60 rounded-2xl p-6 text-center transition-all duration-300 hover:border-gray-500 hover:bg-white/[0.1]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-lg">
                    BEST VALUE
                  </div>
                  <div className="text-xs text-gray-300 font-bold uppercase tracking-widest mb-2">Full Access</div>
                  <div className="text-4xl font-extrabold text-white tracking-tight">$397</div>
                  <div className="text-xs text-gray-400 mt-2">One payment</div>
                </div>
              </div>

              <div className="space-y-3 text-left max-w-sm mx-auto mb-10">
                {[
                  'All 10 AI mindset coaches — fully unlocked',
                  '48-Hour Mindset Reset challenge',
                  '90-Day Mindset Architecture program',
                  'Daily practice routines + accountability',
                  'MindsetOS community + coaching support',
                  'Bonuses worth $7,250',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm sm:text-base text-gray-300">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#fcc824' }} />
                    {item}
                  </div>
                ))}
              </div>

              <a
                href={CHECKOUT_URL}
                className="join-cta-btn inline-flex items-center gap-3 px-10 py-4 bg-[#fcc824] text-black font-bold rounded-xl shadow-lg text-lg"
              >
                Join Mindset Architecture &mdash; $47/wk
                <ArrowRight className="w-5 h-5" />
              </a>

              <p className="text-xs text-gray-500 mt-5 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure payment</span>
                <span>&middot;</span>
                <span>Cancel anytime</span>
                <span>&middot;</span>
                <span>Instant access</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="relative py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-10 text-center tracking-tight">
            Common Questions
          </h2>
          <div className="space-y-3">
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
                a: 'Yes. Cancel anytime if you\'re on the weekly plan. Or lock in the best price with the $397 upfront option.',
              },
              {
                q: 'How is this different from other coaching programs?',
                a: 'Most programs give you theory and leave you to figure it out. Mindset Architecture gives you AI coaches that build your daily practice, map your patterns, and design your system — plus real coaching and a community that keeps you accountable.',
              },
            ].map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>

        {/* Section transition */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-gray-900 dark:to-black pointer-events-none" />
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative py-24 sm:py-32 bg-gray-900 dark:bg-black overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[140px] opacity-10" style={{ background: '#fcc824' }} />
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fcc824 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Stop Figuring It Out Alone.
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed max-w-xl mx-auto">
            AI maps it. Coaches sharpen it. You design it. That's the Mindset Architecture.
          </p>
          <a
            href={CHECKOUT_URL}
            className="join-cta-btn inline-flex items-center gap-3 px-10 py-4 bg-[#fcc824] text-black font-bold rounded-xl shadow-lg text-lg"
          >
            Join Now &mdash; $47/wk
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-sm text-gray-500 mt-5">
            Cancel anytime &middot; Or save with $397 upfront
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-gray-100 dark:border-gray-800/50 py-10 bg-white dark:bg-[#0a0a1a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <MindsetOSLogo size="xs" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Mindset Architecture &mdash; powered by{' '}
                <a
                  href="https://mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: '#fcc824' }}
                >
                  MindsetOS
                </a>
              </span>
            </div>
            <div className="flex items-center flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/agency" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Coaching Practice
              </Link>
              <Link href="/trial-v3b" className="hover:text-gray-900 dark:hover:text-white transition-colors">
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
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Copyright &copy; 2026 MindsetOS | All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

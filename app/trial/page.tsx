'use client';

import Link from 'next/link';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Zap,
  Users,
  TrendingUp,
  MessageSquare,
  Shield,
  Target,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

/* ─── DATA ─── */

const WORKFLOW_STAGES = [
  {
    phase: 'Practice',
    phaseNum: '01',
    color: 'from-amber-500/20 to-amber-600/5',
    borderColor: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    agents: [
      { name: 'Daily Mindset Coach', icon: '🎯', desc: 'Guided daily practice to sharpen your entrepreneurial mindset' },
      { name: 'Habit Architect', icon: '⚡', desc: 'Build high-performance routines that stick' },
      { name: 'Focus Flow Trainer', icon: '🧘', desc: 'Deep work rituals and distraction-proofing for founders' },
    ],
  },
  {
    phase: 'Inner World',
    phaseNum: '02',
    color: 'from-orange-500/20 to-orange-600/5',
    borderColor: 'border-orange-500/30',
    dotColor: 'bg-orange-500',
    agents: [
      { name: 'Belief Rewire Engine', icon: '🔄', desc: 'Identify and replace limiting beliefs holding you back' },
      { name: 'Emotional Intelligence Guide', icon: '💡', desc: 'Build self-awareness and regulate under pressure' },
      { name: 'Confidence Calibrator', icon: '🛡️', desc: 'Strengthen your inner game before every big move' },
    ],
  },
  {
    phase: 'Conversations',
    phaseNum: '03',
    color: 'from-yellow-500/20 to-yellow-600/5',
    borderColor: 'border-yellow-500/30',
    dotColor: 'bg-yellow-500',
    agents: [
      { name: 'Pitch & Persuasion Coach', icon: '🗣️', desc: 'Nail investor meetings, sales calls, and tough talks' },
      { name: 'Conflict Navigator', icon: '🤝', desc: 'Handle co-founder friction and team disagreements' },
      { name: 'Negotiation Sparring Partner', icon: '🥊', desc: 'Roleplay high-stakes negotiations before they happen' },
    ],
  },
  {
    phase: 'Resilience',
    phaseNum: '04',
    color: 'from-emerald-500/20 to-emerald-600/5',
    borderColor: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    agents: [
      { name: 'Burnout Shield', icon: '🔋', desc: 'Catch early warning signs and recover faster' },
      { name: 'Decision Clarity Coach', icon: '🧭', desc: 'Cut through overthinking when the stakes are high' },
    ],
  },
  {
    phase: 'Growth',
    phaseNum: '05',
    color: 'from-violet-500/20 to-violet-600/5',
    borderColor: 'border-violet-500/30',
    dotColor: 'bg-violet-500',
    agents: [
      { name: 'Vision & Goal Architect', icon: '🏔️', desc: 'Map your next chapter with clarity and conviction' },
      { name: 'Accountability Partner', icon: '📈', desc: 'Weekly check-ins that keep you honest and moving' },
    ],
  },
];

const STATS = [
  { value: '87+', label: 'Active Founders', sublabel: 'training with MindsetOS' },
  { value: '14', label: 'Mindset AI Coaches', sublabel: 'working for you 24/7' },
  { value: '3', label: 'Core Pillars', sublabel: 'Practice, Inner World, Conversations' },
  { value: '7', label: 'Days Free', sublabel: 'full access, no card' },
];

/* ─── COMPONENT ─── */

export default function TrialLandingPageVariant() {
  return (
    <div className="min-h-screen bg-[#faf8f3] dark:bg-[#0a0f1c] text-gray-900 dark:text-gray-100 overflow-x-hidden">

      {/* ── INLINE STYLES for animations ── */}
      <style jsx global>{`
        @keyframes float-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-up-slow {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -2%); }
          30% { transform: translate(1%, -1%); }
          50% { transform: translate(-1%, 2%); }
          70% { transform: translate(2%, 1%); }
          90% { transform: translate(-2%, 1%); }
        }
        .anim-float { animation: float-up 0.7s ease-out both; }
        .anim-float-1 { animation: float-up 0.7s 0.1s ease-out both; }
        .anim-float-2 { animation: float-up 0.7s 0.2s ease-out both; }
        .anim-float-3 { animation: float-up 0.7s 0.3s ease-out both; }
        .anim-float-4 { animation: float-up 0.7s 0.4s ease-out both; }
        .anim-float-slow { animation: float-up-slow 1s 0.5s ease-out both; }
        .shimmer-text {
          background: linear-gradient(90deg, #fcc824 0%, #fff 40%, #fcc824 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .dark .shimmer-text {
          background: linear-gradient(90deg, #fcc824 0%, #fef3c7 40%, #fcc824 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .grain-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
          animation: grain 8s steps(10) infinite;
        }
        .dark .grain-overlay::before { opacity: 0.04; }
      `}</style>

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#faf8f3]/80 dark:bg-[#0a0f1c]/80 border-b border-gray-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/trial" className="flex items-center gap-2.5 group">
            <MindsetOSLogo size="md" variant="auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register/trial"
              className="group relative px-5 py-2.5 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold text-sm rounded-full transition-all duration-300 shadow-[0_2px_12px_rgba(252,200,36,0.3)] hover:shadow-[0_4px_20px_rgba(252,200,36,0.5)] hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="inline-block w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 grain-overlay">
        {/* Decorative elements */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#fcc824]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-[5%] w-96 h-96 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#fcc824]/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div className="anim-float inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fcc824]/10 dark:bg-[#fcc824]/5 border border-[#fcc824]/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcc824] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcc824]"></span>
              </span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">
                7-day free trial &mdash; no credit card
              </span>
            </div>

            {/* Headline */}
            <h1 className="anim-float-1 text-[2.75rem] sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
              Your AI-powered{' '}
              <br className="hidden sm:block" />
              <span className="shimmer-text">mindset coaching</span>
              <br className="hidden sm:block" />
              platform.
            </h1>

            {/* Subhead */}
            <p className="anim-float-2 text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed mb-10">
              MindsetOS gives entrepreneurs and founders the mental edge they need
              — daily practice, inner-world work, and high-stakes conversation coaching.
              Same frameworks used by top-performing founders. Zero fluff.
            </p>

            {/* CTAs */}
            <div className="anim-float-3 flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/register/trial"
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-[0_4px_24px_rgba(252,200,36,0.3)] hover:shadow-[0_8px_40px_rgba(252,200,36,0.5)] hover:-translate-y-1"
              >
                Start training — it&apos;s free
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500 mt-2 sm:mt-3">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Full access
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-16 sm:py-20 border-y border-gray-200/60 dark:border-white/5 bg-white/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 hover:border-[#fcc824]/40 transition-all duration-500 hover:shadow-[0_8px_30px_-12px_rgba(252,200,36,0.15)]"
              >
                <div className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-1 tabular-nums">
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                  {stat.label}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {stat.sublabel}
                </div>
                {/* Gold corner accent */}
                <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden rounded-tr-2xl">
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[32px] border-t-[#fcc824]/20 border-l-[32px] border-l-transparent transition-all group-hover:border-t-[#fcc824]/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW PIPELINE ── */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Section header */}
          <div className="max-w-2xl mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-px bg-[#fcc824]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824]">
                Your Coaching Pipeline
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
              From overwhelm to{' '}
              <span className="text-[#fcc824]">peak performance</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
              14 specialized AI coaches organized into 5 pillars. Each one targets a different
              dimension of the entrepreneurial mindset — so you grow with intention, not guesswork.
            </p>
          </div>

          {/* Pipeline */}
          <div className="space-y-6">
            {WORKFLOW_STAGES.map((stage, stageIdx) => (
              <div key={stageIdx} className="group">
                <div className={`relative rounded-2xl border ${stage.borderColor} bg-gradient-to-r ${stage.color} dark:bg-gradient-to-r overflow-hidden transition-all duration-500 hover:shadow-lg`}>
                  {/* Phase header bar */}
                  <div className="flex items-center gap-4 px-6 py-4 border-b border-inherit/50">
                    <span className={`w-8 h-8 rounded-full ${stage.dotColor} flex items-center justify-center text-xs font-black text-white shadow-md`}>
                      {stage.phaseNum}
                    </span>
                    <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white uppercase">
                      {stage.phase}
                    </h3>
                    <span className="ml-auto text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
                      {stage.agents.length} agent{stage.agents.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Agent cards row */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {stage.agents.map((agent, agentIdx) => (
                      <div
                        key={agentIdx}
                        className="flex items-start gap-3 p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-sm hover:bg-white dark:hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span className="text-2xl flex-shrink-0 mt-0.5">{agent.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                            {agent.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {agent.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connector line between stages */}
                {stageIdx < WORKFLOW_STAGES.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-6 bg-gradient-to-b from-gray-300 dark:from-gray-600 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Post-pipeline CTA */}
          <div className="mt-12 flex justify-center">
            <Link
              href="/register/trial"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-lg transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.1)] hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5 text-[#fcc824]" />
              Unlock all 14 coaches — free for 7 days
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative py-20 sm:py-28 bg-gray-900 dark:bg-[#060a14] text-white overflow-hidden grain-overlay">
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(252,200,36,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(252,200,36,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-px bg-[#fcc824]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824]">
              Three Steps
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-16">
            Sharper thinking{' '}
            <span className="text-[#fcc824]">in one session</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
            {[
              {
                num: '01',
                title: 'Sign up in 30 seconds',
                desc: 'No credit card. No setup wizard. Just your email and you\'re in.',
                icon: Zap,
              },
              {
                num: '02',
                title: 'Train with your coaches',
                desc: 'Daily practice, belief rewiring, and conversation sparring — all guided by AI coaches built for founders.',
                icon: MessageSquare,
              },
              {
                num: '03',
                title: 'Walk away sharper',
                desc: 'Practice routines, inner-world clarity, and conversation confidence — ready for whatever your business throws at you.',
                icon: Target,
              },
            ].map((step, i) => (
              <div
                key={i}
                className={`relative p-8 sm:p-10 ${i < 2 ? 'md:border-r border-b md:border-b-0 border-white/10' : ''}`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-black text-[#fcc824]/20 tabular-nums leading-none">
                    {step.num}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-[#fcc824]" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold mb-3 tracking-tight">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed text-[15px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON / WHY ── */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left: benefits */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-px bg-[#fcc824]" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824]">
                  Why MindsetOS
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-8">
                Built for founders who are{' '}
                <span className="text-[#fcc824]">done winging it</span>
              </h2>

              <div className="space-y-5">
                {[
                  { icon: Target, title: 'Practice', text: 'Daily mindset routines that sharpen focus, build discipline, and keep you performing at your best.' },
                  { icon: TrendingUp, title: 'Inner World', text: 'Rewire limiting beliefs, build emotional intelligence, and develop the confidence to lead.' },
                  { icon: MessageSquare, title: 'Conversations', text: 'AI coaches that prep you for pitches, negotiations, and tough conversations — not just text generators.' },
                  { icon: Users, title: 'Community', text: 'Join entrepreneurs and founders already leveling up with structured mindset coaching.' },
                  { icon: Shield, title: 'Privacy', text: 'Enterprise-grade security. Your reflections, your growth, your control.' },
                ].map((item, i) => (
                  <div key={i} className="group flex items-start gap-4 p-4 -mx-4 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/[0.03] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#fcc824]/20 transition-colors">
                      <item.icon className="w-5 h-5 text-[#fcc824]" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider mb-0.5">{item.title}</div>
                      <div className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: trial card */}
            <div className="lg:sticky lg:top-24">
              <div className="relative rounded-3xl bg-gray-900 dark:bg-white/5 border border-gray-800 dark:border-white/10 p-8 sm:p-10 text-white overflow-hidden">
                {/* Gold glow */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#fcc824]/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fcc824]/10 border border-[#fcc824]/20 text-[#fcc824] text-xs font-bold uppercase tracking-wider mb-6">
                    <Sparkles className="w-3.5 h-3.5" />
                    Free for 7 days
                  </div>

                  <h3 className="text-2xl font-black tracking-tight mb-6">
                    Everything included.<br />
                    <span className="text-gray-400">No strings.</span>
                  </h3>

                  <div className="space-y-3 mb-8">
                    {[
                      '7 days of full, unrestricted access',
                      'All 14 Mindset AI coaches unlocked',
                      'Practice, Inner World & Conversations pillars',
                      'Session history saved',
                      'AI-powered coaching with every coach',
                      'No credit card required to start',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-[#fcc824] flex-shrink-0" />
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/register/trial"
                    className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-extrabold rounded-2xl transition-all duration-300 shadow-[0_4px_24px_rgba(252,200,36,0.3)] hover:shadow-[0_8px_40px_rgba(252,200,36,0.5)] hover:-translate-y-0.5"
                  >
                    Start your free trial
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <p className="text-center text-xs text-gray-500 mt-4">
                    Takes less than 30 seconds to set up
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-24 sm:py-32 bg-[#fcc824] overflow-hidden">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-black mb-6 leading-[1.1]">
            Stop leaving your mindset<br className="hidden sm:block" /> to chance.
          </h2>
          <p className="text-lg sm:text-xl text-black/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            87+ entrepreneurs and founders already use MindsetOS for daily practice,
            inner-world clarity, and high-stakes conversation prep. Your 7-day trial starts now.
          </p>
          <Link
            href="/register/trial"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-black text-white font-extrabold text-lg rounded-2xl transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:-translate-y-1"
          >
            Start your free trial
            <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <p className="text-sm text-black/40 mt-5 font-medium">
            No credit card &middot; Cancel anytime &middot; Full access for 7 days
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 bg-gray-900 dark:bg-[#060a14] text-gray-400">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <MindsetOSLogo size="xs" variant="light" />
              <span className="text-sm">
                MindsetOS &mdash; mindset coaching for entrepreneurs{' '}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <Link href="/agency" className="hover:text-white transition-colors">Coaching Practice</Link>
              <Link href="/join" className="hover:text-white transition-colors">Join</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <a
                href="https://www.linkedin.com/in/gregmindset/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-600">
              &copy; 2026 MindsetOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

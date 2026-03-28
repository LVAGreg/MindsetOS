'use client';

import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Play,
  Star,
  Layers,
  Cpu,
  BarChart3,
} from 'lucide-react';

/* ─── Lazy load Spline (heavy) ─── */
const Spline = lazy(() => import('@splinetool/react-spline'));

/* ─── SPLINE SCENE URL ───
   Replace this with your own Spline scene URL.
   1. Go to https://app.spline.design
   2. Create or open a scene
   3. Click "Export" → "Web Content" → copy the URL

   Some free community scenes to try:
   - Abstract shapes: https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode
   - Gradient ball: https://prod.spline.design/oo6IlSiGTPSfYXnf/scene.splinecode
*/
const SPLINE_SCENE_URL = 'https://prod.spline.design/qYQE2M4dPRPkpEA7/scene.splinecode';
const SPLINE_ROBOT_URL = 'https://prod.spline.design/eMGivaKFmAnLq1NK/scene.splinecode';

/* ─── DATA ─── */

const WORKFLOW_STAGES = [
  {
    phase: 'Foundation', phaseNum: '01', accent: '#f59e0b',
    agents: [
      { name: '5 One Formula', icon: '🎯', desc: 'Your one offer, one audience, one outcome framework' },
      { name: 'The Profile Power-up', icon: '⚡', desc: 'Optimize your professional profile for authority' },
      { name: 'Money Model Mapper', icon: '💰', desc: 'Build your PEOPLE + PROMISE + PRINCIPLES' },
    ],
  },
  {
    phase: 'Offer Design', phaseNum: '02', accent: '#f97316',
    agents: [
      { name: 'The Offer Invitation Architect', icon: '📣', desc: 'Promotional invitations via the 6 Ps framework' },
      { name: 'Presentation Printer', icon: '🎯', desc: 'Pro-level presentations & event content' },
    ],
  },
  {
    phase: 'Promotion', phaseNum: '03', accent: '#eab308',
    agents: [
      { name: 'LI Events Builder Buddy', icon: '📅', desc: 'WHAT-WHAT-HOW event topics' },
      { name: 'Email Promo Engine', icon: '📧', desc: 'High-converting email campaigns' },
      { name: 'Daily Lead Sequence Builder', icon: '📋', desc: 'Systematic daily outreach sequences' },
    ],
  },
  {
    phase: 'Conversion', phaseNum: '04', accent: '#10b981',
    agents: [
      { name: 'Qualification Call Builder', icon: '📞', desc: 'Conversion-ready sales scripts' },
      { name: 'Authority Engine', icon: '👑', desc: 'Position yourself as the go-to expert' },
    ],
  },
  {
    phase: 'Events', phaseNum: '05', accent: '#8b5cf6',
    agents: [
      { name: 'Easy Event Architect', icon: '🏗️', desc: 'Design and plan high-impact events' },
    ],
  },
];

const STATS = [
  { value: '87+', label: 'Active Entrepreneurs' },
  { value: '14', label: 'AI Agents' },
  { value: '30%', label: 'Avg. Conversion' },
  { value: '7', label: 'Days Free' },
];

/* ─── 3D CSS Fallback ─── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary gold orb */}
      <div className="absolute top-[15%] left-[20%] w-[400px] h-[400px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #fcc824 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'orb-float-1 8s ease-in-out infinite',
        }}
      />
      {/* Secondary purple orb */}
      <div className="absolute top-[30%] right-[15%] w-[350px] h-[350px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'orb-float-2 10s ease-in-out infinite',
        }}
      />
      {/* Tertiary teal orb */}
      <div className="absolute bottom-[10%] left-[40%] w-[300px] h-[300px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          filter: 'blur(90px)',
          animation: 'orb-float-3 12s ease-in-out infinite',
        }}
      />
    </div>
  );
}

/* ─── Animated counter ─── */
function AnimatedNumber({ target, suffix = '' }: { target: string; suffix?: string }) {
  const numericPart = parseInt(target.replace(/[^0-9]/g, ''), 10);
  const hasPlus = target.includes('+');
  const hasPercent = target.includes('%');
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 40;
    const increment = numericPart / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericPart) {
        setCount(numericPart);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, numericPart]);

  return (
    <div ref={ref} className="tabular-nums">
      {count}{hasPlus ? '+' : ''}{hasPercent ? '%' : ''}{suffix}
    </div>
  );
}

/* ─── Scroll reveal hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/* ─── SECTION COMPONENTS ─── */

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── MAIN PAGE ─── */

export default function TrialV3Page() {
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [splineError, setSplineError] = useState(false);

  return (
    <div className="min-h-screen bg-[#07080f] text-white overflow-x-hidden">

      {/* ── GLOBAL STYLES ── */}
      <style jsx global>{`
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(0.95); }
          66% { transform: translate(15px, -30px) scale(1.08); }
        }
        @keyframes orb-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -15px) scale(1.04); }
        }
        @keyframes grid-pan {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(252, 200, 36, 0.3), 0 0 60px rgba(252, 200, 36, 0.1); }
          50% { text-shadow: 0 0 30px rgba(252, 200, 36, 0.5), 0 0 80px rgba(252, 200, 36, 0.2); }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(252, 200, 36, 0.15); }
          50% { border-color: rgba(252, 200, 36, 0.35); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .anim-hero-1 { animation: fade-in-up 0.8s 0.2s ease-out both; }
        .anim-hero-2 { animation: fade-in-up 0.8s 0.4s ease-out both; }
        .anim-hero-3 { animation: fade-in-up 0.8s 0.6s ease-out both; }
        .anim-hero-4 { animation: fade-in-up 0.8s 0.8s ease-out both; }
        .glow-text { animation: text-glow 3s ease-in-out infinite; }
        .glow-border { animation: border-glow 3s ease-in-out infinite; }
      `}</style>

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#07080f]/70 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/trial-v3" className="flex items-center gap-2.5 group">
            <Image src="/mindset-os-logo.png" alt="MindsetOS" width={30} height={30} className="object-contain" />
            <span className="text-lg font-extrabold tracking-tight">
              Mindset<span className="text-[#fcc824]">OS</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register/trial"
              className="group relative px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 bg-[#fcc824] text-black hover:bg-[#f0be1e] shadow-[0_0_20px_rgba(252,200,36,0.25)] hover:shadow-[0_0_30px_rgba(252,200,36,0.4)]"
            >
              Start Free Trial
              <ArrowRight className="inline-block w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO with SPLINE 3D ── */}
      <section className="relative min-h-[100vh] flex items-center">
        {/* Background layers */}
        <div className="absolute inset-0">
          {/* Animated grid */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(252,200,36,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(252,200,36,0.6) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'grid-pan 20s linear infinite',
          }} />
          {/* Floating orbs fallback */}
          <FloatingOrbs />
        </div>

        {/* Spline 3D Scene — absolute positioned behind content */}
        <div className="absolute inset-0 z-0">
          <Suspense fallback={null}>
            <Spline
              scene={SPLINE_SCENE_URL}
              onLoad={() => setSplineLoaded(true)}
              onError={() => setSplineError(true)}
              style={{
                width: '100%',
                height: '100%',
                opacity: splineLoaded ? 0.85 : 0,
                transition: 'opacity 1.5s ease-in',
              }}
            />
          </Suspense>
        </div>

        {/* Gradient overlay — lighter on right so Spline shows through */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080f]/90 via-[#07080f]/50 to-transparent z-[1]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07080f] to-transparent z-[1]" />

        {/* Hero content — two column: text left, robot right */}
        <div className="relative z-[2] max-w-7xl mx-auto px-5 sm:px-8 pt-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: text content */}
            <div>
              {/* Eyebrow */}
              <div className="anim-hero-1 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] glow-border mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcc824] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcc824]"></span>
                </span>
                <span className="text-sm font-semibold text-gray-300 tracking-wide">
                  7-day free trial &mdash; no credit card required
                </span>
              </div>

              {/* Headline */}
              <h1 className="anim-hero-2 text-[2.75rem] sm:text-6xl lg:text-[5.25rem] font-black leading-[1.02] tracking-tight mb-7">
                Stop reacting.{' '}
                <br className="hidden sm:block" />
                <span className="text-[#fcc824] glow-text">Start designing.</span>
              </h1>

              {/* Subhead */}
              <p className="anim-hero-3 text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed mb-10">
                14 AI agents that build your offer, write your promotions, craft your sales scripts,
                and convert leads — all inside one system. Same frameworks used by 87+ entrepreneurs
                scaling to $30k-$100k/month.
              </p>

              {/* CTA row */}
              <div className="anim-hero-4 flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/register/trial"
                  className="group relative inline-flex items-center gap-2.5 px-8 py-4 bg-[#fcc824] text-black font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.25)] hover:shadow-[0_0_50px_rgba(252,200,36,0.4)] hover:-translate-y-1"
                >
                  Start building — free
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>

                <div className="flex items-center gap-5 text-sm text-gray-500 sm:mt-3.5">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400/70" />
                    Full access
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400/70" />
                    Cancel anytime
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Robot 3D Spline scene */}
            <div className="hidden lg:block relative h-[550px] anim-hero-3">
              {/* Glow behind robot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#fcc824]/[0.08] rounded-full blur-[100px] pointer-events-none" />
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-2 border-[#fcc824]/20 border-t-[#fcc824] animate-spin" />
                </div>
              }>
                <Spline
                  scene={SPLINE_ROBOT_URL}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="relative py-6 border-y border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/[0.06]">
            {STATS.map((stat, i) => (
              <div key={i} className="md:px-8 first:md:pl-0 last:md:pr-0 text-center md:text-left">
                <div className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                  <AnimatedNumber target={stat.value} />
                </div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.15em] mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENT PIPELINE (Vertical timeline style) ── */}
      <section className="relative py-24 sm:py-32">
        {/* Subtle radial background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#fcc824]/[0.03] blur-[200px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                <Layers className="w-3.5 h-3.5" />
                5-Phase Pipeline
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-5">
                From blank page to{' '}
                <span className="text-[#fcc824]">paying clients</span>
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                14 specialized agents organized into 5 workflow stages. Each handles a different
                piece of building your mindset coaching business.
              </p>
            </div>
          </RevealSection>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#fcc824]/30 via-[#fcc824]/10 to-transparent hidden md:block" />

            <div className="space-y-8">
              {WORKFLOW_STAGES.map((stage, stageIdx) => (
                <RevealSection key={stageIdx} delay={stageIdx * 100}>
                  <div className="relative md:pl-20">
                    {/* Timeline dot */}
                    <div className="hidden md:flex absolute left-0 top-8 w-12 sm:w-16 h-12 sm:h-16 items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white border border-white/10"
                        style={{ backgroundColor: `${stage.accent}20`, borderColor: `${stage.accent}30` }}
                      >
                        {stage.phaseNum}
                      </div>
                    </div>

                    {/* Card */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden hover:border-white/[0.12] transition-all duration-500 hover:bg-white/[0.04]">
                      {/* Header */}
                      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/[0.04]">
                        <div
                          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                          style={{ backgroundColor: `${stage.accent}20` }}
                        >
                          {stage.phaseNum}
                        </div>
                        <div>
                          <h3 className="text-lg font-extrabold tracking-tight uppercase" style={{ color: stage.accent }}>
                            {stage.phase}
                          </h3>
                        </div>
                        <span className="ml-auto text-xs font-semibold text-gray-600 tabular-nums">
                          {stage.agents.length} agent{stage.agents.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Agents grid */}
                      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stage.agents.map((agent, agentIdx) => (
                          <div
                            key={agentIdx}
                            className="group flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-0.5"
                          >
                            <span className="text-2xl flex-shrink-0 mt-0.5">{agent.icon}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white leading-snug">{agent.name}</div>
                              <div className="text-xs text-gray-500 mt-1 leading-relaxed">{agent.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>

          {/* Post-pipeline CTA */}
          <RevealSection delay={200}>
            <div className="mt-16 flex justify-center">
              <Link
                href="/register/trial"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white font-bold text-lg transition-all duration-300 hover:bg-white/[0.1] hover:border-[#fcc824]/30 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(252,200,36,0.1)]"
              >
                <Sparkles className="w-5 h-5 text-[#fcc824]" />
                Unlock all 14 agents — free for 7 days
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── HOW IT WORKS (3-col with glass cards) ── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/[0.04] blur-[200px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                <Zap className="w-3.5 h-3.5" />
                Three Steps
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                Zero to framework{' '}
                <span className="text-[#fcc824]">in one session</span>
              </h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Sign up in 30 seconds',
                desc: 'No credit card. No setup wizard. Just your email and you\'re in.',
                icon: Zap,
              },
              {
                num: '02',
                title: 'Chat with your agents',
                desc: 'Money Model Mapper builds your offer foundation. Other agents handle promotions, scripts, content.',
                icon: MessageSquare,
              },
              {
                num: '03',
                title: 'Walk away with a system',
                desc: 'PEOPLE + PROMISE + PRINCIPLES framework, sales scripts, promo campaigns — all ready to deploy.',
                icon: Target,
              },
            ].map((step, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 sm:p-10 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
                  {/* Step number watermark */}
                  <div className="absolute -top-4 -right-4 text-[120px] font-black leading-none text-white/[0.02] group-hover:text-[#fcc824]/[0.05] transition-colors duration-500 select-none pointer-events-none">
                    {step.num}
                  </div>

                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center mb-6 group-hover:bg-[#fcc824]/15 transition-colors">
                      <step.icon className="w-6 h-6 text-[#fcc824]" />
                    </div>
                    <h3 className="text-xl font-extrabold mb-3 tracking-tight">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed text-[15px]">{step.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY MINDSET OS (Asymmetric layout) ── */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            {/* Left: benefits (3 cols) */}
            <div className="lg:col-span-3">
              <RevealSection>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                  <Star className="w-3.5 h-3.5" />
                  Why MindsetOS
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-12">
                  Built for entrepreneurs who are{' '}
                  <span className="text-[#fcc824]">done guessing</span>
                </h2>
              </RevealSection>

              <div className="space-y-4">
                {[
                  { icon: Target, title: 'Clarity', text: 'Know exactly who you help, what you promise, and how to articulate it.' },
                  { icon: TrendingUp, title: 'Velocity', text: 'Build offers that sell — based on frameworks proven across 87+ entrepreneurs.' },
                  { icon: MessageSquare, title: 'AI Guidance', text: 'Agents that walk you through each step. Not just text generators.' },
                  { icon: Users, title: 'Community', text: 'Join entrepreneurs already scaling with systematic, repeatable processes.' },
                  { icon: Shield, title: 'Privacy', text: 'Enterprise-grade security. Your data, your business, your control.' },
                ].map((item, i) => (
                  <RevealSection key={i} delay={i * 80}>
                    <div className="group flex items-start gap-4 p-5 rounded-xl border border-transparent hover:border-white/[0.06] hover:bg-white/[0.02] transition-all duration-300">
                      <div className="w-11 h-11 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#fcc824]/15 transition-colors">
                        <item.icon className="w-5 h-5 text-[#fcc824]" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-white uppercase tracking-wider mb-1">{item.title}</div>
                        <div className="text-[15px] text-gray-400 leading-relaxed">{item.text}</div>
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>

            {/* Right: trial card (2 cols) */}
            <div className="lg:col-span-2 lg:sticky lg:top-24">
              <RevealSection delay={200}>
                <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 sm:p-10 overflow-hidden">
                  {/* Glow effect */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#fcc824]/10 rounded-full blur-[80px] pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />

                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fcc824]/10 border border-[#fcc824]/20 text-[#fcc824] text-xs font-bold uppercase tracking-wider mb-6">
                      <Sparkles className="w-3.5 h-3.5" />
                      Free 7-day trial
                    </div>

                    <h3 className="text-2xl font-black tracking-tight mb-2">
                      Everything included.
                    </h3>
                    <p className="text-gray-500 mb-8">No credit card. No strings.</p>

                    <div className="space-y-3 mb-8">
                      {[
                        '7 days of full, unrestricted access',
                        'All 14 MindsetOS AI agents unlocked',
                        'Complete offer-to-client pipeline',
                        'Conversation history saved',
                        'AI-powered sessions with every agent',
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
                      className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-extrabold rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.2)] hover:shadow-[0_0_50px_rgba(252,200,36,0.35)] hover:-translate-y-0.5"
                    >
                      Start your free trial
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </Link>

                    <p className="text-center text-xs text-gray-600 mt-4">
                      Takes less than 30 seconds to set up
                    </p>
                  </div>
                </div>
              </RevealSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-28 sm:py-36 overflow-hidden">
        {/* Large background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-[#fcc824]/[0.06] blur-[200px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <RevealSection>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
              Stop building your business
              <br className="hidden sm:block" />
              <span className="text-[#fcc824]"> from scratch.</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              87+ entrepreneurs already use MindsetOS to systematically build offers, run promotions,
              and convert clients. Your 7-day trial starts now.
            </p>
            <Link
              href="/register/trial"
              className="group inline-flex items-center gap-3 px-10 py-5 bg-[#fcc824] text-black font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-[0_0_40px_rgba(252,200,36,0.25)] hover:shadow-[0_0_60px_rgba(252,200,36,0.4)] hover:-translate-y-1"
            >
              Start your free trial
              <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <p className="text-sm text-gray-600 mt-6 font-medium">
              No credit card &middot; Cancel anytime &middot; Full access for 7 days
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-white/[0.04] bg-[#050610]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/mindset-os-logo.png" alt="MindsetOS" width={24} height={24} className="object-contain" />
              <span className="text-sm text-gray-500">
                MindsetOS &mdash; powered by{' '}
                <a
                  href="https://mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fcc824] hover:underline"
                >
                  MindsetOS
                </a>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
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

          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
            <p className="text-xs text-gray-700">
              &copy; 2026 MindsetOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

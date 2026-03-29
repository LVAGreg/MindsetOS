'use client';

import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Users,
  TrendingUp,
  MessageSquare,
  Shield,
  Target,
  Sparkles,
  ArrowUpRight,
  Star,
  Layers,
} from 'lucide-react';

/* ─── Lazy load Spline ─── */
const Spline = lazy(() => import('@splinetool/react-spline'));

const SPLINE_ROBOT_URL = 'https://prod.spline.design/eMGivaKFmAnLq1NK/scene.splinecode';

/* ─── DATA ─── */

const WORKFLOW_STAGES = [
  {
    phase: 'Awareness', phaseNum: '01', accent: '#f59e0b',
    agents: [
      { name: 'Mindset Score Agent', icon: '📊', desc: '5-question assessment with personalized pillar scores' },
      { name: 'Inner World Mapper', icon: '🗺️', desc: 'Map your beliefs, stories, and self-talk patterns' },
      { name: 'Story Excavator', icon: '🔍', desc: 'Uncover the 5-7 core narratives running your life' },
    ],
  },
  {
    phase: 'Interruption', phaseNum: '02', accent: '#f97316',
    agents: [
      { name: 'Reset Guide', icon: '🔄', desc: '48-hour weekend challenge with 6 transformative exercises' },
      { name: 'Decision Framework Agent', icon: '🎯', desc: 'The DESIGN process for decisions under pressure' },
    ],
  },
  {
    phase: 'Architecture', phaseNum: '03', accent: '#eab308',
    agents: [
      { name: 'Practice Builder', icon: '🧘', desc: 'Personalized 5-10 min daily mindset routines' },
      { name: 'Accountability Partner', icon: '🤝', desc: 'Daily check-ins, reflections, and streak tracking' },
      { name: 'Architecture Coach', icon: '🏗️', desc: '90-day cohort companion for deep transformation' },
    ],
  },
  {
    phase: 'Integration', phaseNum: '04', accent: '#10b981',
    agents: [
      { name: 'Conversation Curator', icon: '🎧', desc: 'Podcast episode matching for your growth edge' },
      { name: 'Launch Companion', icon: '🚀', desc: 'Strategic planning and mindset implementation' },
    ],
  },
];

const STATS = [
  { value: '10', label: 'AI Coaches' },
  { value: '3', label: 'Mindset Pillars' },
  { value: '48h', label: 'First Reset' },
  { value: '7', label: 'Days Free' },
];

/* ─── Animated counter ─── */
function AnimatedNumber({ target }: { target: string }) {
  const numericPart = parseInt(target.replace(/[^0-9]/g, ''), 10);
  const hasPlus = target.includes('+');
  const hasPercent = target.includes('%');
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const steps = 40;
    const increment = numericPart / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericPart) { setCount(numericPart); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 1500 / steps);
    return () => clearInterval(timer);
  }, [started, numericPart]);

  return <div ref={ref} className="tabular-nums">{count}{hasPlus ? '+' : ''}{hasPercent ? '%' : ''}</div>;
}

/* ─── Scroll reveal ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: '100px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${className}`}
      style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)', transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ─── IntersectionObserver hook: mount Spline only when near viewport ─── */
function useSplineVisibility(rootMargin = '200px 0px') {
  const ref = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isNearViewport };
}

/* ─── Robot Spline wrapper with mouse-tracking container ─── */
function RobotScene({ className = '' }: { className?: string }) {
  const { ref, isNearViewport } = useSplineVisibility('300px 0px');

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Gold glow behind robot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] lg:w-[350px] lg:h-[350px] bg-[#fcc824]/[0.08] rounded-full blur-[80px] pointer-events-none" />
      {/*
        The Spline canvas handles its own mouse tracking natively.
        By making the container larger than the visible robot area,
        the tracking zone extends further. We use negative margins
        with overflow-visible so the robot renders in its box but
        the canvas captures mouse events in a wider area.
        Bottom inset extended for large viewports (robot legs cutoff fix).
      */}
      <div className="absolute -inset-10 lg:-top-20 lg:-right-20 lg:-bottom-32 lg:-left-32" style={{ overflow: 'visible' }}>
        {isNearViewport ? (
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border-2 border-[#fcc824]/20 border-t-[#fcc824] animate-spin" />
            </div>
          }>
            <Spline
              scene={SPLINE_ROBOT_URL}
              style={{ width: '100%', height: '100%' }}
            />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border-2 border-[#fcc824]/20 border-t-[#fcc824]/40 animate-spin opacity-30" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Mobile Spline background: lazy mounts WebGL only when near viewport ─── */
function MobileSplineBackground({ className = '', opacity = 0.75 }: { className?: string; opacity?: number }) {
  const { ref, isNearViewport } = useSplineVisibility('200px 0px');

  return (
    <div ref={ref} className={`flex items-center justify-center pointer-events-none ${className}`}>
      <div className="w-full h-full pointer-events-none" style={{ opacity }}>
        {isNearViewport ? (
          <Suspense fallback={null}>
            <Spline scene={SPLINE_ROBOT_URL} style={{ width: '100%', height: '100%' }} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   VARIANT B — Robot in hero + reappears in CTA,
   with expanded mouse-tracking zones via
   oversized Spline containers (-inset-20)
   ═══════════════════════════════════════════════ */

export default function TrialV3B() {
  /* splineLoaded removed — abstract BG replaced with CSS gradients */

  return (
    <div className="min-h-screen bg-[#07080f] text-white overflow-x-hidden">

      <style jsx global>{`
        @keyframes orb-float-1 { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,15px) scale(0.95); } }
        @keyframes orb-float-2 { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-25px,20px) scale(0.95); } 66% { transform: translate(15px,-30px) scale(1.08); } }
        @keyframes grid-pan { 0% { transform: translate(0,0); } 100% { transform: translate(60px,60px); } }
        @keyframes text-glow { 0%, 100% { text-shadow: 0 0 20px rgba(252,200,36,0.3), 0 0 60px rgba(252,200,36,0.1); } 50% { text-shadow: 0 0 30px rgba(252,200,36,0.5), 0 0 80px rgba(252,200,36,0.2); } }
        @keyframes border-glow { 0%, 100% { border-color: rgba(252,200,36,0.15); } 50% { border-color: rgba(252,200,36,0.35); } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
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
          <Link href="/trial-v3b" className="flex items-center gap-2.5 group">
            <MindsetOSLogo size="sm" variant="light" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/register/trial" className="group relative px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 bg-[#fcc824] text-black hover:bg-[#f0be1e] shadow-[0_0_20px_rgba(252,200,36,0.25)] hover:shadow-[0_0_30px_rgba(252,200,36,0.4)]">
              Start Free Trial <ArrowRight className="inline-block w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO — text left, ROBOT right ── */}
      <section className="relative min-h-[100vh] lg:min-h-[105vh] flex items-center overflow-x-clip">
        {/* Background — CSS mesh gradient (no Spline abstract scene) */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(252,200,36,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(252,200,36,0.6) 1px, transparent 1px)',
            backgroundSize: '60px 60px', animation: 'grid-pan 20s linear infinite',
          }} />
          {/* Mesh gradient orbs */}
          <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 65%)', filter: 'blur(100px)', animation: 'orb-float-1 8s ease-in-out infinite' }} />
          <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)', filter: 'blur(120px)', animation: 'orb-float-2 10s ease-in-out infinite' }} />
          <div className="absolute bottom-[15%] left-[40%] w-[350px] h-[350px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 65%)', filter: 'blur(110px)', animation: 'orb-float-1 12s ease-in-out infinite reverse' }} />
          {/* Noise grain overlay */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }} />
        </div>

        {/* Bottom fade to page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07080f] to-transparent z-[1]" />

        {/* Mobile: Robot positioned BEHIND hero text as background element */}
        <MobileSplineBackground className="absolute inset-0 z-[1] lg:hidden" opacity={0.75} />
        {/* Mobile: dark overlay on top of robot for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080f]/10 via-transparent to-[#07080f]/40 z-[1] lg:hidden" />

        <div className="relative z-[2] max-w-7xl mx-auto px-5 sm:px-8 pt-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: text (7 cols) */}
            <div className="lg:col-span-7">
              <div className="anim-hero-1 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] glow-border mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcc824] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcc824]"></span>
                </span>
                <span className="text-sm font-semibold text-gray-300 tracking-wide">7-day free trial &mdash; no credit card required</span>
              </div>

              <h1 className="anim-hero-2 text-[2.75rem] sm:text-6xl lg:text-[5rem] font-black leading-[1.02] tracking-tight mb-7">
                Your AI-powered{' '}<br className="hidden sm:block" />
                <span className="text-[#fcc824] glow-text">mindset coaching engine</span>
              </h1>

              <p className="anim-hero-3 text-lg sm:text-xl text-gray-400 max-w-xl leading-relaxed mb-10">
                10 AI coaches that assess your mindset, build daily practices, map your patterns,
                and architect lasting change — all inside one system.
              </p>

              <div className="anim-hero-4 flex flex-col sm:flex-row items-start gap-4">
                <Link href="/register/trial" className="group relative inline-flex items-center gap-2.5 px-8 py-4 bg-[#fcc824] text-black font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.25)] hover:shadow-[0_0_50px_rgba(252,200,36,0.4)] hover:-translate-y-1">
                  Start building — free <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <div className="flex items-center gap-5 text-sm text-gray-500 sm:mt-3.5">
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400/70" /> Full access</span>
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400/70" /> Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Right: Robot (5 cols) — desktop only in grid */}
            <div className="hidden lg:flex lg:col-span-5 anim-hero-3 justify-center">
              <RobotScene className="h-[600px] w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-6 border-y border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/[0.06]">
            {STATS.map((stat, i) => (
              <div key={i} className="md:px-8 first:md:pl-0 last:md:pr-0 text-center md:text-left">
                <div className="text-3xl sm:text-4xl font-black tracking-tighter text-white"><AnimatedNumber target={stat.value} /></div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.15em] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#fcc824]/[0.03] blur-[200px] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                <Layers className="w-3.5 h-3.5" /> 4-Phase Journey
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-5">From reactive thinking to{' '}<span className="text-[#fcc824]">designed mindset</span></h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">10 specialized AI coaches organized into 4 transformation stages.</p>
            </div>
          </RevealSection>

          <div className="relative">
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#fcc824]/30 via-[#fcc824]/10 to-transparent hidden md:block" />
            <div className="space-y-8">
              {WORKFLOW_STAGES.map((stage, stageIdx) => (
                <RevealSection key={stageIdx} delay={stageIdx * 100}>
                  <div className="relative md:pl-20">
                    <div className="hidden md:flex absolute left-0 top-8 w-12 sm:w-16 h-12 sm:h-16 items-center justify-center">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white border border-white/10"
                        style={{ backgroundColor: `${stage.accent}20`, borderColor: `${stage.accent}30` }}>{stage.phaseNum}</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden hover:border-white/[0.12] transition-all duration-500 hover:bg-white/[0.04]">
                      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/[0.04]">
                        <div className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: `${stage.accent}20` }}>{stage.phaseNum}</div>
                        <h3 className="text-lg font-extrabold tracking-tight uppercase" style={{ color: stage.accent }}>{stage.phase}</h3>
                        <span className="ml-auto text-xs font-semibold text-gray-600 tabular-nums">{stage.agents.length} agent{stage.agents.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stage.agents.map((agent, agentIdx) => (
                          <div key={agentIdx} className="group flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-0.5">
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

          <RevealSection delay={200}>
            <div className="mt-16 flex justify-center">
              <Link href="/register/trial" className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white font-bold text-lg transition-all duration-300 hover:bg-white/[0.1] hover:border-[#fcc824]/30 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(252,200,36,0.1)]">
                <Sparkles className="w-5 h-5 text-[#fcc824]" /> Unlock all 10 coaches — free for 7 days <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/[0.04] blur-[200px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6"><Zap className="w-3.5 h-3.5" /> Three Steps</div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Zero to clarity{' '}<span className="text-[#fcc824]">in one session</span></h2>
            </div>
          </RevealSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Sign up in 30 seconds', desc: 'No credit card. No setup wizard. Just your email and you\'re in.', icon: Zap },
              { num: '02', title: 'Chat with your coaches', desc: 'Mindset Score Agent assesses your baseline. Other coaches build practices, map patterns, and design routines.', icon: MessageSquare },
              { num: '03', title: 'Walk away with a system', desc: 'Your personalized mindset architecture — daily practices, pattern interrupts, and accountability built in.', icon: Target },
            ].map((step, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 sm:p-10 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden">
                  <div className="absolute -top-4 -right-4 text-[120px] font-black leading-none text-white/[0.02] group-hover:text-[#fcc824]/[0.05] transition-colors duration-500 select-none pointer-events-none">{step.num}</div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center mb-6 group-hover:bg-[#fcc824]/15 transition-colors"><step.icon className="w-6 h-6 text-[#fcc824]" /></div>
                    <h3 className="text-xl font-extrabold mb-3 tracking-tight">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed text-[15px]">{step.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY MINDSET OS ── */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-3">
              <RevealSection>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6"><Star className="w-3.5 h-3.5" /> Why MindsetOS</div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-12">Built for mindset coaches who are{' '}<span className="text-[#fcc824]">done guessing</span></h2>
              </RevealSection>
              <div className="space-y-4">
                {[
                  { icon: Target, title: 'Clarity', text: 'Know exactly what patterns drive you, what triggers you, and how to rewire it.' },
                  { icon: TrendingUp, title: 'Momentum', text: 'Build practices that stick — based on frameworks proven across hundreds of entrepreneurs.' },
                  { icon: MessageSquare, title: 'AI Guidance', text: 'Agents that walk you through each step. Not just text generators.' },
                  { icon: Users, title: 'Community', text: 'Join coaches already scaling with systematic, repeatable processes.' },
                  { icon: Shield, title: 'Privacy', text: 'Enterprise-grade security. Your data, your business, your control.' },
                ].map((item, i) => (
                  <RevealSection key={i} delay={i * 80}>
                    <div className="group flex items-start gap-4 p-5 rounded-xl border border-transparent hover:border-white/[0.06] hover:bg-white/[0.02] transition-all duration-300">
                      <div className="w-11 h-11 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#fcc824]/15 transition-colors"><item.icon className="w-5 h-5 text-[#fcc824]" /></div>
                      <div>
                        <div className="text-sm font-extrabold text-white uppercase tracking-wider mb-1">{item.title}</div>
                        <div className="text-[15px] text-gray-400 leading-relaxed">{item.text}</div>
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 lg:sticky lg:top-24">
              <RevealSection delay={200}>
                <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 sm:p-10 overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#fcc824]/10 rounded-full blur-[80px] pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fcc824]/10 border border-[#fcc824]/20 text-[#fcc824] text-xs font-bold uppercase tracking-wider mb-6"><Sparkles className="w-3.5 h-3.5" /> Free 7-day trial</div>
                    <h3 className="text-2xl font-black tracking-tight mb-2">Everything included.</h3>
                    <p className="text-gray-500 mb-8">No credit card. No strings.</p>
                    <div className="space-y-3 mb-8">
                      {['7 days of full, unrestricted access', 'All 10 MindsetOS AI coaches unlocked', 'Complete mindset architecture pipeline', 'Conversation history saved', 'AI-powered sessions with every coach', 'No credit card required to start'].map((item, i) => (
                        <div key={i} className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-[#fcc824] flex-shrink-0" /><span className="text-sm text-gray-300">{item}</span></div>
                      ))}
                    </div>
                    <Link href="/register/trial" className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-extrabold rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.2)] hover:shadow-[0_0_50px_rgba(252,200,36,0.35)] hover:-translate-y-0.5">
                      Start your free trial <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <p className="text-center text-xs text-gray-600 mt-4">Takes less than 30 seconds to set up</p>
                  </div>
                </div>
              </RevealSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA with ROBOT reappearing ── */}
      <section className="relative py-28 sm:py-36 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-[#fcc824]/[0.06] blur-[200px] pointer-events-none" />

        {/* Mobile: Robot behind CTA text */}
        <MobileSplineBackground className="absolute inset-0 lg:hidden" opacity={0.5} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080f]/25 via-[#07080f]/15 to-[#07080f]/40 z-[1] lg:hidden" />

        <div className="relative z-[2] max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Robot reappears — desktop only */}
            <div className="hidden lg:block">
              <RevealSection>
                <RobotScene className="h-[450px] w-full" />
              </RevealSection>
            </div>

            {/* Right: CTA text */}
            <div className="text-center lg:text-left relative z-[2]">
              <RevealSection>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
                  Stop running your mind
                  <span className="text-[#fcc824]"> on autopilot.</span>
                </h2>
                <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed mx-auto lg:mx-0">
                  Entrepreneurs are already using MindsetOS to design how they think, build daily practices,
                  and make better decisions under pressure. Your 7-day trial starts now.
                </p>
                <Link href="/register/trial" className="group inline-flex items-center gap-3 px-10 py-5 bg-[#fcc824] text-black font-extrabold text-lg rounded-2xl transition-all duration-300 shadow-[0_0_40px_rgba(252,200,36,0.25)] hover:shadow-[0_0_60px_rgba(252,200,36,0.4)] hover:-translate-y-1">
                  Start your free trial <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <p className="text-sm text-gray-600 mt-6 font-medium">No credit card &middot; Cancel anytime &middot; Full access for 7 days</p>
              </RevealSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-white/[0.04] bg-[#050610]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <MindsetOSLogo size="xs" variant="light" />
              <span className="text-sm text-gray-500">MindsetOS &mdash; powered by{' '}<a href="https://mindset.show" target="_blank" rel="noopener noreferrer" className="text-[#fcc824] hover:underline">Greg</a></span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
              <Link href="/agency" className="hover:text-white transition-colors">Coaching Practice</Link>
              <Link href="/join" className="hover:text-white transition-colors">Join</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <a href="https://www.linkedin.com/in/gregmindset/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center"><p className="text-xs text-gray-700">&copy; 2026 MindsetOS. All rights reserved.</p></div>
        </div>
      </footer>
    </div>
  );
}

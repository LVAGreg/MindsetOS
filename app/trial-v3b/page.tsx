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
  Quote,
  Brain,
  BarChart3,
  ChevronRight,
  Clock,
  Flame,
} from 'lucide-react';

/* ─── Lazy load Spline ─── */
const Spline = lazy(() => import('@splinetool/react-spline'));

const SPLINE_ROBOT_URL = 'https://prod.spline.design/eMGivaKFmAnLq1NK/scene.splinecode';

/* ─── DATA ─── */

const MINDSET_PILLARS = [
  {
    score: 68,
    label: 'Reactivity',
    color: '#f97316',
    desc: 'How often your lizard brain is running the show',
  },
  {
    score: 82,
    label: 'Decision Quality',
    color: '#fcc824',
    desc: 'How clear-headed you are under real pressure',
  },
  {
    score: 51,
    label: 'Pattern Awareness',
    color: '#7c5bf6',
    desc: 'How well you see the loops you keep running',
  },
];

const PRODUCT_LADDER = [
  {
    tier: 'FREE',
    price: '$0',
    name: 'The Mindset Score',
    desc: '5 questions. 3 pillar scores. A clear picture of exactly where your thinking is costing you.',
    cta: 'Get Your Score',
    href: '/register/trial',
    accent: '#fcc824',
    highlight: true,
    details: ['5-question AI assessment', 'Personalised pillar breakdown', 'Instant coaching recommendations'],
  },
  {
    tier: 'ENTRY',
    price: '$47',
    name: 'The 48-Hour Reset',
    desc: 'A weekend challenge with 6 structured exercises that interrupts reactive patterns and installs new defaults.',
    cta: 'Learn More',
    href: '/checkout',
    accent: '#f97316',
    highlight: false,
    details: ['6 guided mindset exercises', '48-hour structured challenge', 'Pattern interrupt + new practice'],
  },
  {
    tier: 'CORE',
    price: '$997',
    name: '90-Day Architecture',
    desc: 'Group cohort. 8–12 entrepreneurs. Systematic mindset redesign over 90 days with AI coaching between sessions.',
    cta: 'View Cohort',
    href: '/checkout',
    accent: '#10b981',
    highlight: false,
    details: ['Group cohort (8–12 people)', 'AI coaching between sessions', '90-day accountability system'],
  },
  {
    tier: 'PREMIUM',
    price: '$1,997',
    name: 'Architecture Intensive',
    desc: 'Everything in the cohort, plus 1:1 direct access to Greg. For founders who need to move fast and go deep.',
    cta: 'Apply Now',
    href: '/checkout',
    accent: '#7c5bf6',
    highlight: false,
    details: ['Everything in 90-Day cohort', '1:1 sessions with Greg', 'Private Slack access'],
  },
];

const WORKFLOW_STAGES = [
  {
    phase: 'Awareness', phaseNum: '01', accent: '#fcc824',
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
    phase: 'Architecture', phaseNum: '03', accent: '#fcc824',
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

const SOCIAL_PROOF = [
  {
    quote: 'I finally see the patterns that were running my decisions. The Score alone changed what I focused on for the next month.',
    name: 'Sarah K.',
    role: 'Founder, 6-figure coach',
    initial: 'S',
    color: '#fcc824',
  },
  {
    quote: 'The 48-Hour Reset hit me like a freight train. I changed more in one weekend than six months of journaling.',
    name: 'Marcus D.',
    role: 'SaaS operator, $2M ARR',
    initial: 'M',
    color: '#f97316',
  },
  {
    quote: "I've done therapy, journaling, coaching. MindsetOS is the first thing that gave me a system, not just insight.",
    name: 'Priya L.',
    role: 'Entrepreneur & consultant',
    initial: 'P',
    color: '#7c5bf6',
  },
];

/* ─── Animated counter ─── */
function AnimatedNumber({ target }: { target: string }) {
  const numericPart = parseInt(target.replace(/[^0-9]/g, ''), 10);
  const hasPlus = target.includes('+');
  const hasPercent = target.includes('%');
  const suffix = target.replace(/[0-9+%]/g, '');
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

  return <div ref={ref} className="tabular-nums">{count}{suffix}{hasPlus ? '+' : ''}{hasPercent ? '%' : ''}</div>;
}

/* ─── Animated score bar ─── */
function ScoreBar({ score, color, delay = 0 }: { score: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const timer = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(timer);
  }, [started, score, delay]);

  return (
    <div ref={ref} className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
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
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#09090f' }}>

      <style jsx global>{`
        /* ── Ambient motion ── */
        @keyframes orb-float-1 { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,15px) scale(0.95); } }
        @keyframes orb-float-2 { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-25px,20px) scale(0.95); } 66% { transform: translate(15px,-30px) scale(1.08); } }
        @keyframes orb-float-3 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,20px) scale(1.04); } }
        @keyframes grid-pan { 0% { transform: translate(0,0); } 100% { transform: translate(60px,60px); } }

        /* ── Text effects ── */
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(252,200,36,0.3), 0 0 60px rgba(252,200,36,0.1); }
          50% { text-shadow: 0 0 30px rgba(252,200,36,0.5), 0 0 80px rgba(252,200,36,0.2); }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(252,200,36,0.12); box-shadow: 0 0 12px rgba(252,200,36,0.04); }
          50% { border-color: rgba(252,200,36,0.3); box-shadow: 0 0 20px rgba(252,200,36,0.08); }
        }

        /* ── Hero stagger load ── */
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .anim-hero-1 { animation: fade-in-up 0.8s 0.15s ease-out both; }
        .anim-hero-2 { animation: fade-in-up 0.8s 0.35s ease-out both; }
        .anim-hero-3 { animation: fade-in-up 0.8s 0.55s ease-out both; }
        .anim-hero-4 { animation: fade-in-up 0.8s 0.75s ease-out both; }

        /* ── Utility classes ── */
        .glow-text { animation: text-glow 3s ease-in-out infinite; }
        .glow-border { animation: border-glow 3s ease-in-out infinite; }

        /* ── Shimmer for accent text ── */
        @keyframes shimmer-slide {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-gold {
          background: linear-gradient(90deg, #fcc824 0%, #ffe082 40%, #fcc824 60%, #fcc824 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-slide 6s linear infinite;
        }

        /* ── Pulse ring on stat numbers ── */
        @keyframes stat-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(252,200,36,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(252,200,36,0); }
        }

        /* ── Dot grid pattern ── */
        .dot-grid {
          background-image: radial-gradient(circle at 1px 1px, rgba(252,200,36,0.15) 1px, transparent 0);
          background-size: 32px 32px;
        }

        /* ── Card shine on hover ── */
        @keyframes card-shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        .hover-shine:hover::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(252,200,36,0.04), transparent);
          animation: card-shine 0.8s ease-out forwards;
          pointer-events: none;
        }

        /* ── Smooth section scroll behavior ── */
        html { scroll-behavior: smooth; }

        /* ── Timeline connector pulse ── */
        @keyframes line-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }

        /* ── Highlighted ladder card ── */
        @keyframes ladder-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(252,200,36,0.2), 0 0 40px rgba(252,200,36,0.08); }
          50% { box-shadow: 0 0 0 1px rgba(252,200,36,0.35), 0 0 60px rgba(252,200,36,0.14); }
        }
        .ladder-highlight { animation: ladder-pulse 3s ease-in-out infinite; }
      `}</style>

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl border-b border-white/[0.06]" style={{ background: 'rgba(9,9,15,0.7)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/trial-v3b" className="flex items-center gap-2.5 group">
            <MindsetOSLogo size="sm" variant="light" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="inline-flex px-4 py-2 text-sm font-medium text-[#9090a8] hover:text-white transition-colors duration-300">Sign in</Link>
            <Link href="/register/trial" className="group relative px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 bg-[#fcc824] text-black hover:bg-[#f0be1e] shadow-[0_0_20px_rgba(252,200,36,0.25)] hover:shadow-[0_0_30px_rgba(252,200,36,0.4)]">
              Get Your Score Free <ArrowRight className="inline-block w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO -- text left, ROBOT right ── */}
      <section className="relative min-h-[100vh] lg:min-h-[105vh] flex items-center overflow-x-clip">
        {/* Background -- CSS mesh gradient */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(252,200,36,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(252,200,36,0.6) 1px, transparent 1px)',
            backgroundSize: '60px 60px', animation: 'grid-pan 20s linear infinite',
          }} />
          {/* Mesh gradient orbs */}
          <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 65%)', filter: 'blur(100px)', animation: 'orb-float-1 8s ease-in-out infinite' }} />
          <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, #7c5bf6 0%, transparent 65%)', filter: 'blur(120px)', animation: 'orb-float-2 10s ease-in-out infinite' }} />
          <div className="absolute bottom-[15%] left-[40%] w-[350px] h-[350px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 65%)', filter: 'blur(110px)', animation: 'orb-float-1 12s ease-in-out infinite reverse' }} />
          {/* Noise grain overlay */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }} />
        </div>

        {/* Bottom fade to page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-40 z-[1]" style={{ background: 'linear-gradient(to top, #09090f, transparent)' }} />

        {/* Mobile: Robot positioned BEHIND hero text as background element */}
        <MobileSplineBackground className="absolute inset-0 z-[1] lg:hidden" opacity={0.75} />
        {/* Mobile: dark overlay on top of robot for text readability */}
        <div className="absolute inset-0 z-[1] lg:hidden" style={{ background: 'linear-gradient(to bottom, rgba(9,9,15,0.1), transparent, rgba(9,9,15,0.4))' }} />

        <div className="relative z-[2] max-w-7xl mx-auto px-5 sm:px-8 pt-28 lg:pt-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: text (7 cols) */}
            <div className="lg:col-span-7">
              <div className="anim-hero-1 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] glow-border mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcc824] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcc824]"></span>
                </span>
                <span className="text-sm font-semibold text-[#9090a8] tracking-wide">Free Mindset Score &mdash; takes 3 minutes</span>
              </div>

              <h1 className="anim-hero-2 text-[2rem] xs:text-[2.75rem] sm:text-6xl lg:text-[5rem] font-black leading-[1.05] tracking-tighter mb-6 sm:mb-7">
                You&apos;ve optimised everything<br className="hidden sm:block" />
                except{' '}
                <span className="shimmer-gold">your mind.</span>
              </h1>

              <p className="anim-hero-3 text-lg sm:text-xl text-[#9090a8] max-w-xl leading-relaxed mb-10">
                Most entrepreneurs have systemised their business and ignored their operating system.
                MindsetOS gives you a score, a plan, and 10 AI coaches to actually fix it.
              </p>

              <div className="anim-hero-4 flex flex-col sm:flex-row items-start gap-4">
                <Link href="/register/trial" className="group relative inline-flex items-center gap-2.5 px-6 sm:px-8 py-4 bg-[#fcc824] text-black font-extrabold text-base sm:text-lg rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.25)] hover:shadow-[0_0_50px_rgba(252,200,36,0.4)] hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center sm:justify-start">
                  Get your Mindset Score &mdash; free <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm text-[#5a5a72] sm:mt-3.5">
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400/70" /> No credit card</span>
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400/70" /> 3 minutes</span>
                </div>
              </div>
            </div>

            {/* Right: Robot (5 cols) -- desktop only in grid */}
            <div className="hidden lg:flex lg:col-span-5 anim-hero-3 justify-center">
              <RobotScene className="h-[600px] w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-10 sm:py-12 border-y border-white/[0.06] bg-gradient-to-r from-white/[0.01] via-white/[0.03] to-white/[0.01] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-white/[0.08]">
            {STATS.map((stat, i) => (
              <div key={i} className="md:px-10 first:md:pl-0 last:md:pr-0 text-center md:text-left group">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white transition-colors duration-300 group-hover:text-[#fcc824]">
                  <AnimatedNumber target={stat.value} />
                </div>
                <div className="text-xs font-bold text-[#5a5a72] uppercase tracking-[0.18em] mt-1.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MINDSET SCORE SECTION ── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#fcc824]/[0.04] blur-[200px] pointer-events-none" />
        <div className="absolute inset-0 dot-grid opacity-[0.02] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                <BarChart3 className="w-3.5 h-3.5" /> Your Free Starting Point
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter mb-6">
                Know your number.<br />
                <span className="text-[#fcc824]">Fix the right thing.</span>
              </h2>
              <p className="text-lg text-[#5a5a72] max-w-2xl mx-auto leading-relaxed">
                Most entrepreneurs work harder. MindsetOS shows you which pillar is actually holding you back &mdash; then gives you a plan.
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Score mockup */}
            <RevealSection>
              <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-8 sm:p-10 overflow-hidden">
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#fcc824]/10 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[#fcc824]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Your Mindset Score</div>
                    <div className="text-xs text-[#5a5a72]">Example report</div>
                  </div>
                </div>
                <div className="space-y-6">
                  {MINDSET_PILLARS.map((pillar, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#9090a8]">{pillar.label}</span>
                        <span className="text-sm font-black tabular-nums" style={{ color: pillar.color }}>{pillar.score}/100</span>
                      </div>
                      <ScoreBar score={pillar.score} color={pillar.color} delay={i * 200} />
                      <p className="text-xs text-[#5a5a72] mt-1.5">{pillar.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-4 rounded-xl bg-[#fcc824]/[0.06] border border-[#fcc824]/10">
                  <div className="text-xs font-bold text-[#fcc824] uppercase tracking-wider mb-2">Your personalised insight</div>
                  <p className="text-sm text-[#9090a8] leading-relaxed">
                    Your biggest leverage point right now is <strong className="text-white">Pattern Awareness</strong>. You&apos;re reacting before you even know you&apos;ve been triggered. Start with the Story Excavator.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* What you get */}
            <RevealSection delay={150}>
              <div className="space-y-6">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  5 questions.<br />
                  <span className="text-[#fcc824]">Clarity that takes months to get elsewhere.</span>
                </h3>
                <p className="text-[#9090a8] leading-relaxed">
                  The Mindset Score isn&apos;t a personality quiz. It&apos;s a diagnostic. It measures the three pillars that determine how you perform under real pressure &mdash; and tells you exactly where to start.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Clock, text: 'Takes 3 minutes to complete' },
                    { icon: Target, text: 'Pillar-by-pillar breakdown with scores' },
                    { icon: MessageSquare, text: 'Personalised coaching recommendations' },
                    { icon: Sparkles, text: 'AI coach activation based on your results' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/15 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-[#fcc824]" />
                      </div>
                      <span className="text-[15px] text-[#9090a8] font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register/trial" className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#fcc824] text-black font-extrabold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(252,200,36,0.2)] hover:shadow-[0_0_40px_rgba(252,200,36,0.35)] hover:-translate-y-0.5 text-[15px]">
                  Get your free Mindset Score <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ── Section divider ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#fcc824]/20 to-transparent" />

      {/* ── PRODUCT LADDER ── */}
      <section className="relative py-28 sm:py-36 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[#fcc824]/[0.03] blur-[200px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                <TrendingUp className="w-3.5 h-3.5" /> The Journey
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter mb-6">
                Start free. Go as deep<br />
                <span className="text-[#fcc824]">as you need to.</span>
              </h2>
              <p className="text-lg text-[#5a5a72] max-w-xl mx-auto leading-relaxed">
                Most people start with the free Score and never look back. Some go all the way.
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRODUCT_LADDER.map((tier, i) => (
              <RevealSection key={i} delay={i * 100}>
                <div className={`relative h-full rounded-2xl border overflow-hidden transition-all duration-500 hover:-translate-y-1 flex flex-col ${
                  tier.highlight
                    ? 'ladder-highlight bg-[#fcc824]/[0.06] border-[#fcc824]/25'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                }`}>
                  {tier.highlight && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#fcc824] to-transparent" />
                  )}
                  <div className="p-6 sm:p-7 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: tier.accent }}>{tier.tier}</div>
                        <div className="text-2xl font-black tracking-tight text-white">{tier.price}</div>
                      </div>
                      {tier.highlight && (
                        <div className="px-2.5 py-1 rounded-full bg-[#fcc824]/10 border border-[#fcc824]/20 text-[10px] font-black uppercase tracking-wider text-[#fcc824]">
                          Start Here
                        </div>
                      )}
                    </div>
                    <h3 className="text-[15px] font-extrabold text-white mb-3 leading-snug">{tier.name}</h3>
                    <p className="text-[13px] text-[#5a5a72] leading-relaxed mb-6 flex-1">{tier.desc}</p>
                    <div className="space-y-2 mb-6">
                      {tier.details.map((d, di) => (
                        <div key={di} className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tier.accent }} />
                          <span className="text-[12px] text-[#9090a8]">{d}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={tier.href}
                      className={`group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                        tier.highlight
                          ? 'bg-[#fcc824] text-black hover:bg-[#f0be1e] hover:shadow-[0_0_20px_rgba(252,200,36,0.3)]'
                          : 'bg-white/[0.05] border border-white/[0.08] text-[#9090a8] hover:bg-white/[0.1] hover:text-white'
                      }`}>
                      {tier.cta} <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={400}>
            <div className="hidden lg:flex items-center justify-center gap-0 mt-6 text-xs text-[#5a5a72] font-semibold uppercase tracking-wider">
              <span>Free</span>
              <ArrowRight className="w-4 h-4 mx-3 text-[#5a5a72]/50" />
              <span>$47</span>
              <ArrowRight className="w-4 h-4 mx-3 text-[#5a5a72]/50" />
              <span>$997</span>
              <ArrowRight className="w-4 h-4 mx-3 text-[#5a5a72]/50" />
              <span>$1,997</span>
              <span className="ml-4 text-[#5a5a72]">&mdash; your pace, your call.</span>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Section divider ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#fcc824]/15 to-transparent" />

      {/* ── PIPELINE ── */}
      <section className="relative py-16 sm:py-28 lg:py-36">
        {/* Section ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#fcc824]/[0.03] blur-[200px] pointer-events-none" />
        {/* Dot grid texture */}
        <div className="absolute inset-0 dot-grid opacity-[0.03] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                <Layers className="w-3.5 h-3.5" /> 4-Phase System
              </div>
              <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black tracking-tighter mb-6">
                From reactive thinking to{' '}<span className="text-[#fcc824]">designed operating system</span>
              </h2>
              <p className="text-base sm:text-lg text-[#5a5a72] max-w-2xl mx-auto leading-relaxed">10 AI coaches. One through-line. Built to move you from chaos to clarity to compounding.</p>
            </div>
          </RevealSection>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px hidden md:block overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-[#fcc824]/40 via-[#fcc824]/15 to-transparent" style={{ animation: 'line-pulse 4s ease-in-out infinite' }} />
            </div>

            <div className="space-y-6">
              {WORKFLOW_STAGES.map((stage, stageIdx) => (
                <RevealSection key={stageIdx} delay={stageIdx * 120}>
                  <div className="relative md:pl-20">
                    {/* Timeline node */}
                    <div className="hidden md:flex absolute left-0 top-8 w-12 sm:w-16 h-12 sm:h-16 items-center justify-center">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white border transition-all duration-300 hover:scale-110"
                        style={{ backgroundColor: `${stage.accent}18`, borderColor: `${stage.accent}30`, boxShadow: `0 0 20px ${stage.accent}10` }}>
                        {stage.phaseNum}
                      </div>
                    </div>

                    {/* Stage card */}
                    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden hover:border-white/[0.12] transition-all duration-500 hover:bg-white/[0.04] hover-shine hover:shadow-[0_4px_40px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/[0.04]">
                        <div className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: `${stage.accent}20` }}>{stage.phaseNum}</div>
                        <h3 className="text-lg font-extrabold tracking-tight uppercase" style={{ color: stage.accent }}>{stage.phase}</h3>
                        <span className="ml-auto text-xs font-semibold text-[#5a5a72] tabular-nums">{stage.agents.length} agent{stage.agents.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stage.agents.map((agent, agentIdx) => (
                          <div key={agentIdx} className="group/agent relative flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                            <span className="text-2xl flex-shrink-0 mt-0.5 transition-transform duration-300 group-hover/agent:scale-110">{agent.icon}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white leading-snug">{agent.name}</div>
                              <div className="text-xs text-[#5a5a72] mt-1 leading-relaxed">{agent.desc}</div>
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

      {/* ── Section divider gradient ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#fcc824]/20 to-transparent" />

      {/* ── HOW IT WORKS ── */}
      <section className="relative py-16 sm:py-28 lg:py-36 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#7c5bf6]/[0.04] blur-[200px] pointer-events-none" />
        <div className="absolute bottom-0 right-[10%] w-[300px] h-[300px] rounded-full bg-[#fcc824]/[0.03] blur-[150px] pointer-events-none" style={{ animation: 'orb-float-3 10s ease-in-out infinite' }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6"><Zap className="w-3.5 h-3.5" /> Three Steps</div>
              <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black tracking-tighter">Clarity in{' '}<span className="text-[#fcc824]">one session.</span></h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { num: '01', title: 'Take the Mindset Score', desc: '5 questions. 3 pillar scores. You\'ll know exactly what\'s dragging you down and where to start — in under 3 minutes.', icon: BarChart3 },
              { num: '02', title: 'Chat with your coach', desc: 'MindsetOS routes you to the right AI coach based on your score. It knows your context from the first message.', icon: MessageSquare },
              { num: '03', title: 'Walk away with a system', desc: "Not a PDF. Not a framework. An actual operating system — daily practices, pattern interrupts, and accountability built in.", icon: Target },
            ].map((step, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 sm:p-10 hover:border-[#fcc824]/20 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]">
                  {/* Large background number */}
                  <div className="absolute -top-6 -right-4 text-[140px] font-black leading-none text-white/[0.02] group-hover:text-[#fcc824]/[0.06] transition-all duration-700 select-none pointer-events-none">{step.num}</div>
                  {/* Connector line between cards (desktop) */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-5 w-8 lg:w-10 h-px bg-gradient-to-r from-white/10 to-transparent z-10" />
                  )}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center mb-7 group-hover:bg-[#fcc824]/15 group-hover:border-[#fcc824]/30 group-hover:shadow-[0_0_24px_rgba(252,200,36,0.1)] transition-all duration-500">
                      <step.icon className="w-6 h-6 text-[#fcc824]" />
                    </div>
                    <h3 className="text-xl font-extrabold mb-3 tracking-tight">{step.title}</h3>
                    <p className="text-[#9090a8] leading-relaxed text-[15px]">{step.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section divider gradient ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── SOCIAL PROOF ── */}
      <section className="relative py-14 sm:py-24 lg:py-32 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-[20%] left-[5%] w-[400px] h-[400px] rounded-full bg-[#fcc824]/[0.03] blur-[180px] pointer-events-none" style={{ animation: 'orb-float-2 9s ease-in-out infinite' }} />
        <div className="absolute bottom-[10%] right-[15%] w-[300px] h-[300px] rounded-full bg-[#7c5bf6]/[0.03] blur-[150px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6">
                <Users className="w-3.5 h-3.5" /> From the field
              </div>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter">
                What it feels like<br />
                <span className="text-[#fcc824]">when the system works.</span>
              </h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {SOCIAL_PROOF.map((testimonial, i) => (
              <RevealSection key={i} delay={i * 120}>
                <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-500 hover:-translate-y-1">
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-[#fcc824] text-[#fcc824]" />
                    ))}
                  </div>
                  <Quote className="w-7 h-7 text-white/[0.08] mb-4 group-hover:text-[#fcc824]/20 transition-colors duration-500" />
                  <p className="text-[15px] text-[#9090a8] leading-relaxed mb-8 font-medium">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="mt-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center text-sm font-black"
                      style={{ background: `linear-gradient(135deg, ${testimonial.color}20, ${testimonial.color}08)`, color: testimonial.color }}>
                      {testimonial.initial}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{testimonial.name}</div>
                      <div className="text-xs text-[#5a5a72]">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section divider gradient ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#fcc824]/15 to-transparent" />

      {/* ── WHY MINDSET OS ── */}
      <section className="relative py-16 sm:py-28 lg:py-36">
        {/* Background texture */}
        <div className="absolute inset-0 dot-grid opacity-[0.02] pointer-events-none" />
        <div className="absolute top-[30%] right-[5%] w-[400px] h-[400px] rounded-full bg-[#fcc824]/[0.02] blur-[180px] pointer-events-none" style={{ animation: 'orb-float-1 11s ease-in-out infinite' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20 items-start">
            <div className="lg:col-span-3">
              <RevealSection>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-bold uppercase tracking-[0.2em] text-[#fcc824] mb-6"><Star className="w-3.5 h-3.5" /> Why MindsetOS</div>
                <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tighter mb-8 sm:mb-14">Built for entrepreneurs<br /><span className="text-[#fcc824]">who are done running on fumes.</span></h2>
              </RevealSection>
              <div className="space-y-3">
                {[
                  { icon: Flame, title: 'Cuts through burnout', text: "Not another productivity tool. MindsetOS addresses the upstream cause — how you think when pressure hits." },
                  { icon: Target, title: 'Precision, not platitudes', text: "The Score tells you which pillar to fix first. You don't have to guess. You don't have to do everything." },
                  { icon: MessageSquare, title: 'Context-aware coaching', text: 'Every AI coach knows your score, your history, and your patterns. Day one feels like week four.' },
                  { icon: Users, title: 'Community of builders', text: "Join a cohort of entrepreneurs doing the real work — not the performative hustle." },
                  { icon: Shield, title: 'Your data stays yours', text: 'Enterprise-grade encryption. No selling to third parties. Your inner world is private.' },
                ].map((item, i) => (
                  <RevealSection key={i} delay={i * 80}>
                    <div className="group flex items-start gap-4 p-5 rounded-xl border border-transparent hover:border-white/[0.06] hover:bg-white/[0.02] transition-all duration-300">
                      <div className="w-11 h-11 rounded-xl bg-[#fcc824]/10 border border-[#fcc824]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#fcc824]/15 group-hover:border-[#fcc824]/30 group-hover:shadow-[0_0_16px_rgba(252,200,36,0.08)] transition-all duration-500">
                        <item.icon className="w-5 h-5 text-[#fcc824]" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-white uppercase tracking-wider mb-1">{item.title}</div>
                        <div className="text-[15px] text-[#9090a8] leading-relaxed">{item.text}</div>
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>

            {/* Sticky pricing/trial card */}
            <div className="lg:col-span-2 lg:sticky lg:top-24">
              <RevealSection delay={200}>
                <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02] backdrop-blur-xl p-8 sm:p-10 overflow-hidden hover:border-white/[0.12] transition-all duration-500">
                  {/* Card glow accents */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#fcc824]/10 rounded-full blur-[80px] pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#7c5bf6]/10 rounded-full blur-[60px] pointer-events-none" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fcc824]/10 border border-[#fcc824]/20 text-[#fcc824] text-xs font-bold uppercase tracking-wider mb-6"><Sparkles className="w-3.5 h-3.5" /> Free &mdash; no card needed</div>
                    <h3 className="text-2xl font-black tracking-tight mb-2">Get your Mindset Score.</h3>
                    <p className="text-[#5a5a72] mb-8">3 minutes. Real answers. No fluff.</p>
                    <div className="space-y-3.5 mb-8">
                      {['Your 3-pillar score breakdown', 'Personalised coaching path', '10 AI coaches activated', 'Conversation history saved', '7-day full access trial', 'No credit card to start'].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#fcc824]/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-3.5 h-3.5 text-[#fcc824]" />
                          </div>
                          <span className="text-sm text-[#9090a8]">{item}</span>
                        </div>
                      ))}
                    </div>
                    <Link href="/register/trial" className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-extrabold rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.2)] hover:shadow-[0_0_50px_rgba(252,200,36,0.35)] hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]">
                      Get your free Mindset Score <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <p className="text-center text-xs text-[#5a5a72] mt-4">Takes less than 3 minutes</p>
                  </div>
                </div>
              </RevealSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section divider gradient ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── FINAL CTA with ROBOT reappearing ── */}
      <section className="relative py-20 sm:py-32 lg:py-40 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-[#fcc824]/[0.05] blur-[200px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-[#7c5bf6]/[0.03] blur-[150px] pointer-events-none" style={{ animation: 'orb-float-2 12s ease-in-out infinite' }} />

        {/* Mobile: Robot behind CTA text */}
        <MobileSplineBackground className="absolute inset-0 lg:hidden" opacity={0.5} />
        <div className="absolute inset-0 z-[1] lg:hidden" style={{ background: 'linear-gradient(to bottom, rgba(9,9,15,0.25), rgba(9,9,15,0.15), rgba(9,9,15,0.4))' }} />

        <div className="relative z-[2] max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Robot reappears -- desktop only */}
            <div className="hidden lg:block">
              <RevealSection>
                <RobotScene className="h-[450px] w-full" />
              </RevealSection>
            </div>

            {/* Right: CTA text */}
            <div className="text-center lg:text-left relative z-[2]">
              <RevealSection>
                <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black tracking-tighter mb-6 leading-[1.08]">
                  Your mind is the last system
                  <span className="text-[#fcc824]"> you haven&apos;t built.</span>
                </h2>
                <p className="text-base sm:text-lg lg:text-xl text-[#9090a8] mb-8 sm:mb-10 max-w-xl leading-relaxed mx-auto lg:mx-0">
                  Get your Mindset Score in 3 minutes. Understand the patterns running your decisions. Start building a system that runs itself.
                </p>
                <Link href="/register/trial" className="group inline-flex items-center gap-3 px-7 sm:px-10 py-4 sm:py-5 bg-[#fcc824] text-black font-extrabold text-base sm:text-lg rounded-2xl transition-all duration-300 shadow-[0_0_40px_rgba(252,200,36,0.25)] hover:shadow-[0_0_60px_rgba(252,200,36,0.4)] hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center">
                  Get your free Mindset Score <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <p className="text-sm text-[#5a5a72] mt-6 font-medium">No credit card &middot; 3 minutes &middot; Full 7-day access</p>
              </RevealSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative py-12 border-t border-white/[0.06]" style={{ background: '#09090f' }}>
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[2px] bg-gradient-to-r from-transparent via-[#fcc824]/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <MindsetOSLogo size="xs" variant="light" />
              <span className="text-sm text-[#5a5a72]">MindsetOS &mdash; powered by{' '}<a href="https://mindset.show" target="_blank" rel="noopener noreferrer" className="text-[#fcc824] hover:underline transition-colors duration-300">Greg</a></span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#5a5a72]">
              <Link href="/agency" className="hover:text-white transition-colors duration-300">Coaching Practice</Link>
              <Link href="/join" className="hover:text-white transition-colors duration-300">Join</Link>
              <Link href="/terms" className="hover:text-white transition-colors duration-300">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors duration-300">Privacy</Link>
              <a href="https://www.linkedin.com/in/gregmindset/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-300">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
            <p className="text-xs text-[#5a5a72]">&copy; 2026 MindsetOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

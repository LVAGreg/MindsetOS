'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import {
  ArrowRight,
  Check,
  Brain,
  Zap,
  Target,
  Layers,
  Eye,
  Activity,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

/* ── BrainVariantB — SSR-off (Three.js) ──────────────────── */
const BrainVariantB = dynamic(
  () => import('../components/BrainInterface/BrainVariantB'),
  { ssr: false }
);

export default function LandingPage() {
  const router = useRouter();
  const [vis, setVis] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const { user, isAuthenticated } = useAppStore();

  useEffect(() => { setHasHydrated(true); }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    const accessToken = localStorage.getItem('accessToken');
    if (user && isAuthenticated && accessToken) {
      router.push('/dashboard');
    }
    // Unauthenticated visitors see the landing page — no redirect
  }, [hasHydrated, user, isAuthenticated, router]);

  useEffect(() => { setVis(true); }, []);

  /* ── Scroll listener for sticky nav shadow ─────────────── */
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Pillars scroll reveal — IntersectionObserver ────────── */
  const pillarsRef = useRef<HTMLElement>(null);

  /* ── Steps scroll reveal — IntersectionObserver (independent) */
  const stepsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = pillarsRef.current;
    if (!section) return;
    const targets = section.querySelectorAll<HTMLElement>('.reveal-up');
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ── Steps scroll reveal — IntersectionObserver ─────────── */
  useEffect(() => {
    const section = stepsRef.current;
    if (!section) return;
    const targets = section.querySelectorAll<HTMLElement>('.reveal-up');
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ── Data ─────────────────────────────────────────────── */

  const agents = [
    {
      Icon: Brain,
      color: '#4f6ef7',
      name: 'Mindset Score',
      tagline: 'Find Your Weakest Pillar',
      description: 'A precise 5-question diagnostic that pinpoints exactly where your mindset is working against you — in under 3 minutes.',
      outcome: 'Personalized mindset profile',
      time: '3 min',
    },
    {
      Icon: Zap,
      color: '#4f6ef7',
      name: '48-Hour Reset',
      tagline: 'Interrupt the Pattern Now',
      description: 'Six targeted exercises that break your reactive cycle and install a new behavioral baseline. Fastest results in the system.',
      outcome: 'New behavioral baseline',
      time: '48 hrs',
    },
    {
      Icon: Layers,
      color: '#7c5bf6',
      name: 'Architecture Coach',
      tagline: 'Build Your Mental OS',
      description: 'The 90-day cohort that builds all three layers of mindset architecture. Awareness, interruption, and design — working together.',
      outcome: 'Complete mental architecture',
      time: '90 days',
    },
    {
      Icon: Eye,
      color: '#7c5bf6',
      name: 'Inner World Mapper',
      tagline: "Surface What's Running You",
      description: 'Map the beliefs, values, and emotional patterns driving your decisions. Clarity on what to keep, rewire, and release.',
      outcome: 'Personal belief audit',
      time: '20 min',
    },
    {
      Icon: Target,
      color: '#4f6ef7',
      name: 'Decision Framework',
      tagline: 'Cut Through Overthinking',
      description: 'The DESIGN process — Define, Examine, Separate, Identify, Generate, Name — for high-stakes decisions under pressure.',
      outcome: 'Clear decision with conviction',
      time: '10 min',
    },
    {
      Icon: Activity,
      color: '#fcc824',
      name: 'Accountability Partner',
      tagline: 'Daily Check-In That Compounds',
      description: 'A 5-minute daily practice that tracks commitments, celebrates wins, and recalibrates when you drift — every day.',
      outcome: 'Consistent forward momentum',
      time: '5 min / day',
    },
  ];

  const pillars = [
    {
      number: '01',
      subtitle: 'The Audit',
      title: 'Awareness',
      description: 'Surface the beliefs and patterns running your decisions right now. Most entrepreneurs skip this step — and wonder why nothing changes.',
      Icon: Eye,
      color: '#4f6ef7',
    },
    {
      number: '02',
      subtitle: 'The Pattern Break',
      title: 'Interruption',
      description: 'Install the ability to pause between stimulus and response. This gap is where every good decision lives.',
      Icon: Zap,
      color: '#7c5bf6',
    },
    {
      number: '03',
      subtitle: 'The Design',
      title: 'Architecture',
      description: 'Build a mental operating system that produces the results you want — by design, not by default.',
      Icon: Layers,
      color: '#a07ef9',
    },
  ];

  const stats = [
    { value: '10', label: 'AI Coaches', sub: 'Complete system', accentColor: '#4f6ef7' },
    { value: '48hr', label: 'Pattern Break', sub: 'Fastest entry point', accentColor: '#7c5bf6' },
    { value: '3×', label: 'Faster Decisions', sub: 'Measured at 30 days', accentColor: '#4f6ef7' },
    { value: '500+', label: 'Founders', sub: 'And counting', accentColor: '#fcc824' },
  ];

  const steps = [
    {
      n: '1',
      title: 'Take the Mindset Score',
      desc: 'A 5-question diagnostic that pinpoints where your mindset is working against you. Activates the right agents for your patterns.',
      color: '#4f6ef7',
    },
    {
      n: '2',
      title: 'Work with your agents',
      desc: 'Each agent handles a specific layer of your OS — beliefs, decisions, practices, accountability. Start anywhere. The system connects.',
      color: '#7c5bf6',
    },
    {
      n: '3',
      title: 'Build the architecture',
      desc: 'Over 90 days the 3-layer system installs: Awareness → Interruption → Architecture. A mind that works for you, by design.',
      color: '#a07ef9',
    },
  ];

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#09090f' }}>

      {/* ── Fixed ambient atmosphere ──────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.055) 0%, transparent 65%)' }} />
        <div className="absolute top-[35%] -right-32 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,91,246,0.04) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[5%] left-[15%] w-[700px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.03) 0%, transparent 65%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(79,110,247,0.25) 1px, transparent 0)',
            backgroundSize: '32px 32px',
            opacity: 0.025,
          }} />
      </div>

      {/* ── Sticky Nav ────────────────────────────────── */}
      <nav
        className="header-glass w-full px-6 py-5"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: navScrolled ? '0 4px 24px rgba(0,0,0,0.5)' : 'none',
          transition: 'box-shadow 0.2s ease',
          animation: vis ? 'landingFadeUp 0.6s 0s ease-out both' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <MindsetOSLogo size="lg" variant="light" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="hidden sm:inline-flex px-4 py-2 text-sm transition-colors duration-200 rounded-lg hover:bg-white/[0.04]"
              style={{ color: '#9090a8' }}
              aria-label="Sign in to MindsetOS"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/trial-v3b')}
              className="px-5 py-2.5 text-sm font-bold text-black rounded-xl transition-all duration-300 hover:shadow-[0_0_24px_rgba(252,200,36,0.35)] hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
              aria-label="Start free — no credit card required"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-14 pb-24">
        {/* Hero texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            backgroundImage: 'url(/generated/hero-texture.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.08,
          }}
        />

        {/* 2-column asymmetric layout: 60/40 */}
        <div className="relative flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">

          {/* Left — text column (full width mobile, ~60% desktop) */}
          <div className="w-full md:flex-[6] md:max-w-none">

            {/* Badge */}
            <div className={`mb-8 lp-float-1 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{
                  color: '#fcc824',
                  border: '1px solid rgba(252,200,36,0.28)',
                  background: 'rgba(252,200,36,0.07)',
                }}>
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                The Mindset Operating System
              </span>
            </div>

            {/* Headline */}
            <div className={`mb-7 lp-float-2 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
              <h1
                className="font-extrabold leading-none mb-5 heading-tighter"
                style={{
                  fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
                  color: '#ededf5',
                }}
              >
                Stop reacting.<br />
                <span className="gradient-text-brand">Start designing.</span>
              </h1>
              <p className="text-xl md:text-2xl max-w-xl leading-relaxed" style={{ color: '#9090a8' }}>
                10 AI agents built on Greg&rsquo;s proven frameworks.<br />
                Your mindset, rebuilt from the architecture up.
              </p>
            </div>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-16 lp-float-3 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
              <button
                onClick={() => router.push('/trial-v3b')}
                className="group flex items-center gap-2.5 px-8 py-4 font-bold text-black text-lg rounded-xl transition-all duration-300 hover:shadow-[0_0_44px_rgba(252,200,36,0.38)] hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
                aria-label="Start free — no credit card required"
              >
                Start Free — No credit card
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-white/[0.04]"
                style={{
                  color: '#9090a8',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                aria-label="See how MindsetOS works"
              >
                See how it works
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Stats — 2×2 mobile, 4-col desktop */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 lp-float-4 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl text-center"
                  style={{
                    background: 'rgba(18,18,31,0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    borderTop: `2px solid ${s.accentColor}`,
                  }}
                >
                  <div className="text-3xl font-extrabold heading-tighter mb-1 gradient-text-brand">{s.value}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#ededf5' }}>{s.label}</div>
                  <div className="text-xs" style={{ color: '#5a5a72' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — brain column (~40% desktop, hidden mobile) */}
          <div className="hidden md:flex md:flex-[4] items-center justify-center flex-shrink-0">
            <div className="relative flex flex-col items-center">
              {/* Brain container */}
              <div
                className="flex items-center justify-center"
                style={{
                  width: 480,
                  height: 480,
                  background: 'radial-gradient(circle at 50% 50%, rgba(79,110,247,0.12) 0%, transparent 70%)',
                  border: '1px solid rgba(79,110,247,0.15)',
                  borderRadius: 24,
                }}
              >
                <BrainVariantB onAgentSelect={() => {}} />
              </div>

              {/* LIVE SYSTEM badge */}
              <div className="mt-4 flex items-center gap-2">
                <span
                  className="block rounded-full animate-subtle-pulse"
                  style={{
                    width: 8,
                    height: 8,
                    background: '#22c55e',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span className="text-xs" style={{ color: '#9090a8' }}>System Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 Pillars ─────────────────────────────────── */}
      <section
        ref={pillarsRef}
        className="relative z-10 py-28 overflow-hidden"
        style={{ background: 'rgba(13,13,24,0.6)' }}
      >
        {/* Texture overlay — architecture divider */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/generated/architecture-divider.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.06,
            zIndex: 0,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6">

          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a72' }}>The Framework</p>
            <h2 className="text-4xl md:text-5xl font-extrabold heading-tighter mb-4" style={{ color: '#ededf5' }}>
              3 Layers Most Mindset Programs Skip
            </h2>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#9090a8' }}>
              Most mindset work skips to Layer 3.<br />That&rsquo;s why it doesn&rsquo;t stick.
            </p>
          </div>

          {/* Cards wrapper — relative for the desktop connector line */}
          <div className="relative max-w-5xl mx-auto">

            {/* Desktop horizontal connector line */}
            <div
              className="hidden md:block absolute pointer-events-none"
              style={{
                top: 50,
                left: '8%',
                right: '8%',
                height: 1,
                background: 'linear-gradient(90deg, #4f6ef7 0%, #7c5bf6 50%, rgba(124,91,246,0.4) 100%)',
                zIndex: 0,
              }}
            />

            <div className="grid md:grid-cols-3 gap-5 relative z-10">
              {pillars.map((p, i) => {
                const revealClass = i === 0 ? 'reveal-up' : i === 1 ? 'reveal-up delay-150' : 'reveal-up delay-300';
                const isDestination = i === 2;
                const PillarIcon = p.Icon;
                const cardInner = (
                  <div
                    className={`relative p-8 rounded-2xl transition-all duration-300 group hover:translate-y-[-2px]${isDestination ? ' h-full' : ''}`}
                    style={{
                      background: 'rgba(18,18,31,0.8)',
                      border: isDestination ? undefined : '1px solid rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(14px)',
                      borderLeft: '2px solid rgba(79,110,247,0.3)',
                      borderRadius: isDestination ? 15 : undefined,
                    }}
                  >
                    {/* Big ghost number */}
                    <div className="absolute top-6 right-6 text-7xl font-black leading-none pointer-events-none select-none"
                      style={{ color: p.color, opacity: 0.07 }}>
                      {p.number}
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: `${p.color}18`, border: `1px solid ${p.color}2a` }}>
                      <PillarIcon className="w-5 h-5" style={{ color: p.color }} aria-hidden="true" />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: p.color }}>
                      Layer {i + 1} · {p.subtitle}
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#ededf5' }}>{p.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{p.description}</p>
                  </div>
                );

                return isDestination ? (
                  <div key={i} className={`${revealClass} gradient-border-blue`}>
                    {cardInner}
                  </div>
                ) : (
                  <div key={i} className={revealClass}>
                    {cardInner}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Agent Showcase ─────────────────────────────── */}
      <section id="agents" className="relative z-10 py-28" style={{ background: '#09090f' }}>
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a72' }}>The System</p>
            <h2 className="text-4xl md:text-5xl font-extrabold heading-tighter mb-4" style={{ color: '#ededf5' }}>
              10 AI Coaches. One Unified System.
            </h2>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#9090a8' }}>
              Each agent handles a specific layer of your mindset work.<br />Together, they&rsquo;re a complete operating system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((a, i) => (
              <AgentCard key={i} {...a} />
            ))}
          </div>

          <div className="mt-14 text-center">
            <button
              onClick={() => router.push('/trial-v3b')}
              className="group inline-flex items-center gap-3 px-10 py-5 font-bold text-black text-xl rounded-2xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(252,200,36,0.35)] hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
              aria-label="Access all 10 AI agents free — no credit card required"
            >
              Access All 10 Agents Free
              <ArrowRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────── */}
      <section ref={stepsRef} id="how-it-works" className="relative z-10 py-28" style={{ background: 'rgba(13,13,24,0.6)' }}>
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a72' }}>The Journey</p>
            <h2 className="text-4xl md:text-5xl font-extrabold heading-tighter mb-4" style={{ color: '#ededf5' }}>
              From Reactive to Designed
            </h2>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#9090a8' }}>
              Three steps from reactive to designed.
            </p>
          </div>

          {/* Cards row — flex on desktop so SVG arrows can sit between cards */}
          <div className="flex flex-col md:flex-row md:items-stretch gap-6 max-w-5xl mx-auto">

            {/* Step 1 */}
            <div className="reveal-up flex-1 relative p-8 rounded-2xl transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background: 'rgba(18,18,31,0.8)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(14px)',
              }}>
              {/* Badge — circular, step-1 blue gradient */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(79,110,247,0.2) 0%, rgba(79,110,247,0.1) 100%)',
                  border: '1px solid rgba(79,110,247,0.3)',
                  marginBottom: 24,
                  color: '#ededf5',
                  fontWeight: 700,
                  fontSize: 14,
                }}>
                1
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#ededf5' }}>{steps[0].title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{steps[0].desc}</p>
            </div>

            {/* Connector arrow 1→2 (desktop only) */}
            <div className="hidden md:flex items-center flex-shrink-0 self-center" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="#4f6ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Step 2 */}
            <div className="reveal-up delay-150 flex-1 relative p-8 rounded-2xl transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background: 'rgba(18,18,31,0.8)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(14px)',
              }}>
              {/* Badge — circular, step-2 purple gradient */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(124,91,246,0.2) 0%, rgba(124,91,246,0.1) 100%)',
                  border: '1px solid rgba(124,91,246,0.3)',
                  marginBottom: 24,
                  color: '#ededf5',
                  fontWeight: 700,
                  fontSize: 14,
                }}>
                2
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#ededf5' }}>{steps[1].title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{steps[1].desc}</p>
            </div>

            {/* Connector arrow 2→3 (desktop only) */}
            <div className="hidden md:flex items-center flex-shrink-0 self-center" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="#4f6ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Step 3 */}
            <div className="reveal-up delay-300 flex-1 relative p-8 rounded-2xl transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background: 'rgba(18,18,31,0.8)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(14px)',
              }}>
              {/* Badge — circular, step-3 amber gradient */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(252,200,36,0.15) 0%, rgba(252,200,36,0.08) 100%)',
                  border: '1px solid rgba(252,200,36,0.3)',
                  marginBottom: 24,
                  color: '#ededf5',
                  fontWeight: 700,
                  fontSize: 14,
                }}>
                3
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#ededf5' }}>{steps[2].title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{steps[2].desc}</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Proof / Features ───────────────────────────── */}
      <section className="relative z-10 py-28" style={{ background: '#09090f' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-center">

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a72' }}>Why it works</p>
              <h2 className="text-4xl md:text-5xl font-extrabold heading-tighter mb-6" style={{ color: '#ededf5' }}>
                Built on Frameworks.<br />Not AI Guesses.
              </h2>
              <p className="mb-10 leading-relaxed text-lg" style={{ color: '#9090a8' }}>
                MindsetOS is the AI-powered version of the coaching system Greg has used with high-performing entrepreneurs worldwide. Every agent is trained on real methodology — not generic advice.
              </p>
              <div className="space-y-3.5">
                {[
                  '3-Layer Architecture: Awareness → Interruption → Design',
                  'The DESIGN Framework for high-stakes decisions',
                  '48-Hour Reset protocol for pattern interruption',
                  'Daily accountability system that compounds',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(79,110,247,0.18)', border: '1px solid rgba(79,110,247,0.35)' }}>
                      <Check className="w-3 h-3" style={{ color: '#7b92ff' }} aria-hidden="true" />
                    </div>
                    <span className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Ambient glow */}
              <div className="absolute -inset-8 rounded-3xl pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, rgba(79,110,247,0.12) 0%, transparent 70%)' }} />
              <div className="relative p-8 rounded-2xl"
                style={{
                  background: 'rgba(18,18,31,0.9)',
                  border: '1px solid rgba(79,110,247,0.2)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,110,247,0.07) inset',
                }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.25)' }}>
                  <Brain className="w-6 h-6" style={{ color: '#7b92ff' }} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#ededf5' }}>
                  MindsetOS Methodology
                </h3>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: '#9090a8' }}>
                  Created by Greg. Battle-tested with high-performing entrepreneurs. Now available as an AI platform that guides you through each layer, 24/7.
                </p>
                <a href="https://www.mindset.show" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: '#7b92ff' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#a07ef9')}
                  onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#7b92ff')}
                >
                  Learn more about MindsetOS
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────── */}
      <section className="relative z-10 py-32 overflow-hidden">
        {/* Ambient glow behind text */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[900px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(124,91,246,0.07) 0%, transparent 65%)' }} />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#5a5a72' }}>Get started</p>
          <h2 className="font-extrabold heading-tighter mb-6"
            style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', color: '#ededf5', lineHeight: 1.08 }}>
            The Next 90 Days<br />
            <span className="gradient-text-brand">Will Happen Anyway.</span>
          </h2>
          <p className="text-xl mb-12 max-w-xl mx-auto" style={{ color: '#9090a8' }}>
            Every day you spend reacting is a day you&rsquo;re not designing. Start free. No credit card. Results in 48 hours.
          </p>
          <button
            onClick={() => router.push('/trial-v3b')}
            className="group inline-flex items-center gap-3 px-12 py-6 font-bold text-black text-2xl rounded-2xl transition-all duration-300 hover:shadow-[0_0_60px_rgba(252,200,36,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
            aria-label="Start MindsetOS free — no credit card required"
          >
            Start Free
            <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </button>
          <p className="text-xs mt-5" style={{ color: '#5a5a72' }}>
            No credit card required · Get started in 60 seconds
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="relative z-10 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm" style={{ color: '#5a5a72' }}>
            © 2026 MindsetOS — Mindset Operating System
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { label: 'mindset.show', href: 'https://www.mindset.show' },
              { label: 'Connect with Greg', href: 'https://www.linkedin.com/in/gregmindset/' },
              { label: 'Mindset Arena', href: 'https://www.mindset.show/c/mindset-arena' },
              { label: 'Coaching Practice', href: '/agency' },
            ].map((l, i) => (
              <a key={i} href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-sm transition-colors duration-200"
                style={{ color: '#5a5a72' }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#fcc824')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#5a5a72')}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes landingFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-hidden { opacity: 0; transform: translateY(20px); }
        .lp-vis    { transition: opacity 0.7s ease-out, transform 0.7s ease-out; opacity: 1; transform: none; }
        .lp-float-1.lp-vis { transition-delay: 0.05s; }
        .lp-float-2.lp-vis { transition-delay: 0.15s; }
        .lp-float-3.lp-vis { transition-delay: 0.25s; }
        .lp-float-4.lp-vis { transition-delay: 0.38s; }
      `}</style>
    </div>
  );
}

/* ── Agent Card — isolated to avoid inline handler performance issues ── */
function AgentCard({
  Icon, color, name, tagline, description, outcome, time,
}: {
  Icon: React.ElementType; color: string; name: string; tagline: string;
  description: string; outcome: string; time: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative p-7 rounded-2xl transition-all duration-300"
      style={{
        background: 'rgba(18,18,31,0.75)',
        border: `1px solid ${hovered ? color + '38' : 'rgba(255,255,255,0.07)'}`,
        backdropFilter: 'blur(14px)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px ${color}14 inset` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
        <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-bold mb-1" style={{ color: '#ededf5' }}>{name}</h3>
      <p className="text-xs font-semibold mb-3" style={{ color }}>{tagline}</p>
      <p className="text-sm leading-relaxed mb-5" style={{ color: '#9090a8' }}>{description}</p>

      <div className="flex items-center justify-between pt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#5a5a72' }}>Outcome</div>
          <div className="text-xs font-semibold" style={{ color: '#ededf5' }}>{outcome}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#5a5a72' }}>Time</div>
          <div className="text-xs font-semibold" style={{ color }}>{time}</div>
        </div>
      </div>
    </div>
  );
}

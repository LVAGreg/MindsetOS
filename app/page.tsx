'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  MessageSquare,
  BookOpen,
  Compass,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function LandingPage() {
  const router = useRouter();
  const [vis, setVis] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
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
      color: '#0ea5e9',
      name: '48-Hour Reset',
      tagline: 'Interrupt the Pattern Now',
      description: 'Six targeted exercises that break your reactive cycle and install a new behavioral baseline. Fastest results in the system.',
      outcome: 'New behavioral baseline',
      time: '48 hrs',
    },
    {
      Icon: Layers,
      color: '#7c3aed',
      name: 'Architecture Coach',
      tagline: 'Build Your Mental OS',
      description: 'The 90-day cohort that builds all three layers of mindset architecture. Awareness, interruption, and design — working together.',
      outcome: 'Complete mental architecture',
      time: '90 days',
    },
    {
      Icon: Eye,
      color: '#ec4899',
      name: 'Inner World Mapper',
      tagline: "Surface What's Running You",
      description: 'Map the beliefs, values, and emotional patterns driving your decisions. Clarity on what to keep, rewire, and release.',
      outcome: 'Personal belief audit',
      time: '20 min',
    },
    {
      Icon: Target,
      color: '#10b981',
      name: 'Decision Framework',
      tagline: 'Cut Through Overthinking',
      description: 'The DESIGN process — Define, Examine, Separate, Identify, Generate, Name — for high-stakes decisions under pressure.',
      outcome: 'Clear decision with conviction',
      time: '10 min',
    },
    {
      Icon: Activity,
      color: '#f59e0b',
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
    { value: '10', label: 'AI agents', sub: 'Complete system' },
    { value: '3×', label: 'faster decisions', sub: 'Measured at 30 days' },
    { value: '90', label: 'day architecture', sub: 'Group cohort' },
    { value: '48hr', label: 'reset protocol', sub: 'Fastest entry point' },
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

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className="relative z-10 w-full px-6 py-5 max-w-7xl mx-auto flex items-center justify-between"
        style={{ animation: `${vis ? 'landingFadeUp 0.6s 0s ease-out both' : 'none'}` }}>
        <MindsetOSLogo size="lg" variant="light" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 text-sm transition-colors duration-200 rounded-lg hover:bg-white/[0.04]"
            style={{ color: '#9090a8' }}
          >
            Sign in
          </button>
          <button
            onClick={() => router.push('/trial-v3b')}
            className="px-5 py-2.5 text-sm font-bold text-black rounded-xl transition-all duration-300 hover:shadow-[0_0_24px_rgba(252,200,36,0.35)] hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
          >
            Start Free
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-28 text-center">

        {/* Badge */}
        <div className={`mb-8 lp-float-1 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{
              color: '#fcc824',
              border: '1px solid rgba(252,200,36,0.28)',
              background: 'rgba(252,200,36,0.07)',
            }}>
            <Sparkles className="w-3.5 h-3.5" />
            Personal Operating System for Entrepreneurs
          </span>
        </div>

        {/* Headline */}
        <div className={`mb-7 lp-float-2 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
          <h1 className="font-extrabold leading-none mb-5 heading-tighter"
            style={{ fontSize: 'clamp(3rem,8vw,6rem)', color: '#ededf5' }}>
            Stop reacting.<br />
            <span className="gradient-text-brand">Start designing.</span>
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed" style={{ color: '#9090a8' }}>
            10 AI agents built on Greg's proven frameworks.<br />
            Your mindset, rebuilt from the architecture up.
          </p>
        </div>

        {/* CTAs */}
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 lp-float-3 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
          <button
            onClick={() => router.push('/trial-v3b')}
            className="group flex items-center gap-2.5 px-8 py-4 font-bold text-black text-lg rounded-xl transition-all duration-300 hover:shadow-[0_0_44px_rgba(252,200,36,0.38)] hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
          >
            Start Free — No credit card
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-white/[0.04]"
            style={{
              color: '#9090a8',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            See how it works
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto lp-float-4 ${vis ? 'lp-vis' : 'lp-hidden'}`}>
          {stats.map((s, i) => (
            <div key={i} className="p-5 rounded-2xl text-center"
              style={{
                background: 'rgba(18,18,31,0.7)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
              }}>
              <div className="text-3xl font-extrabold heading-tighter mb-1 gradient-text-brand">{s.value}</div>
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#ededf5' }}>{s.label}</div>
              <div className="text-xs" style={{ color: '#5a5a72' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3 Pillars ─────────────────────────────────── */}
      <section className="relative z-10 py-28" style={{ background: 'rgba(13,13,24,0.6)' }}>
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a72' }}>The Framework</p>
            <h2 className="text-4xl md:text-5xl font-extrabold heading-tighter mb-4" style={{ color: '#ededf5' }}>
              3-Layer Architecture
            </h2>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#9090a8' }}>
              Most mindset work skips to Layer 3.<br />That's why it doesn't stick.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {pillars.map((p, i) => (
              <div key={i} className="relative p-8 rounded-2xl transition-all duration-300 group hover:translate-y-[-2px]"
                style={{
                  background: 'rgba(18,18,31,0.8)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(14px)',
                }}>
                {/* Big ghost number */}
                <div className="absolute top-6 right-6 text-7xl font-black leading-none pointer-events-none select-none"
                  style={{ color: p.color, opacity: 0.07 }}>
                  {p.number}
                </div>

                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}2a` }}>
                  <p.Icon className="w-5 h-5" style={{ color: p.color }} />
                </div>

                <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: p.color }}>
                  Layer {i + 1} · {p.subtitle}
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#ededf5' }}>{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agent Showcase ─────────────────────────────── */}
      <section id="agents" className="relative z-10 py-28" style={{ background: '#09090f' }}>
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a72' }}>The System</p>
            <h2 className="text-4xl md:text-5xl font-extrabold heading-tighter mb-4" style={{ color: '#ededf5' }}>
              10 Agents. One Architecture.
            </h2>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#9090a8' }}>
              Each agent handles a specific layer of your mindset work.<br />Together, they're a complete operating system.
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
            >
              Access All 10 Agents Free
              <ArrowRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-28" style={{ background: 'rgba(13,13,24,0.6)' }}>
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a72' }}>The Journey</p>
            <h2 className="text-4xl md:text-5xl font-extrabold heading-tighter mb-4" style={{ color: '#ededf5' }}>
              How It Works
            </h2>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#9090a8' }}>
              Three steps from reactive to designed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="relative p-8 rounded-2xl transition-all duration-300 hover:translate-y-[-2px]"
                style={{
                  background: 'rgba(18,18,31,0.8)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(14px)',
                }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg mb-6"
                  style={{ background: `linear-gradient(135deg,${s.color} 0%,${s.color}cc 100%)` }}>
                  {s.n}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#ededf5' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{s.desc}</p>
              </div>
            ))}
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
                Built on Greg's<br />proven frameworks
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
                      <Check className="w-3 h-3" style={{ color: '#7b92ff' }} />
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
                  <Brain className="w-6 h-6" style={{ color: '#7b92ff' }} />
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
                  onMouseEnter={e => (e.currentTarget.style.color = '#a07ef9')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#7b92ff')}
                >
                  Learn more about MindsetOS
                  <ArrowRight className="w-4 h-4" />
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
          <h2 className="font-extrabold heading-tighter mb-6" style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', color: '#ededf5', lineHeight: 1.08 }}>
            Your mind is running<br />
            <span className="gradient-text-brand">on default settings.</span>
          </h2>
          <p className="text-xl mb-12 max-w-xl mx-auto" style={{ color: '#9090a8' }}>
            Every day you spend reacting is a day you're not designing. Start free. No credit card. Results in 48 hours.
          </p>
          <button
            onClick={() => router.push('/trial-v3b')}
            className="group inline-flex items-center gap-3 px-12 py-6 font-bold text-black text-2xl rounded-2xl transition-all duration-300 hover:shadow-[0_0_60px_rgba(252,200,36,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
          >
            Start Free
            <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
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
          <div className="flex items-center gap-6">
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
                onMouseEnter={e => (e.currentTarget.style.color = '#fcc824')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5a5a72')}
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
        <Icon className="w-5 h-5" style={{ color }} />
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
